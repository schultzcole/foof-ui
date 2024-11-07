import "./style.css"
import { counter } from "./counter.ts"
import { ReactiveHtmlBuilder } from "@scope/core"

const rootElement = document.getElementById("app")!
new ReactiveHtmlBuilder("template")
    .tag("h1", (heading) => heading.text("Foof Demo"))
    .tag("div", (card) => {
        card.attrs({ className: "flex-col" })
            .tag("div", (panel) => {
                panel.attrs({ className: "panel drop-shadow" })
                    .tag("h2", (h2) => h2.text("Counter"))
                    .component(counter, 42)
            })
    })
    .mount(rootElement)
