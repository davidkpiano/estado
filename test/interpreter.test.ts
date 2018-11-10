import { interpret, Interpreter, SimulatedClock } from '../src/interpreter';
import { assert } from 'chai';
import { machine as idMachine } from './fixtures/id';
import { Machine, actions } from '../src';
import { State } from '../src/State';
import { log, assign, actionTypes } from '../src/actions';

const lightMachine = Machine({
  id: 'light',
  initial: 'green',
  states: {
    green: {
      onEntry: [actions.send('TIMER', { delay: 10 })],
      on: {
        TIMER: 'yellow',
        KEEP_GOING: {
          target: 'green',
          actions: [actions.cancel('TIMER')],
          internal: true
        }
      }
    },
    yellow: {
      onEntry: [actions.send('TIMER', { delay: 10 })],
      on: {
        TIMER: 'red'
      }
    },
    red: {
      after: {
        10: 'green'
      }
    }
  }
});

describe('interpreter', () => {
  it('creates an interpreter', () => {
    const service = interpret(idMachine);

    assert.instanceOf(service, Interpreter);
  });

  it('immediately notifies the listener with the initial state and event', done => {
    const service = interpret(idMachine).onTransition((initialState, event) => {
      assert.instanceOf(initialState, State);
      assert.deepEqual(initialState.value, idMachine.initialState.value);
      assert.deepEqual(event.type, actionTypes.init);
      done();
    });

    service.start();
  });

  it('.initialState returns the initial state', () => {
    const service = interpret(idMachine);

    assert.deepEqual(service.initialState, idMachine.initialState);
  });

  describe('.nextState() method', () => {
    it('returns the next state for the given event without changing the interpreter state', () => {
      const service = interpret(lightMachine).start();

      const nextState = service.nextState('TIMER');
      assert.equal(nextState.value, 'yellow');
      assert.equal(service.state.value, 'green');
    });
  });

  describe('send with delay', () => {
    it('can send an event after a delay', () => {
      const currentStates: Array<State<any>> = [];
      const listener = state => {
        currentStates.push(state);

        if (currentStates.length === 4) {
          assert.deepEqual(currentStates.map(s => s.value), [
            'green',
            'yellow',
            'red',
            'green'
          ]);
        }
      };

      const service = interpret(lightMachine, {
        clock: new SimulatedClock()
      }).onTransition(listener);
      const clock = service.clock as SimulatedClock;
      service.start();

      clock.increment(5);
      assert.equal(
        currentStates[0]!.value,
        'green',
        'State should still be green before delayed send'
      );

      clock.increment(5);
      assert.deepEqual(currentStates.map(s => s.value), ['green', 'yellow']);

      clock.increment(5);
      assert.deepEqual(currentStates.map(s => s.value), ['green', 'yellow']);

      clock.increment(5);
      assert.deepEqual(currentStates.map(s => s.value), [
        'green',
        'yellow',
        'red'
      ]);

      clock.increment(5);
      assert.deepEqual(currentStates.map(s => s.value), [
        'green',
        'yellow',
        'red'
      ]);

      clock.increment(5);
      assert.deepEqual(currentStates.map(s => s.value), [
        'green',
        'yellow',
        'red',
        'green'
      ]);
    });
  });

  describe('activities', () => {
    let activityState = 'off';

    const activityMachine = Machine(
      {
        id: 'activity',
        initial: 'on',
        states: {
          on: {
            activities: 'myActivity',
            on: {
              TURN_OFF: 'off'
            }
          },
          off: {}
        }
      },
      {
        activities: {
          myActivity: () => {
            activityState = 'on';
            return () => (activityState = 'off');
          }
        }
      }
    );

    it('should start activities', () => {
      const service = interpret(activityMachine);

      service.start();

      assert.equal(activityState, 'on');
    });

    it('should stop activities', () => {
      const service = interpret(activityMachine);

      service.start();

      assert.equal(activityState, 'on');

      service.send('TURN_OFF');

      assert.equal(activityState, 'off');
    });
  });

  it('can cancel a delayed event', () => {
    let currentState: State<any>;
    const listener = state => (currentState = state);

    const service = interpret(lightMachine, {
      clock: new SimulatedClock()
    }).onTransition(listener);
    const clock = service.clock as SimulatedClock;
    service.start();

    clock.increment(5);
    service.send('KEEP_GOING');

    assert.deepEqual(currentState!.value, 'green');
    clock.increment(10);
    assert.deepEqual(
      currentState!.value,
      'green',
      'should still be green due to canceled event'
    );
  });

  it('should throw an error if an event is sent to an uninitialized interpreter', () => {
    const service = interpret(lightMachine);

    assert.throws(() => service.send('SOME_EVENT'));

    service.start();

    assert.doesNotThrow(() => service.send('SOME_EVENT'));
  });

  it('should not update when stopped', () => {
    let state = lightMachine.initialState;
    const service = interpret(lightMachine).onTransition(s => (state = s));

    service.start();
    service.send('TIMER'); // yellow
    assert.deepEqual(state.value, 'yellow');

    service.stop();
    service.send('TIMER'); // red if interpreter is not stopped
    assert.deepEqual(state.value, 'yellow');
  });

  it('should be able to log (log action)', () => {
    const logs: any[] = [];

    const logMachine = Machine({
      id: 'log',
      initial: 'x',
      context: { count: 0 },
      states: {
        x: {
          on: {
            LOG: {
              actions: [
                assign({ count: ctx => ctx.count + 1 }),
                log(ctx => ctx)
              ]
            }
          }
        }
      }
    });

    const service = interpret(logMachine, {
      logger: msg => logs.push(msg)
    }).start();

    service.send('LOG');
    service.send('LOG');

    assert.lengthOf(logs, 2);
    assert.deepEqual(logs, [{ count: 1 }, { count: 2 }]);
  });
});
