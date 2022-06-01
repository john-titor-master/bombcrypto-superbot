import { makeException } from "../err";

export class ControlledPromise<T> {
    private finished = false;

    private orig: Promise<T>;

    private resolveFn!: (value: T | PromiseLike<T>) => void;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private rejectFn!: (reason?: any) => void;

    private timeoutId?: NodeJS.Timeout;

    constructor(executor?: () => void, timeout = 0) {
        this.orig = new Promise<T>((resolve, reject) => {
            this.resolveFn = resolve;
            this.rejectFn = reject;
            if (executor) this.init(executor, timeout);
        });
    }

    get promise() {
        return this.orig;
    }

    get settled() {
        return this.finished;
    }

    init(executor: () => void, timeout = 0) {
        try {
            executor();
            if (timeout <= 0) return;
            const message = "Promise timed out";
            const exception = makeException("PromiseTimeout", message);
            this.timeoutId = setTimeout(
                this.rejectFn.bind(this, exception),
                timeout
            );
        } catch (error) {
            this.clearTimeout();
            this.rejectFn(error);
        }
    }

    resolve(value: T | PromiseLike<T>) {
        this.resolveFn(value);
        this.clearTimeout();
        this.finished = true;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reject(reason?: any) {
        this.rejectFn(reason);
        this.clearTimeout();
        this.finished = true;
    }

    public clearTimeout() {
        if (this.timeoutId) clearTimeout(this.timeoutId);
        this.timeoutId = undefined;
    }
}

export type IUniqueRequestController<T> = {
    current?: ControlledPromise<T>;
};

export type ISerializedRequestController<T> = {
    current?: ControlledPromise<T>;

    executors: {
        starter: () => void;
        promise: ControlledPromise<T>;
        timeout: number;
    }[];
};

function iterateSerializedPromise<T>(context: ISerializedRequestController<T>) {
    if (context.current && !context.current.settled) return;

    context.current = undefined;
    const next = context.executors.shift();
    if (!next) return;

    context.current = next.promise;
    next.promise.init(next.starter, next.timeout);
}

export function makeSerializedPromise<T>(
    context: ISerializedRequestController<T>,
    starter: () => void,
    timeout = 0
) {
    const promise = new ControlledPromise<T>();
    context.executors.push({ starter, promise, timeout });
    promise.promise.finally(() => iterateSerializedPromise(context));
    iterateSerializedPromise(context);
    return promise.promise;
}

export function resolveSerializedPromise<T>(
    context: ISerializedRequestController<T>,
    value: T
) {
    context.current?.resolve(value);
}

export function rejectSerializedPromise<T>(
    context: ISerializedRequestController<T>,
    error: unknown
) {
    context.current?.reject(error);
}

export function makeUniquePromise<T>(
    context: IUniqueRequestController<T>,
    starter: () => void,
    timeout = 0
) {
    if (context.current && !context.current.settled)
        return context.current.promise;
    context.current = new ControlledPromise(starter, timeout);
    context.current.promise.finally(() => {
        context.current = undefined;
    });
    return context.current.promise;
}

export function resolveUniquePromise<T>(
    context: IUniqueRequestController<T>,
    value: T
) {
    context.current?.resolve(value);
}

export function rejectUniquePromise<T>(
    context: IUniqueRequestController<T>,
    error: unknown
) {
    context.current?.reject(error);
}
