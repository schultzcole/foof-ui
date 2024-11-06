import { GlobalRegistrator } from "@happy-dom/global-registrator"
import { assertEquals } from "@std/assert"
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd"
import { reactive } from "../reactive/reactive-proxy.ts"
import ReactiveHtmlBuilder from "./reactive-html-builder.ts"

describe("ReactiveHtmlBuilder", () => {
    beforeEach(() => {
        GlobalRegistrator.register()
    })

    afterEach(async () => {
        await GlobalRegistrator.unregister()
    })

    describe("#attrs", () => {
        it("sets initial attr values from object", () => {
            const { state } = reactive({ id: "foo" })

            const builder = new ReactiveHtmlBuilder("div")
            builder.attrs(() => state)
            builder.mount(document.body)

            assertEquals(document.body.innerHTML, `<div id="foo"></div>`)
        })

        it("updates attr values from object when state changes", async () => {
            const { state, ctx } = reactive({ id: "foo" })

            const builder = new ReactiveHtmlBuilder("div")
            builder.attrs(() => state)
            builder.mount(document.body)

            state.id = "bar"

            await ctx.completeEffects()

            assertEquals(document.body.innerHTML, `<div id="bar"></div>`)
        })
    })

    describe("#attr", () => {
        it("sets initial attr value", () => {
            const { state } = reactive({ elementId: "foo" })

            const builder = new ReactiveHtmlBuilder("div")
            builder.attr("id", () => state.elementId)
            builder.mount(document.body)

            assertEquals(document.body.innerHTML, `<div id="foo"></div>`)
        })

        it("updates attr value based on reactive update", async () => {
            const { state, ctx } = reactive({ elementId: "foo" })

            const builder = new ReactiveHtmlBuilder("div")
            builder.attr("id", () => state.elementId)
            builder.mount(document.body)

            state.elementId = "bar"

            await ctx.completeEffects()

            assertEquals(document.body.innerHTML, `<div id="bar"></div>`)
        })
    })

    describe("#data", () => {
        it("sets initial data values from object", () => {
            const { state } = reactive({ foo: "bar" })

            const builder = new ReactiveHtmlBuilder("div")
            builder.data(() => state)
            builder.mount(document.body)

            assertEquals(document.body.innerHTML, `<div data-foo="bar"></div>`)
        })

        it("updates data values from object when state changes", async () => {
            const { state, ctx } = reactive({ foo: "bar" })

            const builder = new ReactiveHtmlBuilder("div")
            builder.data(() => state)
            builder.mount(document.body)

            state.foo = "baz"

            await ctx.completeEffects()

            assertEquals(document.body.innerHTML, `<div data-foo="baz"></div>`)
        })

        it("sets initial data value from function", () => {
            const builder = new ReactiveHtmlBuilder("div")
            builder.data("foo", () => "bar")
            builder.mount(document.body)

            assertEquals(document.body.innerHTML, `<div data-foo="bar"></div>`)
        })

        it("updates data value from function", async () => {
            const { state, ctx } = reactive({ foo: "bar" })

            const builder = new ReactiveHtmlBuilder("div")
            builder.data("foo", () => state.foo)
            builder.mount(document.body)

            state.foo = "baz"

            await ctx.completeEffects()

            assertEquals(document.body.innerHTML, `<div data-foo="baz"></div>`)
        })
    })

    describe("#class", () => {
        it("sets initial class from function", () => {
            const { state } = reactive({ hasError: true })

            const builder = new ReactiveHtmlBuilder("div")
            builder.class("error", () => state.hasError)
            builder.mount(document.body)

            assertEquals(document.body.innerHTML, `<div class="error"></div>`)
        })

        it("updates class from function", async () => {
            const { state, ctx } = reactive({ hasError: true })

            const builder = new ReactiveHtmlBuilder("div")
            builder.class("error", () => state.hasError)
            builder.mount(document.body)

            state.hasError = false

            await ctx.completeEffects()

            assertEquals(document.body.innerHTML, `<div class=""></div>`)
        })
    })

    describe("#reactive", () => {
        it("should render contents", () => {
            const { state, ctx } = reactive({ activeTab: "one" })

            const builder = new ReactiveHtmlBuilder("main")
            builder.reactive(ctx, (template) => {
                if (state.activeTab === "one") {
                    template.html`
                        <strong>This is the contents of tab 1!</strong>
                    `
                } else if (state.activeTab === "two") {
                    template.html`
                        <em>This is the contents of tab 2!</em>
                    `
                }
            })
            builder.mount(document.body)

            assertEquals(
                document.body.innerHTML,
                `<main><div style="display: contents;"><strong>This is the contents of tab 1!</strong></div></main>`,
            )
        })

        it("should re-render contents when tracked state changes", async () => {
            const { state, ctx } = reactive({ activeTab: "one" })

            const builder = new ReactiveHtmlBuilder("main")
            builder.reactive(ctx, (template) => {
                if (state.activeTab === "one") {
                    template.html`
                        <strong>This is the contents of tab 1!</strong>
                    `
                } else if (state.activeTab === "two") {
                    template.html`
                        <em>This is the contents of tab 2!</em>
                    `
                }
            })
            builder.mount(document.body)

            state.activeTab = "two"

            await ctx.completeEffects()

            assertEquals(
                document.body.innerHTML,
                `<main><div style="display: contents;"><em>This is the contents of tab 2!</em></div></main>`,
            )
        })
    })
})
