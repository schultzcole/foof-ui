export type TriggerMode = "sync" | "async"

export type EffectOptions = {
    triggerMode?: TriggerMode
}

/**
 * Responsible for tracking "frames" that use its corresponding state and re-executing those frames when the state changes.
 */
export class ReactiveContext {
    private activeFrame: CaptureFrame | null = null
    private activeCaptures: Set<string> | null = null

    private frameMap = new Map<number, CaptureFrame>()
    private descendantsMap = new Map<number, Set<number>>()
    private ancestorsMap = new Map<number, Set<number>>()

    private asyncTriggerMap = new Map<string, Set<number>>()
    private immediateTriggerMap = new Map<string, Set<number>>()
    private queuePromise: Promise<void> | null = null
    private queuedTriggerPaths = new Set<string>()

    /**
     * Capture state accesses within the given function. When any state used in the function is mutated, the function will be called again.
     * @remarks
     * The default behavior of effect is that when any of the captured state used in the function is mutated, the function will be
     * queued to be called in a batch to reduce duplicate updates. You can override this behavior and execute immediately by passing immediate = true.
     * @param immediate whether the effect function will be called immediately upon any captured state being mutated.
     */
    effect(func: () => void, { triggerMode = "async" }: EffectOptions = {}): void {
        const captureFrame = this.createCaptureFrame(func, triggerMode ?? "async")
        this.capture(captureFrame)
    }

    /**
     * Returns a Promise that will resolve when any enqueued effect triggers have completed.
     * @remarks In general, you shouldn't need to call this in normal app code
     * @returns true if any effect triggers were enqueued, otherwise false
     */
    completeEffects(): Promise<boolean> {
        return this.queuePromise?.then(() => true) ?? Promise.resolve(false)
    }

    /**
     * Registers a get at the given path, if this reactive context has an active frame
     * @internal
     */
    _register(path: string): void {
        this.activeCaptures?.add(path)
    }

    /**
     * Registers a set at the given path, triggering any frames that depend on this path
     * @internal
     */
    _trigger(path: string): void {
        if (this.immediateTriggerMap.has(path)) {
            const frameIds = this.immediateTriggerMap.get(path)!
            this.executeFrames(frameIds)
        }

        if (this.asyncTriggerMap.has(path)) {
            this.queuedTriggerPaths.add(path)
            this.queuePromise ??= new Promise((resolve) => {
                queueMicrotask(() => {
                    this.consumeTriggerQueue()
                    this.queuePromise = null
                    resolve()
                })
            })
        }
    }

    /**
     * Register a new frame with pre-captured paths from an ambient effect.
     * @internal
     */
    _addAmbientCapture(func: () => void, capturedPaths: Set<string>) {
        const captureFrame = this.createCaptureFrame(func, "async")
        this.subscribeFrameToPaths(captureFrame, capturedPaths)
    }

    /** Creates a new capture frame with the given function, registers ancestors and descendants */
    private createCaptureFrame(func: () => void, triggerMode: TriggerMode): CaptureFrame {
        const captureFrame = new CaptureFrame(this.activeFrame?.id ?? null, func, triggerMode)
        this.populateAncestorsAndDescendants(captureFrame)
        this.frameMap.set(captureFrame.id, captureFrame)
        return captureFrame
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

    /** Given a frame and set of captured paths, registers the frame to be executed when the given paths are triggered */
    private subscribeFrameToPaths(frame: CaptureFrame, capturedPaths: Set<string>) {
        const triggerMap = (frame.triggerMode == "sync") ? this.immediateTriggerMap : this.asyncTriggerMap
        for (const path of capturedPaths) {
            if (triggerMap.has(path)) {
                const existingFrames = triggerMap.get(path)!

                const mutatedFrames = this.ensureAncestor(existingFrames, frame.id)
                triggerMap.set(path, mutatedFrames)
            } else {
                triggerMap.set(path, new Set([frame.id]))
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
        for (const key of this.asyncTriggerMap.keys()) {
            let set = this.asyncTriggerMap.get(key)!
            if (descendants) {
                set = set.difference(descendants)
            }
            set.delete(frameId)
            this.asyncTriggerMap.set(key, set)
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

    /** Executes async frames for paths that have been enqueued */
    private consumeTriggerQueue() {
        const paths = Array.from(this.queuedTriggerPaths)
        this.queuedTriggerPaths.clear()

        const frameIds = new Set<number>()
        for (const path of paths) {
            const pathFrameIds = this.asyncTriggerMap.get(path)!
            this.asyncTriggerMap.delete(path)
            for (const pathFrameId of pathFrameIds) {
                this.ensureAncestor(frameIds, pathFrameId)
            }
        }
        this.executeFrames(frameIds)
    }

    /** Executes the frames with the given IDs. */
    private executeFrames(frameIds: Set<number>): void {
        for (const id of frameIds) {
            const frame = this.frameMap.get(id)
            if (!frame) continue
            this.clearFrame(frame)
            this.capture(frame)
        }
    }

    /**
     * Given a set of frameIds and a frameId:
     * - if an ancestor of the given frameId is already in the set, do nothing
     * - Otherwise, add the given frameId to the set and ensure none of its children are in the set
     */
    private ensureAncestor(frameIds: Set<number>, frameId: number): Set<number> {
        const frameAncestors = this.ancestorsMap.get(frameId)!
        const frameDescendants = this.descendantsMap.get(frameId)

        if (frameIds.intersection(frameAncestors).size) {
            // an ancestor is already subscribed to this trigger, skip
            return frameIds
        }

        // subscribe this frame to this trigger...
        frameIds.add(frameId)

        // and remove any of this frame's descendants from this trigger.
        if (frameDescendants) {
            frameIds = frameIds.difference(frameDescendants)
        }
        return frameIds
    }
}

class CaptureFrame {
    private static frameNumber = 0

    id: number
    constructor(public parentId: number | null, public func: () => void, public triggerMode: TriggerMode) {
        this.id = ++CaptureFrame.frameNumber
    }
}
