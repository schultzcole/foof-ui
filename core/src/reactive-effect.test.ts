import { reactive } from "./reactive.ts"
import { assertEquals } from "@std/assert"
import { describe, it } from "@std/testing/bdd"

describe("ReactiveContext#block", () => {
    it("should call passed function again when used state changes", () => {
        const obj = { foo: "bar" }
        const { state, ctx } = reactive(obj)

        const fooValues: string[] = []

        ctx.effect(() => {
            fooValues.push(state.foo)
        })

        state.foo = "baz"

        assertEquals(fooValues, ["bar", "baz"])
    })

    it("should not call passed function again when used state doesn't change", () => {
        const obj = { foo: "bar", baz: "qux" }
        const { state, ctx } = reactive(obj)

        const fooValues: string[] = []

        ctx.effect(() => {
            fooValues.push(state.foo)
        })

        state.baz = "other"

        assertEquals(fooValues, ["bar"])
    })

    it("should not call block twice when multiple nested states change", () => {
        const obj = { nested: { foo: "bar", baz: "qux" } }
        const { state, ctx } = reactive(obj)

        const fooValues: string[] = []
        const bazValues: string[] = []

        ctx.effect(() => {
            fooValues.push(state.nested.foo)
            bazValues.push(state.nested.baz)
        })

        state.nested = { foo: "bingo", baz: "bango" }

        assertEquals({ fooValues, bazValues }, { fooValues: ["bar", "bingo"], bazValues: ["qux", "bango"] })
    })

    it("should not call outer block when inner block state changes", () => {
        const obj = { foo: "bar", baz: "qux" }
        const { state, ctx } = reactive(obj)

        const fooValues: string[] = []
        const bazValues: string[] = []

        ctx.effect(() => {
            fooValues.push(state.foo)
            ctx.effect(() => {
                bazValues.push(state.baz)
            })
        })

        state.baz = "other"

        assertEquals({ fooValues, bazValues }, { fooValues: ["bar"], bazValues: ["qux", "other"] })
    })

    it("should call block when parent of deeply nested accessed state changes", () => {
        const obj = { nested: { foo: "bar" } }
        const { state, ctx } = reactive(obj)

        const fooValues: string[] = []

        ctx.effect(() => {
            fooValues.push(state.nested.foo)
        })

        state.nested = { foo: "baz" }

        assertEquals(fooValues, ["bar", "baz"])
    })

    it("should call inner block once when both inner and outer block have same trigger", () => {
        // This test ensures that when an outer and inner block are both triggered by the same state change, the inner block doesn't get triggered twice
        const obj = { foo: "bar" }
        const { state, ctx } = reactive(obj)

        const outerFooValues: string[] = []
        const innerFooValues: string[] = []

        ctx.effect(() => {
            outerFooValues.push(state.foo)
            ctx.effect(() => {
                innerFooValues.push(state.foo)
            })
        })

        state.foo = "baz"

        assertEquals({ outerFooValues, innerFooValues }, {
            outerFooValues: ["bar", "baz"],
            innerFooValues: ["bar", "baz"],
        })
    })

    it("should call inner block once on trigger after outer block is triggered", () => {
        // This test ensures that when an outer block is re-run, any existing child blocks are removed and not leaked.
        const obj = { foo: "bar", baz: "qux" }
        const { state, ctx } = reactive(obj)

        const fooValues: string[] = []
        const bazValues: string[] = []

        ctx.effect(() => {
            fooValues.push(state.foo)
            ctx.effect(() => {
                bazValues.push(state.baz)
            })
        })

        state.foo = "change1"
        state.baz = "change2"

        assertEquals({ fooValues, bazValues }, {
            fooValues: ["bar", "change1"],
            bazValues: ["qux", "qux", "change2"],
        })
    })
})
