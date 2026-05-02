import { ChannelWorkerClient } from "../../src/lib/channel-worker/ChannelWorker.js"

class RPCTestWorker extends ChannelWorkerClient {
    constructor() {
        super(self)
    }

    add(a, b) {
        return a + b
    }

    greet(name) {
        return `hello ${name}`
    }

    getObject() {
        return { status: "ok", items: [1, 2, 3] }
    }

    async asyncDouble(n) {
        // simulate async work
        await new Promise(resolve => setTimeout(resolve, 10))
        return n * 2
    }

    throwError() {
        throw new Error("intentional explosion")
    }

    async asyncThrowError() {
        await new Promise(resolve => setTimeout(resolve, 10))
        throw new Error("async intentional explosion")
    }

    returnVoid() {
        // does nothing, returns undefined
    }
}

new RPCTestWorker()
