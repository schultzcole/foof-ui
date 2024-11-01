import { ambientEffect, NestedAmbientCaptureError, reactive } from "./reactive.ts"
import { assertEquals, assertThrows } from "@std/assert"
import { describe, it } from "@std/testing/bdd"

describe("ambientEffect", () => {
    it("should register contents with appropriate ReactiveContext", () => {
        const obj = { foo: "bar" }
        const { state } = reactive(obj)

        const fooValues: string[] = []
        ambientEffect(() => {
            fooValues.push(state.foo)
        })

        state.foo = "baz"

        assertEquals(fooValues, ["bar", "baz"])
    })

    it("should throw when called within another ambientEffect", () => {
        assertThrows(() => {
            ambientEffect(() => ambientEffect(() => {}))
        }, NestedAmbientCaptureError)
    })
})
