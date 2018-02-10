/**
 * registry is map for class name to method list.
 * @type Map<string, string[]>
 */
import { Container } from 'inversify';
import { RPCMessage } from './message';

type classType<T> = {new (...args: any[]): T};

export const container = new Container();
const registry = new Map<string, string[]>();
const classRegistry = new Map<string, classType<any>>();
const instanceRegistry = new Map<string, any>();

/**
 * Decorator for exported method which can be called via RPC. any class will be initiated only once.
 * @returns {<T>(target: T, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => TypedPropertyDescriptor<any>}
 * @constructor
 */
export function Export() {
    return function <T>(target: T, propertyKey: string, descriptor: TypedPropertyDescriptor<any>): TypedPropertyDescriptor<any> {
        const targetConstructor = target.constructor as classType<T>;
        let className = targetConstructor.name;
        if (!registry.has(className)) {
            registry.set(className, []);
        }
        (registry.get(className) as string[]).push(propertyKey);
        return descriptor;
    };
}

/**
 * Class Decorator for remote invokable class, @Export() decorator must be used with this decorator.
 * This decorator should also used together with @injectable class decorator and before that decorator.
 * @returns {<T>(target: classType<T>) => classType<T>}
 * @constructor
 */
export function Remote() {
    return function <T>(target: classType<T>): classType<T> {
        const className = target.name;
        container.bind(target).toSelf().inSingletonScope();
        classRegistry.set(className, target);
        return target;
    }
}

/**
 * resolve all registered class bindings. this method should be called in the root of the application and after the children dependency
 * is bound.
 */
export function resolveAllRemote() {
    classRegistry.forEach((clazz, className) => {
        instanceRegistry.set(className, container.get(clazz));
    });
}

export function invokeRPC(message: RPCMessage): Promise<any> {
    if (message && message.className && message.method) {
        if (instanceRegistry.has(message.className) && registry.has(message.className)) {
            if ((registry.get(message.className) as string[]).indexOf(message.method) === -1) {
                return Promise.reject({status: 400, message: 'method not exported'});
            }
            const instance = instanceRegistry.get(message.className);
            return (instance[message.method].apply(instance, message.args) as Promise<any>);
        }
        return Promise.reject({status: 400, message: 'class not registered'});
    }
    return Promise.reject({status: 400, message: 'message format mismatch'});
}