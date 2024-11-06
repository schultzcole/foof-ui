import { ReactiveContext } from "../../mod.ts"
import HtmlBuilder from "../html/html-builder.ts"
import type { HtmlElement, HtmlElementAttrs, HtmlTag } from "../html/html-types.ts"
import { _ambientEffect } from "../reactive/reactive-proxy.ts"
import type { AnyData, OmitFunctions, TOrFunc } from "../util/types.ts"

export default class ReactiveHtmlBuilder<TTag extends HtmlTag = HtmlTag> extends HtmlBuilder<TTag> {
    // TODO prevent effect leak when element is removed from page

    override attrs(attrs: Partial<HtmlElementAttrs<TTag>>): this
    override attrs(func: () => Partial<HtmlElementAttrs<TTag>>): this
    override attrs(attrs: TOrFunc<Partial<HtmlElementAttrs<TTag>>>): this {
        if (typeof attrs === "function") {
            _ambientEffect(() => {
                super.attrs(attrs)
            })
            return this
        } else {
            return super.attrs(attrs)
        }
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
        } else {
            return super.attr(key, value)
        }
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
        } else if (typeof keyOrObj === "string") {
            if (typeof value === "function") {
                _ambientEffect(() => {
                    super.data(keyOrObj, value)
                })
                return this
            }
            return super.data(keyOrObj, value)
        } else {
            return super.data(keyOrObj)
        }
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
        } else if (force !== undefined) {
            return super.class(className, force)
        } else {
            return super.class(className)
        }
    }

    override tag<TChild extends HtmlTag>(childTag: TChild): ReactiveHtmlBuilder<TChild>
    override tag<TChild extends HtmlTag>(childTag: TChild, attrs: Partial<HtmlElementAttrs<TChild>>): this
    override tag<TChild extends HtmlTag>(childTag: TChild, func: (child: ReactiveHtmlBuilder<TChild>) => void): this
    override tag<TChild extends HtmlTag>(
        childTag: TChild,
        other?: Partial<HtmlElementAttrs<TChild>> | ((child: ReactiveHtmlBuilder<TChild>) => void),
    ): this | ReactiveHtmlBuilder<TChild> {
        // @ts-expect-error -- base class passthrough
        return super.tag(childTag, other)
    }

    /**
     * Creates a reactive frame using the given {@link ReactiveContext} for the given function.
     * The given function will be called each time any state used within it changes.
     * @param ctx - the {@link ReactiveContext} to use. Only state belonging to this context will be tracked.
     * @param func - the block to make reactive.
     */
    reactive(ctx: ReactiveContext, func: (template: ReactiveHtmlBuilder<"template">) => void): this {
        const effectContainer = this.tag("div").style({ display: "contents" })
        ctx.effect(() => {
            const template = new ReactiveHtmlBuilder("template", this.document)
            func(template)
            effectContainer.element.replaceChildren(...template.element.childNodes)
        })

        return this
    }
}