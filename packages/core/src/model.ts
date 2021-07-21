import { ActionObject } from '.';
import { assign } from './actions';
import { createMachine } from './Machine';
import type { EventObject } from './types';
import { mapValues } from './utils';
import {
  Cast,
  UnionFromCreatorsReturnTypes,
  FinalModelCreators,
  Model,
  ModelCreators
} from './model.types';

export function createModel<
  TContext,
  TEvent extends EventObject,
  TAction extends ActionObject<TContext, TEvent> = ActionObject<
    TContext,
    TEvent
  >
>(initialContext: TContext): Model<TContext, TEvent, TAction, void>;
export function createModel<
  TContext,
  TModelCreators extends ModelCreators<TModelCreators>,
  TFinalModelCreators = FinalModelCreators<TModelCreators>,
  TComputedEvent = 'events' extends keyof TFinalModelCreators
    ? UnionFromCreatorsReturnTypes<TFinalModelCreators['events']>
    : never,
  TComputedAction = 'actions' extends keyof TFinalModelCreators
    ? UnionFromCreatorsReturnTypes<TFinalModelCreators['actions']>
    : never
>(
  initialContext: TContext,
  creators: TModelCreators
): Model<
  TContext,
  Cast<TComputedEvent, EventObject>,
  Cast<
    TComputedAction,
    ActionObject<TContext, Cast<TComputedEvent, EventObject>>
  >,
  TFinalModelCreators
>;
export function createModel(
  initialContext: object,
  creators?: ModelCreators<any>
): unknown {
  const eventCreators = creators?.events;
  const actionCreators = creators?.actions;

  const model: Model<any, any, any, any> = {
    initialContext,
    assign,
    events: (eventCreators
      ? mapValues(eventCreators, (fn, eventType) => (...args: any[]) => ({
          ...fn(...args),
          type: eventType
        }))
      : undefined) as any,
    actions: actionCreators
      ? mapValues(actionCreators, (fn, actionType) => (...args: any[]) => ({
          ...fn(...args),
          type: actionType
        }))
      : undefined,
    reset: () => assign(initialContext),
    createMachine: (config, implementations) => {
      return createMachine(
        'context' in config ? config : { ...config, context: initialContext },
        implementations
      );
    }
  };

  return model;
}
