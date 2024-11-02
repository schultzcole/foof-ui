import { reactive } from "./reactive.ts"
import { assertEquals } from "@std/assert"
import { describe, it } from "@std/testing/bdd"

describe("ReactiveContext#effect", () => {
    it("should call passed function again when used state changes", async () => {
        const obj = { foo: "bar" }
        const { state, ctx } = reactive(obj)

        const fooValues: string[] = []

        ctx.effect(() => {
            fooValues.push(state.foo)
        })

        state.foo = "baz"
        await ctx.completeEffects()

        assertEquals(fooValues, ["bar", "baz"])
    })

    it("should not call passed function again when used state doesn't change", async () => {
        const obj = { foo: "bar", baz: "qux" }
        const { state, ctx } = reactive(obj)

        const fooValues: string[] = []

        ctx.effect(() => {
            fooValues.push(state.foo)
        })

        state.baz = "other"
        await ctx.completeEffects()

        assertEquals(fooValues, ["bar"])
    })

    it("should not call block twice when multiple nested states change", async () => {
        const obj = { nested: { foo: "bar", baz: "qux" } }
        const { state, ctx } = reactive(obj)

        const fooValues: string[] = []
        const bazValues: string[] = []

        ctx.effect(() => {
            fooValues.push(state.nested.foo)
            bazValues.push(state.nested.baz)
        })

        state.nested = { foo: "bingo", baz: "bango" }
        await ctx.completeEffects()

        assertEquals({ fooValues, bazValues }, { fooValues: ["bar", "bingo"], bazValues: ["qux", "bango"] })
    })

    it("should not call outer block when inner block state changes", async () => {
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
        await ctx.completeEffects()

        assertEquals({ fooValues, bazValues }, { fooValues: ["bar"], bazValues: ["qux", "other"] })
    })

    it("should call block when parent of deeply nested accessed state changes", async () => {
        const obj = { nested: { foo: "bar" } }
        const { state, ctx } = reactive(obj)

        const fooValues: string[] = []

        ctx.effect(() => {
            fooValues.push(state.nested.foo)
        })

        state.nested = { foo: "baz" }
        await ctx.completeEffects()

        assertEquals(fooValues, ["bar", "baz"])
    })

    it("should call inner block once when both inner and outer block have same trigger", async () => {
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
        await ctx.completeEffects()

        assertEquals({ outerFooValues, innerFooValues }, {
            outerFooValues: ["bar", "baz"],
            innerFooValues: ["bar", "baz"],
        })
    })

    it("should call inner block once on trigger after outer block is triggered", async () => {
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
        await ctx.completeEffects()

        assertEquals({ fooValues, bazValues }, {
            fooValues: ["bar", "change1"],
            bazValues: ["qux", "change2"],
        })
    })

    it("should call effect immediately if `triggerMode` is 'sync'", async () => {
        const obj = { foo: "bar" }
        const { state, ctx } = reactive(obj)

        const fooValues: string[] = []

        ctx.effect(() => {
            fooValues.push(state.foo)
        }, { triggerMode: "sync" })

        state.foo = "baz"

        await ctx.completeEffects()

        assertEquals(fooValues, ["bar", "baz"])
    })

    it("should call effects with different `triggerMode`s differently, even if they depend on the same state", async () => {
        const obj = { foo: "bar" }
        const { state, ctx } = reactive(obj)

        const immediateEffectValues: string[] = []
        const asyncEffectValues: string[] = []

        ctx.effect(() => {
            immediateEffectValues.push(state.foo)
        }, { triggerMode: "sync" })

        ctx.effect(() => {
            asyncEffectValues.push(state.foo)
        })

        state.foo = "baz"
        state.foo = "qux"

        await ctx.completeEffects()

        assertEquals({ immediateEffectValues, asyncEffectValues }, {
            immediateEffectValues: ["bar", "baz", "qux"],
            asyncEffectValues: ["bar", "qux"],
        })
    })
})
