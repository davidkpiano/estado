<p align="center">
  <a href="https://xstate.js.org">
  <br />
  <img src="https://github.com/davidkpiano/xstate/blob/gh-pages/xstate-logo.png" alt="XState" width="100"/>
  <br />
  <sub>JavaScript state machines and statecharts</sub>
  <br />
  <br />
  </a>
</p>

[![Build Status](https://davidkpiano.visualstudio.com/xstate/_apis/build/status/davidkpiano.xstate)](https://davidkpiano.visualstudio.com/xstate/_build/latest?definitionId=1)
[![npm version](https://badge.fury.io/js/xstate.svg)](https://badge.fury.io/js/xstate)
[![Statecharts gitter chat](https://badges.gitter.im/gitterHQ/gitter.png)](https://gitter.im/statecharts/statecharts)
<img src="https://opencollective.com/xstate/tiers/backer/badge.svg?label=sponsors&color=brightgreen" />

Functional, stateless JavaScript [finite state machines](https://en.wikipedia.org/wiki/Finite-state_machine) and [statecharts](http://www.inf.ed.ac.uk/teaching/courses/seoc/2005_2006/resources/statecharts.pdf).

[**Version 3.x to 4 Migration Guide**](./migration.md)

## Super quick start

```bash
npm i xstate -S
```

```js
import { Machine } from 'xstate';
import { interpret } from 'xstate/lib/interpreter'; // or use your own interpreter!

// Stateless machine definition
// machine.transition(...) is a pure function used by the interpreter.
const toggleMachine = Machine({
  initial: 'inactive',
  states: {
    inactive: { on: { TOGGLE: 'active' } },
    active: { on: { TOGGLE: 'inactive' } }
  }
});

// Machine instance with internal state
const toggleService = interpret(toggleMachine)
  .onTransition(state => console.log(state.value))
  .start();
// => 'inactive'

toggleService.send('TOGGLE');
// => 'active'

toggleService.send('TOGGLE');
// => 'inactive'
```

📖 [Read the documentation](https://xstate.js.org/docs)

- [Visualizer](#visualizer)
- [3rd-Party Usage](#3rd-party-usage)
- [Why? (info about statecharts)](#why)
- [Installation](#installation)
- [Finite State Machines](#finite-state-machines)
- [Hierarchical (Nested) State Machines](#hierarchical-nested-state-machines)
- [Parallel State Machines](#parallel-state-machines)
- [History States](#history-states)
- [Interpreters](#interpreters)

## Visualizer

**[:new: Preview and simulate your statecharts in the xstate visualizer (beta)!](https://bit.ly/xstate-viz)**

<a href="https://bit.ly/xstate-viz" title="xstate visualizer"><img src="https://i.imgur.com/fOMJKDZ.png" alt="xstate visualizer" width="300" /></a>

## 3rd-Party Usage

With [sketch.systems](https://sketch.systems), you can now copy-paste your state machine sketches as `xstate`-compatible JSON!
1. Create your sketch (example: https://sketch.systems/anon/sketch/new)
2. Click **Export to clipboard...**
3. Select `XState JSON`

## Why?
Statecharts are a formalism for modeling stateful, reactive systems. This is useful for declaratively describing the _behavior_ of your application, from the individual components to the overall application logic.

Read [📽 the slides](http://slides.com/davidkhourshid/finite-state-machines) ([🎥 video](https://www.youtube.com/watch?v=VU1NKX6Qkxc)) or check out these resources for learning about the importance of finite state machines and statecharts in user interfaces:

- [Statecharts - A Visual Formalism for Complex Systems](http://www.inf.ed.ac.uk/teaching/courses/seoc/2005_2006/resources/statecharts.pdf) by David Harel
- [The World of Statecharts](https://statecharts.github.io/) by Erik Mogensen
- [Pure UI](https://rauchg.com/2015/pure-ui) by Guillermo Rauch
- [Pure UI Control](https://medium.com/@asolove/pure-ui-control-ac8d1be97a8d) by Adam Solove
- [Spectrum - Statecharts Community](https://spectrum.chat/statecharts)

## Installation
1. `npm install xstate --save`
2. `import { Machine } from 'xstate';`

## Finite State Machines

<img src="https://imgur.com/rqqmkJh.png" alt="Light Machine" width="300" />

```js
import { Machine } from 'xstate';

const lightMachine = Machine({
  key: 'light',
  initial: 'green',
  states: {
    green: {
      on: {
        TIMER: 'yellow',
      }
    },
    yellow: {
      on: {
        TIMER: 'red',
      }
    },
    red: {
      on: {
        TIMER: 'green',
      }
    }
  }
});

const currentState = 'green';

const nextState = lightMachine
  .transition(currentState, 'TIMER')
  .value;

// => 'yellow'
```

## Hierarchical (Nested) State Machines

<img src="https://imgur.com/GDZAeB9.png" alt="Hierarchical Light Machine" width="300" />

```js
import { Machine } from 'xstate';

const pedestrianStates = {
  initial: 'walk',
  states: {
    walk: {
      on: {
        PED_TIMER: 'wait'
      }
    },
    wait: {
      on: {
        PED_TIMER: 'stop'
      }
    },
    stop: {}
  }
};

const lightMachine = Machine({
  key: 'light',
  initial: 'green',
  states: {
    green: {
      on: {
        TIMER: 'yellow'
      }
    },
    yellow: {
      on: {
        TIMER: 'red'
      }
    },
    red: {
      on: {
        TIMER: 'green'
      },
      ...pedestrianStates
    }
  }
});

const currentState = 'yellow';

const nextState = lightMachine
  .transition(currentState, 'TIMER')
  .value;
// => {
//   red: 'walk'
// }

lightMachine
  .transition('red.walk', 'PED_TIMER')
  .value;
// => {
//   red: 'wait'
// }
```

**Object notation for hierarchical states:**

```js
// ...
const waitState = lightMachine
  .transition({ red: 'walk' }, 'PED_TIMER')
  .value;

// => { red: 'wait' }

lightMachine
  .transition(waitState, 'PED_TIMER')
  .value;

// => { red: 'stop' }

lightMachine
  .transition({ red: 'stop' }, 'TIMER')
  .value;

// => 'green'
```

## Parallel State Machines

<img src="https://imgur.com/GKd4HwR.png" width="300" alt="Parallel state machine" />

```js
const wordMachine = Machine({
  parallel: true,
  states: {
    bold: {
      initial: 'off',
      states: {
        on: {
          on: { TOGGLE_BOLD: 'off' }
        },
        off: {
          on: { TOGGLE_BOLD: 'on' }
        }
      }
    },
    underline: {
      initial: 'off',
      states: {
        on: {
          on: { TOGGLE_UNDERLINE: 'off' }
        },
        off: {
          on: { TOGGLE_UNDERLINE: 'on' }
        }
      }
    },
    italics: {
      initial: 'off',
      states: {
        on: {
          on: { TOGGLE_ITALICS: 'off' }
        },
        off: {
          on: { TOGGLE_ITALICS: 'on' }
        }
      }
    },
    list: {
      initial: 'none',
      states: {
        none: {
          on: { BULLETS: 'bullets', NUMBERS: 'numbers' }
        },
        bullets: {
          on: { NONE: 'none', NUMBERS: 'numbers' }
        },
        numbers: {
          on: { BULLETS: 'bullets', NONE: 'none' }
        }
      }
    }
  }
});

const boldState = wordMachine
  .transition('bold.off', 'TOGGLE_BOLD')
  .value;

// {
//   bold: 'on',
//   italics: 'off',
//   underline: 'off',
//   list: 'none'
// }

const nextState = wordMachine
  .transition({
    bold: 'off',
    italics: 'off',
    underline: 'on',
    list: 'bullets'
  }, 'TOGGLE_ITALICS')
  .value;

// {
//   bold: 'off',
//   italics: 'on',
//   underline: 'on',
//   list: 'bullets'
// }
```

## History States

<img src="https://imgur.com/I4QsQsz.png" width="300" alt="Machine with history state" />

```js
const paymentMachine = Machine({
  initial: 'method',
  states: {
    method: {
      initial: 'cash',
      states: {
        cash: { on: { SWITCH_CHECK: 'check' } },
        check: { on: { SWITCH_CASH: 'cash' } },
        hist: { history: true }
      },
      on: { NEXT: 'review' }
    },
    review: {
      on: { PREVIOUS: 'method.hist' }
    }
  }
});

const checkState = paymentMachine
  .transition('method.cash', 'SWITCH_CHECK');

// => State {
//   value: { method: 'check' },
//   history: State { ... }
// }

const reviewState = paymentMachine
  .transition(checkState, 'NEXT');

// => State {
//   value: 'review',
//   history: State { ... }
// }

const previousState = paymentMachine
  .transition(reviewState, 'PREVIOUS')
  .value;

// => { method: 'check' }
```

## Sponsors

Huge thanks to the following companies for sponsoring `xstate`. You can sponsor further `xstate` development [on OpenCollective](https://opencollective.com/xstate).

<a href="https://tipe.io" title="Tipe.io"><img src="https://cdn.tipe.io/tipe/tipe-logo.svg?w=240" style="background:#613DEF" /></a>

## Interpreters
- [`xstateful` by @avaragado](https://www.npmjs.com/package/@avaragado/xstateful)
