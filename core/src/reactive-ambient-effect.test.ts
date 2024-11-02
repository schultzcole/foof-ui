import { _ambientEffect, NestedAmbientCaptureError, reactive } from "./reactive-proxy.ts"
import { assertEquals, assertThrows } from "@std/assert"
import { describe, it } from "@std/testing/bdd"

describe("ambientEffect", () => {
    it("should register contents with appropriate ReactiveContext", async () => {
        const obj = { foo: "bar" }
        const { state, ctx } = reactive(obj)

        const fooValues: string[] = []
        _ambientEffect(() => {
            fooValues.push(state.foo)
        })

        state.foo = "baz"
        await ctx.completeEffects()

        assertEquals(fooValues, ["bar", "baz"])
    })

    it("should throw when called within another ambientEffect", () => {
        assertThrows(() => {
            _ambientEffect(() => _ambientEffect(() => {}))
        }, NestedAmbientCaptureError)
    })
})
