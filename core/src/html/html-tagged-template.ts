/**
 * Tag an html string literal as html.
 * Some editors/IDE extensions add support for syntax highlighting and formatting within an `html` tagged template literal.
 *
 * @example
 * ```ts
 * // this is semantically identical to just the plain template string, but with better IDE support
 * html`<div class="myclass">Some html text</div>`
 * ```
 */
export function html(strs: TemplateStringsArray, ...values: unknown[]): string {
    return values.length ? String.raw(strs, ...values) : strs[0]
}
