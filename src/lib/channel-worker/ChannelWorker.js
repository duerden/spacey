
const CHANNELWORKER_CHANNEL = "channelworker_internal"
const RPC_CHANNEL = "channelworker_rpc"
const RPC_RESPONSE_CHANNEL = "channelworker_rpc_response"
const BAD_CHANNEL_NAMES = [
    "message",
    "error",
    "messageerror", //wtf is this naming
    CHANNELWORKER_CHANNEL,
    RPC_CHANNEL,
    RPC_RESPONSE_CHANNEL
]

class ChannelRouter {
    channels = new Set([CHANNELWORKER_CHANNEL])

    constructor(txFn, rxFn){
        this.txFn = txFn //postMessage to other side
        this.rxFn = rxFn //emit new MessageEvent
    }

    #addRegisteredChannel(c) {
        if (!this.channels.has(c)) {
            this.channels.add(c)
            this.txFn({
                channel: CHANNELWORKER_CHANNEL,
                message: { type: "newchannel", channel: c }
            })
        }
    }

    postMessage(channel, message, ...slop) {
        if (BAD_CHANNEL_NAMES.includes(channel)){
            throw new Error(`You cannot use ${channel} as a channel name, as it is reserved.`)
        }
        this.#addRegisteredChannel(channel)
        return this.txFn({ channel, message }, ...slop)
    }

    onUnchanneledMessage(event) {
        const { data } = event
        if (data.message && data.channel) {
            this.rxFn(new MessageEvent(data.channel, {
                data: data.message,
                origin: event.origin,
                lastEventId: event.lastEventId,
                source: event.source,
                ports: event.ports
            }))
        }
    }
}

// spawns a channelworker
class ChannelWorkerHost extends Worker {
    #rpcId = 0
    #rpcPending = new Map()

    constructor(...a){
        super(...a)
        this.router = new ChannelRouter(
            (...args) => super.postMessage(...args),
            (event) => this.dispatchEvent(event)
        )
        this.addEventListener("message", (e) => this.router.onUnchanneledMessage(e))

        // listen for RPC responses from the client
        this.addEventListener(RPC_RESPONSE_CHANNEL, (e) => {
            const { id, result, error } = e.data
            const pending = this.#rpcPending.get(id)
            if (pending) {
                this.#rpcPending.delete(id)
                if (error) {
                    pending.reject(new Error(error))
                } else {
                    pending.resolve(result)
                }
            }
        })
    }

    postMessage(channel, message, ...slop) {
        return this.router.postMessage(channel, message, ...slop)
    }

    callMethod(method, ...args) {
        const id = this.#rpcId++
        return new Promise((resolve, reject) => {
            this.#rpcPending.set(id, { resolve, reject })
            super.postMessage({
                channel: RPC_CHANNEL,
                message: { id, method, args }
            })
        })
    }
}

// each worker extends this, rather than instantiating it
// is it weird? kinda
// wraps self: Worker
class ChannelWorkerClient {
    constructor(worker){ //new ChannelWorkerClient(self)
        this.worker = worker //`this.worker === self`
        this.router = new ChannelRouter(
            (...args) => worker.postMessage(...args),
            (event) => worker.dispatchEvent(event)
        )
        worker.addEventListener("message", (e) => this.router.onUnchanneledMessage(e))

        // listen for RPC calls from the host
        worker.addEventListener(RPC_CHANNEL, async (e) => {
            const { id, method, args } = e.data
            try {
                if (typeof this[method] !== "function") {
                    throw new Error(`Method "${method}" not found on worker`)
                }
                const result = await this[method](...args)
                worker.postMessage({
                    channel: RPC_RESPONSE_CHANNEL,
                    message: { id, result }
                })
            } catch (err) {
                worker.postMessage({
                    channel: RPC_RESPONSE_CHANNEL,
                    message: { id, error: err.message || String(err) }
                })
            }
        })
    }

    postMessage(channel, message, ...slop) {
        return this.router.postMessage(channel, message, ...slop)
    }
}

export { ChannelRouter, ChannelWorkerHost, ChannelWorkerClient, CHANNELWORKER_CHANNEL, BAD_CHANNEL_NAMES }
