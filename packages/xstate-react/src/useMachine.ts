import { useCallback, useState } from 'react';
import {
  EventObject,
  StateMachine,
  State,
  Interpreter,
  InterpreterOptions,
  MachineOptions,
  StateConfig,
  Typestate,
  ActionFunction
} from 'xstate';
import {
  MaybeLazy,
  ReactActionFunction,
  ReactActionObject,
  ReactEffectType
} from './types';
import { useInterpret } from './useInterpret';

function createReactActionFunction<TContext, TEvent extends EventObject>(
  exec: ActionFunction<TContext, TEvent>,
  tag: ReactEffectType
): ReactActionObject<TContext, TEvent> {
  const effectExec: ReactActionFunction<TContext, TEvent> = (
    ...args: Parameters<typeof exec>
  ) => {
    // don't execute; just return
    return () => {
      return exec(...args);
    };
  };

  return {
    type: `effect:${exec.name}`,
    __effect: tag,
    exec: effectExec
  };
}

export function asEffect<TContext, TEvent extends EventObject>(
  exec: ActionFunction<TContext, TEvent>
): ReactActionObject<TContext, TEvent> {
  return createReactActionFunction(exec, ReactEffectType.Effect);
}

export function asLayoutEffect<TContext, TEvent extends EventObject>(
  exec: ActionFunction<TContext, TEvent>
): ReactActionObject<TContext, TEvent> {
  return createReactActionFunction(exec, ReactEffectType.LayoutEffect);
}

export interface UseMachineOptions<TContext, TEvent extends EventObject> {
  /**
   * If provided, will be merged with machine's `context`.
   */
  context?: Partial<TContext>;
  /**
   * The state to rehydrate the machine to. The machine will
   * start at this state instead of its `initialState`.
   */
  state?: StateConfig<TContext, TEvent>;
}

export function useMachine<
  TContext,
  TEvent extends EventObject,
  TTypestate extends Typestate<TContext> = { value: any; context: TContext }
>(
  getMachine: MaybeLazy<StateMachine<TContext, any, TEvent, TTypestate>>,
  options: Partial<InterpreterOptions> &
    Partial<UseMachineOptions<TContext, TEvent>> &
    Partial<MachineOptions<TContext, TEvent>> = {}
): [
  State<TContext, TEvent, any, TTypestate>,
  Interpreter<TContext, any, TEvent, TTypestate>['send'],
  Interpreter<TContext, any, TEvent, TTypestate>
] {
  const listener = useCallback(
    (nextState: State<TContext, TEvent, any, TTypestate>) => {
      // Only change the current state if:
      // - the incoming state is the "live" initial state (since it might have new actors)
      // - OR the incoming state actually changed.
      //
      // The "live" initial state will have .changed === undefined.
      const initialStateChanged =
        nextState.changed === undefined &&
        Object.keys(nextState.children).length;

      if (nextState.changed || initialStateChanged) {
        setState(nextState);
      }
    },
    []
  );

  const service = useInterpret(getMachine, options, listener);

  const [state, setState] = useState(() => {
    const { initialState } = service.machine;
    return (options.state
      ? State.create(options.state)
      : initialState) as State<TContext, TEvent, any, TTypestate>;
  });

  return [state, service.send, service];
}
