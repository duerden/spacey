import { ChannelWorkerHost } from "../src/lib/channel-worker/ChannelWorker.js"

const ITERATIONS = 5000

// --- Payloads ---
// Simple object: flat primitives only — eligible for Bun's simple object fast path
// when sent raw via postMessage (but NOT when wrapped in a channel envelope)
const simplePayload = {
    name: "benchmark",
    count: 42,
    enabled: true,
    tag: "hello world",
}

// Complex object: nested structures, Date, etc — always uses structured clone
const complexPayload = {
    name: "benchmark",
    nested: { deep: { value: 123 } },
    items: [1, 2, 3, 4, 5],
    timestamp: new Date().toISOString(),
    metadata: { tags: ["perf", "test"], version: 2 },
}

// String payload — eligible for Bun's string fast path when sent raw
const stringPayload = "hello world benchmark payload string"

// --- Helpers ---
function formatRate(ms, iterations) {
    const perSec = Math.round(iterations / (ms / 1000))
    return `${perSec.toLocaleString()} msg/s`
}

function formatTime(ms, iterations) {
    const perMsg = (ms / iterations * 1000).toFixed(2)
    return `${perMsg} µs/msg`
}

async function benchRoundtrip(label, host, sendFn, listenEvent, iterations) {
    // warmup
    for (let i = 0; i < 50; i++) {
        await new Promise(resolve => {
            const handler = () => {
                host.removeEventListener(listenEvent, handler)
                resolve()
            }
            host.addEventListener(listenEvent, handler)
            sendFn()
        })
    }

    // actual benchmark: blast all messages and count responses
    let received = 0
    const start = performance.now()

    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`${label}: timed out`)), 30000)

        const handler = () => {
            received++
            if (received >= iterations) {
                host.removeEventListener(listenEvent, handler)
                clearTimeout(timeout)
                resolve()
            }
        }
        host.addEventListener(listenEvent, handler)

        for (let i = 0; i < iterations; i++) {
            sendFn()
        }
    })

    const elapsed = performance.now() - start
    console.log(`  ${label.padEnd(40)} ${formatTime(elapsed, iterations).padStart(12)}  ${formatRate(elapsed, iterations).padStart(14)}`)
    return elapsed
}

// --- Main ---
async function main() {
    const host = new ChannelWorkerHost(
        new URL("./fixtures/bench-worker.js", import.meta.url).href
    )

    // Wait for worker to be ready
    await new Promise(resolve => host.addEventListener("open", resolve))

    console.log(`\nChannelWorker Benchmark (${ITERATIONS} round-trips each)\n`)
    console.log(`  ${"Test".padEnd(40)} ${"Latency".padStart(12)}  ${"Throughput".padStart(14)}`)
    console.log(`  ${"-".repeat(40)} ${"-".repeat(12)}  ${"-".repeat(14)}`)

    // --- Raw postMessage baselines (no channel routing) ---
    // These hit Bun's fast paths directly

    await benchRoundtrip(
        "raw postMessage (string)",
        host,
        () => Worker.prototype.postMessage.call(host, stringPayload),
        "message",
        ITERATIONS
    )

    await benchRoundtrip(
        "raw postMessage (simple object)",
        host,
        () => Worker.prototype.postMessage.call(host, simplePayload),
        "message",
        ITERATIONS
    )

    await benchRoundtrip(
        "raw postMessage (complex object)",
        host,
        () => Worker.prototype.postMessage.call(host, complexPayload),
        "message",
        ITERATIONS
    )

    console.log(`  ${"-".repeat(40)} ${"-".repeat(12)}  ${"-".repeat(14)}`)

    // --- ChannelWorker (always wraps in { channel, message } object) ---

    await benchRoundtrip(
        "channeled (simple object payload)",
        host,
        () => host.postMessage("bench", simplePayload),
        "bench",
        ITERATIONS
    )

    await benchRoundtrip(
        "channeled (complex object payload)",
        host,
        () => host.postMessage("bench", complexPayload),
        "bench",
        ITERATIONS
    )

    await benchRoundtrip(
        "channeled (string payload)",
        host,
        () => host.postMessage("bench", stringPayload),
        "bench",
        ITERATIONS
    )

    console.log("")
    host.terminate()
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
