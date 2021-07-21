import { assign, createMachine, interpret } from '../src';

describe('Batching of assign and actions', () => {
  it('Should call each assign and action with the same state value', () => {
    const assignEntry = jest.fn();
    const nonAssignEntry = jest.fn();

    const machine = createMachine(
      {
        id: 'machine',
        initial: 'inactive',
        context: {
          count: 0
        },
        states: {
          inactive: {
            on: { TOGGLE: 'active' },
            entry: ['assignEntry', 'nonAssignEntry']
          },
          active: {
            on: { TOGGLE: 'inactive' },
            entry: ['assignEntry', 'nonAssignEntry']
          }
        }
      },
      {
        actions: {
          assignEntry: assign({
            count: (context, _event, { state }) => {
              assignEntry(state?.value);
              return ++context.count;
            }
          }),
          nonAssignEntry: (_context, _event, { state }) => {
            nonAssignEntry(state.value);
          }
        }
      }
    );

    const service = interpret(machine).start();

    expect(nonAssignEntry).toHaveBeenLastCalledWith('inactive');
    expect(assignEntry).toHaveBeenLastCalledWith('inactive');

    service.send('TOGGLE');

    expect(nonAssignEntry).toHaveBeenLastCalledWith('active');
    expect(assignEntry).toHaveBeenLastCalledWith('active');
  });
});
