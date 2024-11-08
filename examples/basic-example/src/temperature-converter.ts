import { reactive, ReactiveHtmlBuilder } from "@scope/core"

export function temperatureConverter(root: ReactiveHtmlBuilder, initialCelcius: number | null = null) {
    const { state } = reactive({
        celcius: initialCelcius,
        fahrenheit: cToF(initialCelcius),
    })

    function updateCelcius(event: Event) {
        const input = event.currentTarget as HTMLInputElement
        const value = parseFloat(input.value)
        if (isNaN(value)) {
            console.warn("invalid number!")
            state.fahrenheit = null
        } else {
            state.celcius = value
            state.fahrenheit = cToF(value)
        }
    }

    function updateFahrenheit(event: Event) {
        const input = event.currentTarget as HTMLInputElement
        const value = parseFloat(input.value)
        if (isNaN(value)) {
            console.warn("invalid number!")
            state.celcius = null
        } else {
            state.fahrenheit = value
            state.celcius = fToC(value)
        }
    }

    root
        .tag("div", (div) => {
            div.attrs({ className: "flex flex-col flex-gap" })
                .tag("div", (div) => {
                    div
                        .tag("label", (label) => label.attrs({ htmlFor: "celcius-field" }).text("Celcius: "))
                        .tag("input", (input) => {
                            input.attrs({ id: "celcius-field", type: "number" })
                                .attr("value", () => state.celcius)
                                .on("input", updateCelcius)
                        })
                })
                .tag("div", (div) => {
                    div
                        .tag("label", (label) => label.attrs({ htmlFor: "fahrenheit-field" }).text("Fahrenheit: "))
                        .tag("input", (input) => {
                            input.attrs({ id: "fahrenheit-field", type: "number" })
                                .attr("value", () => state.fahrenheit)
                                .on("input", updateFahrenheit)
                        })
                })
        })
}

function cToF(c: number | null, precision: number = 0.001): number | null {
    if (c === null) return null
    precision = 1 / precision
    return Math.round((c * (9 / 5) + 32) * precision) / precision
}

function fToC(f: number | null, precision: number = 0.001): number | null {
    if (f === null) return null
    precision = 1 / precision
    return Math.round(((f - 32) * (5 / 9)) * precision) / precision
}
