import { ambientEffect, reactive } from "./reactive.ts"
import { assertEquals } from "@std/assert"
import { describe, it } from "@std/testing/bdd"

describe("ambientCapture", () => {
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
})
