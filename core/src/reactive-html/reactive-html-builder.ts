import type { ReactiveContext } from "../../mod.ts"
import HtmlBuilder from "../html/html-builder.ts"
import type { HtmlElementAttrs, HtmlTag } from "../html/html-types.ts"
import { _ambientEffect } from "../reactive/reactive-proxy.ts"
import type { AnyData, TOrFunc } from "../util/types.ts"

interface ReactiveHtmlBuilder {
    tag<TChild extends HtmlTag>(childTag: TChild, func?: (child: ReactiveHtmlBuilder<TChild>) => void): this
}

class ReactiveHtmlBuilder<TTag extends HtmlTag = HtmlTag> extends HtmlBuilder<TTag> {
    // TODO prevent effect leak when element is removed from page

    override attrs(attrs: Partial<HtmlElementAttrs<TTag>>): this
    override attrs(func: () => Partial<HtmlElementAttrs<TTag>>): this
    override attrs(attrs: TOrFunc<Partial<HtmlElementAttrs<TTag>>>): this {
        if (typeof attrs === "function") {
            _ambientEffect(() => {
                super.attrs(attrs)
            })
            return this
        }
        return super.attrs(attrs)
    }

    override attr(key: string, value: AnyData): this
    override attr(key: HtmlElementAttrs<TTag> & string, value: AnyData): this
    override attr(key: string, value: () => AnyData): this
    override attr(key: HtmlElementAttrs<TTag> & string, value: () => AnyData): this
    override attr(key: string, value: AnyData | (() => AnyData)): this {
        if (typeof value === "function") {
            _ambientEffect(() => {
                super.attr(key, value)
            })
            return this
        }
        return super.attr(key, value)
    }

    override data(data: Record<string, AnyData>): this
    override data(data: () => Record<string, AnyData>): this
    override data(key: string, value: AnyData): this
    override data(key: string, value: () => AnyData): this
    override data(keyOrObj: string | TOrFunc<Record<string, AnyData>>, value?: AnyData | (() => AnyData)): this {
        if (typeof keyOrObj === "function") {
            _ambientEffect(() => {
                super.data(keyOrObj)
            })
            return this
        } else if (typeof keyOrObj === "string" && typeof value === "function") {
            _ambientEffect(() => {
                super.data(keyOrObj, value)
            })
            return this
        }
        // @ts-expect-error -- passthrough to base overload
        return super.data(keyOrObj, value)
    }

    override class(className: string): this
    override class(className: string, force: boolean): this
    override class(className: string, force: () => boolean): this
    override class(className: string, force?: TOrFunc<boolean>): this {
        if (typeof force === "function") {
            _ambientEffect(() => {
                super.class(className, force)
            })
            return this
        }
        // @ts-expect-error -- passthrough to base overload
        return super.class(className, force)
    }

    /**
     * Creates a reactive frame using the given {@link ReactiveContext} for the given function.
     * The given function will be called each time any state used within it changes.
     * @param ctx - the {@link ReactiveContext} to use. Only state belonging to this context will be tracked.
     * @param func - the block to make reactive.
     */
    reactive(ctx: ReactiveContext, func: (template: ReactiveHtmlBuilder<"template">) => void): this {
        return this.tag("div", (effectContainer) => {
            effectContainer.style({ display: "contents" })
            ctx.effect(() => {
                const template = new ReactiveHtmlBuilder("template", this.document)
                func(template)
                effectContainer.element.replaceChildren(...template.element.content.childNodes)
            })
        })
    }
}

export default ReactiveHtmlBuilder
