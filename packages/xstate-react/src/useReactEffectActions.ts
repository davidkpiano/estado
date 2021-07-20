import { useEffect, useRef } from 'react';
import useIsomorphicLayoutEffect from 'use-isomorphic-layout-effect';
import { EventObject, State, Interpreter } from 'xstate';
import { ReactActionObject, ReactEffectType, ActionStateTuple } from './types';
import { partition } from './utils';

function executeEffect<TContext, TEvent extends EventObject>(
  action: ReactActionObject<TContext, TEvent>,
  state: State<TContext, TEvent, any, any>
): void {
  const { exec } = action;
  const originalExec = exec!(state.context, state._event.data, {
    action,
    state,
    _event: state._event
  });

  originalExec();
}

export function useReactEffectActions<TContext, TEvent extends EventObject>(
  service: Interpreter<TContext, any, TEvent, any>
) {
  const effectActionsRef = useRef<
    Array<
      [ReactActionObject<TContext, TEvent>, State<TContext, TEvent, any, any>]
    >
  >([]);
  const layoutEffectActionsRef = useRef<
    Array<
      [ReactActionObject<TContext, TEvent>, State<TContext, TEvent, any, any>]
    >
  >([]);

  useIsomorphicLayoutEffect(() => {
    const sub = service.subscribe((currentState) => {
      if (currentState.actions.length) {
        const reactEffectActions = currentState.actions.filter(
          (action): action is ReactActionObject<TContext, TEvent> => {
            return typeof action.exec === 'function' && '__effect' in action;
          }
        );

        const [effectActions, layoutEffectActions] = partition(
          reactEffectActions,
          (action): action is ReactActionObject<TContext, TEvent> => {
            return action.__effect === ReactEffectType.Effect;
          }
        );

        effectActionsRef.current.push(
          ...effectActions.map<ActionStateTuple<TContext, TEvent>>(
            (effectAction) => [effectAction, currentState]
          )
        );

        layoutEffectActionsRef.current.push(
          ...layoutEffectActions.map<ActionStateTuple<TContext, TEvent>>(
            (layoutEffectAction) => [layoutEffectAction, currentState]
          )
        );
      }
    });

    return () => {
      sub.unsubscribe();
    };
  }, []);

  // this is somewhat weird - this should always be flushed within useLayoutEffect
  // but we don't want to receive warnings about useLayoutEffect being used on the server
  // so we have to use `useIsomorphicLayoutEffect` to silence those warnings
  useIsomorphicLayoutEffect(() => {
    while (layoutEffectActionsRef.current.length) {
      const [
        layoutEffectAction,
        effectState
      ] = layoutEffectActionsRef.current.shift()!;

      executeEffect(layoutEffectAction, effectState);
    }
  }); // https://github.com/davidkpiano/xstate/pull/1202#discussion_r429677773

  useEffect(() => {
    while (effectActionsRef.current.length) {
      const [effectAction, effectState] = effectActionsRef.current.shift()!;

      executeEffect(effectAction, effectState);
    }
  });
}
