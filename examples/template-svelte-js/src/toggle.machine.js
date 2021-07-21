import { createMachine, assign } from 'xstate';

// Edit your machine(s) here
export const toggleMachine = createMachine({
  id: 'machine',
  initial: 'inactive',
  context: {
    count: 0
  },
  states: {
    inactive: {
      on: { TOGGLE: 'active' }
    },
    active: {
      entry: assign({ count: (context) => context.count + 1 }),
      on: { TOGGLE: 'inactive' }
    }
  }
});
