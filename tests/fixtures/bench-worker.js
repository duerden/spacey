import { ChannelWorkerClient } from "../../src/lib/channel-worker/ChannelWorker.js"

const client = new ChannelWorkerClient(self)

// echo back on the same channel, regardless of content
self.addEventListener("bench", (e) => {
    client.postMessage("bench", e.data)
})

// raw echo without channel routing (for baseline comparison)
self.addEventListener("message", (e) => {
    // only handle raw messages (no channel wrapper)
    if (!e.data?.channel) {
        self.postMessage(e.data)
    }
})
