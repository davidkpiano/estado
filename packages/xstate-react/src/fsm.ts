import { useState, useEffect, useMemo } from 'react';
import { StateMachine, EventObject, Typestate, interpret } from '@xstate/fsm';
import { useSubscription, Subscription } from 'use-subscription';
import useConstant from './useConstant';

export function useMachine<TC, TE extends EventObject = EventObject>(
  stateMachine: StateMachine.Machine<TC, TE, any>
): [
  StateMachine.State<TC, TE, any>,
  StateMachine.Service<TC, TE>['send'],
  StateMachine.Service<TC, TE>
] {
  if (process.env.NODE_ENV !== 'production') {
    const [initialMachine] = useState(stateMachine);

    if (stateMachine !== initialMachine) {
      throw new Error(
        'Machine given to `useMachine` has changed between renders. This is not supported and might lead to unexpected results.\n' +
          'Please make sure that you pass the same Machine as argument each time.'
      );
    }
  }

  const service = useConstant(() => interpret(stateMachine).start());
  const [current, setCurrent] = useState(stateMachine.initialState);

  useEffect(() => {
    service.subscribe(setCurrent);
    return () => {
      service.stop();
    };
  }, []);

  return [current, service.send, service];
}

export function useService<
  TContext,
  TEvent extends EventObject = EventObject,
  TState extends Typestate<TContext> = any
>(
  service: StateMachine.Service<TContext, TEvent, TState>
): [
  StateMachine.State<TContext, TEvent, TState>,
  StateMachine.Service<TContext, TEvent, TState>['send'],
  StateMachine.Service<TContext, TEvent, TState>
] {
  const subscription: Subscription<
    StateMachine.State<TContext, TEvent, TState>
  > = useMemo(() => {
    let currentValue: StateMachine.State<TContext, TEvent, TState>;

    service
      .subscribe(state => {
        currentValue = state;
      })
      .unsubscribe();

    return {
      getCurrentValue: () => currentValue,
      subscribe: callback => {
        const { unsubscribe } = service.subscribe(state => {
          if (state.changed !== false) {
            currentValue = state;
            callback();
          }
        });
        return unsubscribe;
      }
    };
  }, [service]);

  const current = useSubscription(subscription);

  return [current, service.send, service];
}
