import { GlobalRegistrator } from "@happy-dom/global-registrator"
import HtmlBuilder from "./html-builder.ts"
import { assertEquals } from "@std/assert"
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd"

describe("HtmlBuilder", () => {
    beforeEach(() => {
        GlobalRegistrator.register()
    })

    afterEach(async () => {
        await GlobalRegistrator.unregister()
    })

    it("should build correct html hierarchy", () => {
        const builder = new HtmlBuilder("div")
        builder
            .tag("span", (span) => span.text("a span!"))
            .tag("a", (a) =>
                a
                    .text("a")
                    .tag("strong", (strong) => strong.text("link!")))
        builder.mount(document.body)

        assertEquals(document.body.innerHTML, "<div><span>a span!</span><a>a<strong>link!</strong></a></div>")
    })

    it("should build attrs correctly", () => {
        const builder = new HtmlBuilder("div")
        builder.attrs({ className: "a-class", hidden: true })
        builder.mount(document.body)

        assertEquals(document.body.innerHTML, '<div class="a-class" hidden=""></div>')
    })

    it("should build data attrs correctly", () => {
        const builder = new HtmlBuilder("div")
        builder.data({ someData: "blah", someBooleanData: true })
        builder.mount(document.body)

        assertEquals(document.body.innerHTML, `<div data-some-data="blah" data-some-boolean-data="true"></div>`)
    })

    it("should build inline styles correctly", () => {
        const builder = new HtmlBuilder("div")
        builder.style({ backgroundColor: "red", marginLeft: "10px" })
        builder.mount(document.body)

        assertEquals(
            document.body.innerHTML,
            `<div style="background-color: red; margin-left: 10px;"></div>`,
        )
    })

    it("should build custom css properties correctly", () => {
        const builder = new HtmlBuilder("div")
        builder.css({ "--my-css-var": "10px" })
        builder.mount(document.body)

        assertEquals(document.body.innerHTML, `<div style="--my-css-var: 10px;"></div>`)
    })
})
