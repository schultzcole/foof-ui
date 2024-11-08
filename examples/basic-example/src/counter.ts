import { reactive, ReactiveHtmlBuilder } from "@scope/core"

export function counter(root: ReactiveHtmlBuilder, initialValue: number) {
    const { state, ctx } = reactive({ count: initialValue })

    root.tag("div", (div) => {
        div.attrs({ className: "flex flex-row flex-gap flex-even" })
            .style({ fontSize: "1.4rem" })
            .tag("button", (button) => {
                button
                    .text("-")
                    .on("mousedown", (_) => state.count--)
            })
            .tag("span", (span) => {
                span.reactive(ctx, (template) => template.html`Count: <strong>${state.count}</strong>`)
            })
            .tag("button", (button) => {
                button
                    .text("+")
                    .on("mousedown", (_) => state.count++)
            })
    })
}
