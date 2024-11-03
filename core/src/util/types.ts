import type { WritableKeysOf } from "type-fest"

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

export type AnyData = object | string | number | bigint | boolean | undefined | null
