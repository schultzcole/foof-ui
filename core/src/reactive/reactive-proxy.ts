import ReactiveContext from "./reactive-context.ts"

const REACTIVE_CONTEXT = Symbol("REACTIVE_CONTEXT")

export type Reactiveable = object
export type ReactiveProxy<T> = T & { [REACTIVE_CONTEXT]: ReactiveContext }

const proxyMap = new WeakMap<Reactiveable, ReactiveProxy<Reactiveable>>()

/**
 * Wraps the given state in a reactive proxy.
 * @param input the state to reactiveify
 * @returns the reactive state and a {@link ReactiveContext} that can be used to create an effect react to mutations in the state
 */
export function reactive<T extends Reactiveable>(input: T): { state: ReactiveProxy<T>; ctx: ReactiveContext } {
    if (proxyMap.has(input)) {
        const existingProxy = proxyMap.get(input) as ReactiveProxy<T>
        return { state: existingProxy, ctx: existingProxy[REACTIVE_CONTEXT] }
    }

    const ctx = new ReactiveContext()
    const proxied = reactiveInner(input, ctx, "")
    return { state: proxied, ctx }
}

/** Internal recursive reactive function */
function reactiveInner<T extends Reactiveable>(
    input: T,
    ctx: ReactiveContext,
    path: string,
): ReactiveProxy<T> {
    if (proxyMap.has(input)) return proxyMap.get(input) as ReactiveProxy<T>

    const proxied = new Proxy(input, handlerForContext(ctx, path)) as ReactiveProxy<T>
    proxyMap.set(input, proxied)
    return proxied
}

/** Creates a {@link ProxyHandler} for a reactive proxy */
function handlerForContext<T extends Reactiveable>(
    ctx: ReactiveContext,
    parentPath: string,
): ProxyHandler<T> {
    return {
        get(target: T, prop: keyof T & (string | symbol)) {
            if (prop === REACTIVE_CONTEXT) return ctx

            const thisPath = parentPath + `[${prop.toString()}]`

            ctx._register(thisPath)
            if (ambientEffectContext) {
                if (ambientEffectContext.ctx && ambientEffectContext.ctx !== ctx) throw new Error()
                ambientEffectContext.ctx ??= ctx
                ambientEffectContext.capturedPaths.add(thisPath)
            }
            const value = target[prop]
            if (value instanceof Function) {
                return value
            } else if (value && typeof value === "object") {
                return reactiveInner(value, ctx, thisPath)
            }
            return value
        },
        set<K extends keyof T & (string | symbol)>(target: T, prop: K, value: T[K]) {
            if (prop === REACTIVE_CONTEXT) return false

            const thisPath = parentPath + `[${prop.toString()}]`
            target[prop] = value
            ctx._trigger(thisPath)
            return true
        },
    }
}

let ambientEffectContext: { ctx: ReactiveContext | null; capturedPaths: Set<string> } | null = null

/**
 * Creates an ambient effect: an effect that does not require the reactive context to be explictly provided.
 * While this is incredibly useful, it has limitations, for instance calls to ambientEffect cannot be nested.
 * @internal
 */
export function _ambientEffect(func: () => void): void {
    if (ambientEffectContext) throw new NestedAmbientCaptureError()

    const captureContext: { ctx: ReactiveContext | null; capturedPaths: Set<string> } = {
        ctx: null,
        capturedPaths: new Set<string>(),
    }
    try {
        ambientEffectContext = captureContext
        func()
    } finally {
        ambientEffectContext = null
    }

    captureContext.ctx?._addAmbientCapture(func, captureContext.capturedPaths)
}

/**
 * An error that gets thrown if ambientCapture is called within another ambientCapture
 */
export class NestedAmbientCaptureError extends Error {
    constructor() {
        super("Nested calls to ambientEffect are not allowed")
        this.name = "NestedAmbientCaptureError"
    }
}
