import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { ChannelWorkerHost, ChannelRouter, BAD_CHANNEL_NAMES } from "../src/lib/channel-worker/ChannelWorker.js"

describe("ChannelRouter", () => {
    test("postMessage calls txFn with wrapped payload", () => {
        const sent = []
        const router = new ChannelRouter(
            (...args) => sent.push(args),
            () => {}
        )

        router.postMessage("mychannel", { hello: "world" })

        expect(sent.length).toBe(2) // one for channel registration, one for the message
        expect(sent[0][0]).toEqual({
            channel: "channelworker_internal",
            message: { type: "newchannel", channel: "mychannel" }
        })
        expect(sent[1][0]).toEqual({
            channel: "mychannel",
            message: { hello: "world" }
        })
    })

    test("postMessage does not re-register existing channels", () => {
        const sent = []
        const router = new ChannelRouter(
            (...args) => sent.push(args),
            () => {}
        )

        router.postMessage("mychannel", "first")
        router.postMessage("mychannel", "second")

        // registration only happens once (first call), so:
        // call 1: registration + message = 2
        // call 2: message only = 1
        expect(sent.length).toBe(3)
    })

    test("postMessage throws on reserved channel names", () => {
        const router = new ChannelRouter(() => {}, () => {})

        for (const name of BAD_CHANNEL_NAMES) {
            expect(() => router.postMessage(name, "test")).toThrow("reserved")
        }
    })

    test("onUnchanneledMessage dispatches via rxFn", () => {
        const dispatched = []
        const router = new ChannelRouter(
            () => {},
            (event) => dispatched.push(event)
        )

        const fakeEvent = new MessageEvent("message", {
            data: { channel: "mychannel", message: { foo: "bar" } }
        })

        router.onUnchanneledMessage(fakeEvent)

        expect(dispatched.length).toBe(1)
        expect(dispatched[0].type).toBe("mychannel")
        expect(dispatched[0].data).toEqual({ foo: "bar" })
    })

    test("onUnchanneledMessage ignores non-channel messages", () => {
        const dispatched = []
        const router = new ChannelRouter(
            () => {},
            (event) => dispatched.push(event)
        )

        // message without channel/message structure
        const fakeEvent = new MessageEvent("message", {
            data: { something: "else" }
        })

        router.onUnchanneledMessage(fakeEvent)

        expect(dispatched.length).toBe(0)
    })
})

describe("ChannelWorkerHost + Client integration", () => {
    let host

    beforeEach(() => {
        host = new ChannelWorkerHost(
            new URL("./fixtures/echo-worker.js", import.meta.url).href
        )
    })

    afterEach(() => {
        host.terminate()
    })

    test("sends and receives on a named channel", async () => {
        const result = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Timed out")), 2000)

            host.addEventListener("echo", (e) => {
                clearTimeout(timeout)
                resolve(e.data)
            })

            host.postMessage("echo", { test: "roundtrip" })
        })

        expect(result).toEqual({ test: "roundtrip" })
    })

    test("supports cross-channel communication (ping -> pong)", async () => {
        const result = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Timed out")), 2000)

            host.addEventListener("pong", (e) => {
                clearTimeout(timeout)
                resolve(e.data)
            })

            host.postMessage("ping", "hello")
        })

        expect(result).toEqual({ got: "hello" })
    })

    test("throws on reserved channel names", () => {
        expect(() => host.postMessage("message", "test")).toThrow("reserved")
        expect(() => host.postMessage("error", "test")).toThrow("reserved")
        expect(() => host.postMessage("messageerror", "test")).toThrow("reserved")
    })
})

describe("RPC via callMethod", () => {
    let host

    beforeEach(() => {
        host = new ChannelWorkerHost(
            new URL("./fixtures/rpc-worker.js", import.meta.url).href
        )
    })

    afterEach(() => {
        host.terminate()
    })

    test("calls a sync method and returns the result", async () => {
        const result = await host.callMethod("add", 3, 4)
        expect(result).toBe(7)
    })

    test("calls a method that returns a string", async () => {
        const result = await host.callMethod("greet", "world")
        expect(result).toBe("hello world")
    })

    test("calls a method that returns an object", async () => {
        const result = await host.callMethod("getObject")
        expect(result).toEqual({ status: "ok", items: [1, 2, 3] })
    })

    test("calls an async method and awaits its result", async () => {
        const result = await host.callMethod("asyncDouble", 21)
        expect(result).toBe(42)
    })

    test("rejects when method throws synchronously", async () => {
        await expect(host.callMethod("throwError")).rejects.toThrow("intentional explosion")
    })

    test("rejects when async method throws", async () => {
        await expect(host.callMethod("asyncThrowError")).rejects.toThrow("async intentional explosion")
    })

    test("rejects when calling a method that does not exist", async () => {
        await expect(host.callMethod("nonExistentMethod")).rejects.toThrow("not found")
    })

    test("returns undefined for void methods", async () => {
        const result = await host.callMethod("returnVoid")
        expect(result).toBeUndefined()
    })

    test("handles multiple concurrent RPC calls", async () => {
        const [a, b, c] = await Promise.all([
            host.callMethod("add", 1, 2),
            host.callMethod("greet", "bun"),
            host.callMethod("asyncDouble", 5),
        ])

        expect(a).toBe(3)
        expect(b).toBe("hello bun")
        expect(c).toBe(10)
    })
})
