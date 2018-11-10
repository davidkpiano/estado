import {
  Machine,
  MachineOptions,
  DefaultContext,
  MachineConfig,
  StateSchema,
  EventObject
} from './types';
import { StateNode } from './StateNode';

export function Machine<
  TContext = DefaultContext,
  TStateSchema extends StateSchema = any,
  TEvent extends EventObject = EventObject
>(
  config: MachineConfig<TContext, TStateSchema, TEvent>,
  options?: MachineOptions<TContext, TEvent>,
  initialContext: TContext | undefined = config.context
): Machine<TContext, TStateSchema, TEvent> {
  return new StateNode<TContext, TStateSchema, TEvent>(
    config,
    options,
    initialContext
  ) as Machine<TContext, TStateSchema, TEvent>;
}
