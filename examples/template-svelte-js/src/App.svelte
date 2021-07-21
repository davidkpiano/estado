<script>
  import { useMachine } from '@xstate/svelte';
  import { toggleMachine } from './toggle.machine.js';

  const { state, send } = useMachine(toggleMachine);
  $: active = $state.matches('active');
  $: ({ count } = $state.context);
</script>

<main>
  <h1>XState Svelte Template</h1>
  <h2>Fork this template!</h2>
  <button on:click={() => send('TOGGLE')}>
    Click me ({active ? '✅' : '❌'})
  </button>
  <code>
    Activated <strong>{count}</strong> times
  </code>
</main>

<style>
  main {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    padding: 3rem 1rem;
    margin: 0 auto;
    color: #2c3e50;
  }

  button {
    margin-right: 0.5em;
  }

  code {
    font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
      monospace;
  }
</style>
