import type { WritableKeysOf } from "type-fest"
import { HtmlBuilder, ReactiveHtmlBuilder } from "../../mod.ts"

/** Returns all keys of T where T[K] is not a function */
export type NonFunctionKeysOf<T> = Exclude<
    {
        // deno-lint-ignore ban-types -- *any* function or class
        [key in keyof T]: T[key] extends Function ? never : key
    }[keyof T],
    undefined
>

/** Returns T where properties of type function are omitted */
export type OmitFunctions<T> = Pick<T, NonFunctionKeysOf<T>>

/** Returns T where readonly propertys are omitted */
export type OmitReadonly<T> = Pick<T, WritableKeysOf<T>>

/** A value that can be cooerced into an html attribute string */
export type AnyData = string | number | bigint | boolean | undefined | null

/** Either T or a function that takes no arguments and returns a T */
export type TOrFunc<T> = T | (() => T)

export type Component<TRootBuilder extends HtmlBuilder, TArgs extends any[] = any[]> = (
    root: TRootBuilder,
    ...args: TArgs
) => void
export type ComponentParameters<TRootBuilder extends HtmlBuilder, T extends Component<TRootBuilder>> = T extends
    Component<TRootBuilder, infer TArgs> ? TArgs : never
