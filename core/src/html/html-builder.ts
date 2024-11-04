import type { AnyData } from "../util/types.ts"
import type {
    CssAttrs,
    HtmlElement,
    HtmlElementAttrs,
    HtmlEventListener,
    HtmlEventType,
    HtmlEventTypeListener,
    HtmlTag,
} from "./html-types.ts"

/**
 * Builder class for creating arbitrary HTML elements
 */
export default class HtmlBuilder<TTag extends HtmlTag = HtmlTag> {
    private element: HtmlElement<TTag>
    private document: Document
    constructor(public thisTag: TTag, document?: Document) {
        this.document = document ?? globalThis.document
        this.element = this.document.createElement(thisTag, {})
    }

    /**
     * Adds the given attributes to this element.
     * @param attrs the attributes to add to this element
     */
    attrs(attrs: Partial<HtmlElementAttrs<TTag>>): this {
        for (const [key, value] of Object.entries(attrs)) {
            this.attr(key as keyof HtmlElementAttrs<TTag> & string, value as AnyData)
        }

        return this
    }

    /**
     * Set a single arbitrary attribute on this element.
     * @param key the attribute key
     * @param value the value to set for the attribute
     */
    attr(key: string, value: AnyData): this

    /**
     * Set a single known attribute on this element.
     * @param key the attribute key
     * @param value the value to set for the attribute
     */
    attr(key: keyof HtmlElementAttrs<TTag> & string, value: AnyData): this

    attr(key: string, value: AnyData): this {
        if (value && key in this.element) {
            // deno-lint-ignore no-explicit-any -- just let the element handle whatever gets passed
            this.element[key as keyof HtmlElement<TTag>] = value as any
        } else if (value) {
            // deno-lint-ignore no-explicit-any -- just let the element handle whatever gets passed
            this.element.setAttribute(key, value as any)
        } else {
            this.element.removeAttribute(key)
        }
        return this
    }

    /**
     * Sets the given data attributes on this element.
     * Attribute names will be converted according to the `dataset` name conversion rules.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset#name_conversion
     * @param data the data attributes to add
     */
    data(data: Record<string, AnyData>): this

    /**
     * Sets a specific data attribute on this element.
     * The attribute name will be converted according to the `dataset` name conversion rules.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset#name_conversion
     * @param key the data attribute key to add
     * @param value the value to add to the dataset
     */
    data(key: string, value: AnyData): this

    /**
     * Sets a specific data attribute on this element to the return value of the given function.
     * The attribute name will be converted according to the `dataset` name conversion rules.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset#name_conversion
     * @param key the data attribute key to add
     * @param value the value to add to the dataset
     */
    data(key: string, value: () => AnyData): this

    data(keyOrObj: Record<string, AnyData> | string, value?: AnyData | (() => AnyData)): this {
        if (typeof keyOrObj === "string") {
            if (typeof value === "function") {
                value = value()
            }
            this.element.dataset[keyOrObj] = stringify(value)
        } else {
            for (const [key, value] of Object.entries(keyOrObj)) {
                this.element.dataset[key] = stringify(value)
            }
        }
        return this
    }

    /**
     * Set the given inline css styles on this element.
     * Style keys will be converted according to the normal style conversion rules.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style
     * @param styles the styles to add
     */
    style(styles: Partial<CssAttrs>): this {
        Object.assign(this.element.style, styles)
        return this
    }

    /**
     * Sets the given css on this element.
     * This will do no conversion of property keys (unlike {@link style}), so it is appropriate for custom css properties.
     * @param props the css properties to add
     */
    css(props: Record<string, string>): this {
        this.element.style.webkitTextStroke
        for (const [key, value] of Object.entries(props)) {
            this.element.style.setProperty(key, value)
        }
        return this
    }

    /**
     * Append the given text to this element.
     * @param text the string to add to this element content
     */
    text(text: string): this {
        const node = this.document.createTextNode(text)
        this.element.appendChild(node)
        return this
    }

    /**
     * Append the given html to this element.
     * Use with caution. Make sure the source of the html is trusted. No sanitization is applied to the incoming html string.
     * @param html the html to append to this element
     */
    html(html: string): this {
        const template = this.document.createElement("template")
        template.innerHTML = html
        this.element.appendChild(template.content)
        return this
    }

    /**
     * Append a child element with the given tag to this element, then return an `HtmlBuilder` for the newly appended element.
     * @param childTag the tag to append
     */
    tag<TChild extends HtmlTag>(childTag: TChild): HtmlBuilder<TChild>

    /**
     * Append a child element with the given tag to this element.
     * @param childTag the tag to append
     * @param attrs attrs to apply to the new element
     */
    tag<TChild extends HtmlTag>(childTag: TChild, attrs: Partial<HtmlElementAttrs<TTag>>): this

    /**
     * Append a child element with the given tag to this element, then pass an `HtmlBuilder` for the newly appended element to the given function.
     * @param childTag the tag to append
     * @param func a function to call with an `HtmlBuilder` for the appended element.
     */
    tag<TChild extends HtmlTag>(
        childTag: TChild,
        func: (child: HtmlBuilder<TChild>) => void,
    ): this

    tag<TChild extends HtmlTag>(
        childTag: TChild,
        other?: Partial<HtmlElementAttrs<TChild>> | ((child: HtmlBuilder<TChild>) => void),
    ): this | HtmlBuilder<TChild> {
        const childBuilder = new (this.constructor as typeof HtmlBuilder)(childTag, this.document)
        this.element.appendChild(childBuilder.element)

        if (other && typeof other === "function") {
            other(childBuilder)
            return this
        } else if (other && typeof other === "object") {
            childBuilder.attrs(other)
            return this
        } else {
            return childBuilder
        }
    }

    /**
     * Execute the given function with this builder and the internal HtmlElement.
     * @param func the function to execute
     */
    with(func: (builder: this, element: HtmlElement<TTag>) => void): this {
        func(this, this.element)
        return this
    }

    /**
     * Register an event listener for a given known event type.
     * @param type the type of the event to listen for
     * @param listener the function to call when the event is triggered
     * @param options event listener options
     */
    on<T extends HtmlEventType>(
        type: T,
        listener: HtmlEventTypeListener<T>,
        options?: boolean | AddEventListenerOptions,
    ): this

    /**
     * Register an event listener for a given arbitrary event type.
     * @param type the type of the event to listen for
     * @param listener the function to call when the event is triggered
     * @param options event listener options
     */
    on<T extends Event>(
        type: string,
        listener: HtmlEventListener<T>,
        options?: boolean | AddEventListenerOptions,
    ): this

    on(type: string, listener: EventListener, options?: boolean | AddEventListenerOptions): this {
        this.element.addEventListener(type, listener, options)
        return this
    }

    /**
     * Mount this element to an element in the document
     * @param mountElement the html element into which to mount this element
     */
    mount(mountElement: HTMLElement) {
        if (this.element.tagName === "TEMPLATE" && "content" in this.element) {
            mountElement.appendChild(this.element.content)
        } else {
            mountElement.appendChild(this.element)
        }
    }
}

function stringify(value: AnyData): string | undefined {
    if (typeof value === "object") {
        return JSON.stringify(value)
    }
    return value?.toString()
}