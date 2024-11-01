import { reactive } from "./reactive.ts"
import { assertEquals, assertThrows } from "@std/assert"
import { describe, it } from "@std/testing/bdd"

describe("reactive", () => {
    describe("when applied to POJO", () => {
        describe("should proxy", () => {
            it("property", () => {
                const obj = { foo: "bar" }
                const { state } = reactive(obj)

                assertEquals(state.foo, "bar")
            })

            it("function", () => {
                const obj = {
                    foo() {
                        return "bar"
                    },
                }
                const { state } = reactive(obj)

                assertEquals(state.foo(), "bar")
            })

            it("arrow function", () => {
                const obj = {
                    foo: () => "bar",
                }
                const { state } = reactive(obj)

                assertEquals(state.foo(), "bar")
            })

            it("getter", () => {
                const obj = {
                    get foo() {
                        return "bar"
                    },
                }
                const { state } = reactive(obj)

                assertEquals(state.foo, "bar")
            })
        })

        describe("should respect semantics of", () => {
            it("`this` in proxied function", () => {
                const obj = {
                    value: "bar",
                    foo() {
                        return this.value
                    },
                }
                const { state } = reactive(obj)

                assertEquals(state.foo(), "bar")
            })

            it("throwing when using `this` in proxied arrow function", () => {
                const obj = {
                    value: "baz",
                    // @ts-expect-error -- `this` is undefined in arrow function
                    foo: () => this.value,
                }
                const { state } = reactive(obj)

                assertThrows(() => state.foo())
            })

            it("`this` in proxied function within class context", () => {
                class TestClass {
                    value = "from class"
                    obj = {
                        value: "from obj",
                        foo() {
                            return this.value
                        },
                    }
                }
                const inst = new TestClass()
                const { state } = reactive(inst.obj)

                assertEquals(state.foo(), "from obj")
            })

            it("`this` in proxied arrow function within class context", () => {
                class TestClass {
                    value = "from class"
                    obj = {
                        value: "from obj",
                        foo: () => this.value,
                    }
                }
                const inst = new TestClass()
                const { state } = reactive(inst.obj)

                assertEquals(state.foo(), "from class")
            })
        })
    })
})
