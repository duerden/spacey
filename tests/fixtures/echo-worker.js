import { ChannelWorkerClient } from "../../src/lib/channel-worker/ChannelWorker.js"

const client = new ChannelWorkerClient(self)

// echo back any message on the "echo" channel
self.addEventListener("echo", (e) => {
    client.postMessage("echo", e.data)
})

// respond on a different channel than what was sent
self.addEventListener("ping", (e) => {
    client.postMessage("pong", { got: e.data })
})
