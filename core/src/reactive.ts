const REACTIVE_CONTEXT = Symbol("REACTIVE_CONTEXT")

export type Reactiveable = object

const proxyMap = new WeakMap()
export function reactive<T extends Reactiveable>(input: T): { state: T; ctx: ReactiveContext } {
    if (proxyMap.has(input)) return proxyMap.get(input)

    const ctx = new ReactiveContext()
    const proxied = reactiveInner(input, ctx, input, "")
    return { state: proxied, ctx }
}

function reactiveInner<T extends Reactiveable, TRoot extends Reactiveable>(
    input: T,
    ctx: ReactiveContext,
    root: TRoot,
    path: string,
): T {
    if (proxyMap.has(input)) return proxyMap.get(input)

    const proxied = new Proxy(input, handlerForContext(root, ctx, path))
    proxyMap.set(input, proxied)
    return proxied
}

function handlerForContext<T extends Reactiveable, TRoot extends Reactiveable>(
    root: TRoot,
    ctx: ReactiveContext,
    parentPath: string,
): ProxyHandler<T> {
    return {
        get(target: T, prop: keyof T & (string | symbol)) {
            if (prop === REACTIVE_CONTEXT) return ctx

            const thisPath = parentPath + `[${prop.toString()}]`

            ctx.register(thisPath)
            if (ambientEffectContext) {
                if (ambientEffectContext.ctx && ambientEffectContext.ctx !== ctx) throw new Error()
                ambientEffectContext.ctx ??= ctx
                ambientEffectContext.capturedPaths.add(thisPath)
            }
            const value = target[prop]
            if (value instanceof Function) {
                return value
            } else if (value && typeof value === "object") {
                return reactiveInner(value, ctx, root, thisPath)
            }
            return value
        },
        set(target: T, prop: keyof T & (string | symbol), value: any) {
            if (prop === REACTIVE_CONTEXT) return false

            const thisPath = parentPath + `[${prop.toString()}]`
            target[prop] = value
            ctx.trigger(thisPath)
            return true
        },
    }
}

let ambientEffectContext: { ctx: ReactiveContext | null; capturedPaths: Set<string> } | null = null

export function ambientEffect(func: () => void): void {
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

class NestedAmbientCaptureError extends Error {
    constructor() {
        super("Nested calls to ambientCapture are not allowed")
        this.name = "NestedAmbientCaptureError"
    }
}

class CaptureFrame {
    private static frameNumber = 0

    id: number
    constructor(public parentId: number | null, public func: () => void) {
        this.id = ++CaptureFrame.frameNumber
    }
}

export class ReactiveContext {
    private activeFrame: CaptureFrame | null = null
    private activeCaptures: Set<string> | null = null
    private triggerMap = new Map<string, Set<number>>()
    private frameMap = new Map<number, CaptureFrame>()
    private descendantsMap = new Map<number, Set<number>>()
    private ancestorsMap = new Map<number, Set<number>>()

    /**
     * Registers a get at the given path, if this reactive context has an active frame
     * @internal
     */
    register(path: string): void {
        this.activeCaptures?.add(path)
    }

    /**
     * Registers a set at the given path, triggering any frames that depend on this path
     * @internal
     */
    trigger(path: string): void {
        // TODO trigger in the microtask queue so that multiple simultaneous state changes result in a single "re-render"
        if (!this.triggerMap.has(path)) return
        const frameIds = this.triggerMap.get(path)!
        this.triggerMap.delete(path)

        if (!frameIds.size) return

        for (const id of frameIds) {
            const frame = this.frameMap.get(id)
            if (!frame) continue
            this.clearFrame(frame)
            this.capture(frame)
        }
    }

    /** Capture state accesses within the given function. When any state used in the function is mutated, the function will be called again. */
    effect(func: () => void): void {
        const captureFrame = this.createCaptureFrame(func)
        this.capture(captureFrame)
    }

    /** Executes the given capture frame, capturing accessed state paths, then subscribing the frame to the captured paths. */
    private capture(captureFrame: CaptureFrame): Set<string> {
        const capturedPaths = new Set<string>()
        const oldActiveCaptures = this.activeCaptures
        try {
            this.activeFrame = captureFrame
            this.activeCaptures = capturedPaths
            captureFrame.func()
        } finally {
            if (captureFrame.parentId) {
                this.activeFrame = this.frameMap.get(captureFrame.parentId)!
            } else {
                this.activeFrame = null
            }
            this.activeCaptures = oldActiveCaptures
        }

        this.subscribeFrameToPaths(captureFrame, capturedPaths)

        return capturedPaths
    }

    /**
     * Register a new frame with pre-captured paths from an ambient effect.
     * @internal
     */
    _addAmbientCapture(func: () => void, capturedPaths: Set<string>) {
        const captureFrame = this.createCaptureFrame(func)
        this.subscribeFrameToPaths(captureFrame, capturedPaths)
    }

    /** Creates a new capture frame with the given function, registers ancestors and descendants */
    private createCaptureFrame(func: () => void): CaptureFrame {
        const captureFrame = new CaptureFrame(this.activeFrame?.id ?? null, func)
        this.populateAncestorsAndDescendants(captureFrame)
        this.frameMap.set(captureFrame.id, captureFrame)
        return captureFrame
    }

    /** Given a frame and set of captured paths, registers the frame to be executed when the given paths are triggered */
    private subscribeFrameToPaths(frame: CaptureFrame, capturedPaths: Set<string>) {
        const frameAncestors = this.ancestorsMap.get(frame.id)!
        const frameDescendants = this.descendantsMap.get(frame.id)
        for (const path of capturedPaths) {
            if (this.triggerMap.has(path)) {
                const existingFrames = this.triggerMap.get(path)!

                if (existingFrames.intersection(frameAncestors).size) {
                    // an ancestor is already subscribed to this trigger, skip
                    continue
                }

                // subscribe this frame to this trigger...
                existingFrames.add(frame.id)

                // and remove any of this frame's descendants from this trigger.
                if (frameDescendants) {
                    this.triggerMap.set(path, existingFrames.difference(frameDescendants))
                }
            } else {
                this.triggerMap.set(path, new Set([frame.id]))
            }
        }
    }

    /** Adds the given frame as a descendant of each of its ancestors and sets this frame's ancestors */
    private populateAncestorsAndDescendants(frame: CaptureFrame) {
        const ancestors = new Set<number>()
        let current: CaptureFrame | undefined = frame
        while (current && current.parentId) {
            if (this.descendantsMap.has(current.parentId)) {
                this.descendantsMap.get(current.parentId)!.add(frame.id)
            } else {
                this.descendantsMap.set(current.parentId, new Set([frame.id]))
            }
            ancestors.add(current.parentId)
            current = this.frameMap.get(current.parentId)
        }
        this.ancestorsMap.set(frame.id, ancestors)
    }

    /** Removes all captures, triggers, and descendants for this frame */
    private clearFrame(frame: CaptureFrame) {
        const frameId = frame.id

        const descendants = this.descendantsMap.get(frameId)
        this.descendantsMap.delete(frameId)

        // Clear any triggers for this frame and its descendants
        for (const key of this.triggerMap.keys()) {
            let set = this.triggerMap.get(key)!
            if (descendants) {
                set = set.difference(descendants)
            }
            set.delete(frameId)
            this.triggerMap.set(key, set)
        }

        if (!descendants) return

        // Clear descendants of all ancestors
        const ancestors = this.ancestorsMap.get(frameId)
        if (ancestors) {
            for (const ancestorId of ancestors) {
                this.removeDescendants(ancestorId, descendants)
            }
        }

        // Remove descendants
        for (const descendantId of descendants) {
            this.frameMap.delete(descendantId)
            this.ancestorsMap.delete(descendantId)
            this.descendantsMap.delete(descendantId)
        }
    }

    /** Removes the given descendants from the descendants map of the given ancestor */
    private removeDescendants(ancestorId: number, descendantsToClear: Set<number>) {
        const descendants = this.descendantsMap.get(ancestorId)
        if (!descendants) return

        const newDescendants = descendants.difference(descendantsToClear)
        this.descendantsMap.set(ancestorId, newDescendants)
    }
}
