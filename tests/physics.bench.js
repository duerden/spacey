import { Vector2 } from "../src/thread-server/Vector2.js"
import {
    World, PointEntity, ThingEntity, ForcesEntity,
    ForceFieldEntity, DynamicShipEntity, LAYERS
} from "../src/thread-server/Physics.js"

// ============================================================
// Config
// ============================================================

const HZ = 128 // must match Server.js tick rate
const TICK_BUDGET_MS = 1000 / HZ

const WARMUP_STEPS = 50
const BENCH_STEPS = 500

// ============================================================
// Helpers
// ============================================================

function formatTime(ms) {
    if (ms < 0.001) return `${(ms * 1_000_000).toFixed(0)} ns`
    if (ms < 1) return `${(ms * 1000).toFixed(2)} µs`
    return `${ms.toFixed(3)} ms`
}

function formatRate(msPerStep) {
    const stepsPerSec = 1000 / msPerStep
    return `${Math.round(stepsPerSec).toLocaleString()} steps/s`
}

function formatBudget(msPerStep) {
    const pct = (msPerStep / TICK_BUDGET_MS) * 100
    if (pct < 1) return `${pct.toFixed(2)}%`
    if (pct < 10) return `${pct.toFixed(1)}%`
    return `${Math.round(pct)}%`
}

function bench(label, setupFn) {
    const world = setupFn()
    world.start()

    // Warmup
    for (let i = 0; i < WARMUP_STEPS; i++) {
        world.step(1)
    }

    // Bench
    const start = performance.now()
    for (let i = 0; i < BENCH_STEPS; i++) {
        world.step(1)
    }
    const elapsed = performance.now() - start
    const perStep = elapsed / BENCH_STEPS

    return { label, elapsed, perStep, steps: BENCH_STEPS }
}

function printResults(sectionTitle, results) {
    console.log(`\n  ${sectionTitle}`)
    console.log(`  ${"Scenario".padEnd(50)} ${"per step".padStart(12)}  ${"rate".padStart(16)}  ${"budget".padStart(8)}`)
    console.log(`  ${"-".repeat(50)} ${"-".repeat(12)}  ${"-".repeat(16)}  ${"-".repeat(8)}`)
    for (const r of results) {
        console.log(`  ${r.label.padEnd(50)} ${formatTime(r.perStep).padStart(12)}  ${formatRate(r.perStep).padStart(16)}  ${formatBudget(r.perStep).padStart(8)}`)
    }
}

// ============================================================
// Scenario builders
// ============================================================

function makePointEntities(n) {
    const world = new World(1)
    for (let i = 0; i < n; i++) {
        world.addEntity(new PointEntity({
            x: Math.random() * 1000,
            y: Math.random() * 1000,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
        }))
    }
    return world
}

function makeThingEntities(n) {
    const world = new World(1)
    for (let i = 0; i < n; i++) {
        world.addEntity(new ThingEntity({
            x: Math.random() * 1000,
            y: Math.random() * 1000,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            dr: (Math.random() - 0.5) * 0.1,
        }))
    }
    return world
}

function makeForcesEntities(n) {
    const world = new World(1)
    for (let i = 0; i < n; i++) {
        const e = new ForcesEntity({
            x: Math.random() * 1000,
            y: Math.random() * 1000,
            maxSpeed: 10,
        })
        e.addForce("push", new Vector2(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
        ), Math.random() > 0.5)
        world.addEntity(e)
    }
    return world
}

function makeForcesInField(entityCount, fieldCount) {
    const world = new World(1)

    for (let i = 0; i < fieldCount; i++) {
        world.addEntity(new ForceFieldEntity({
            x: Math.random() * 500,
            y: Math.random() * 500,
            radius: 1000, // large radius so most entities are affected
            strength: 10,
            affectsLayers: LAYERS.DEFAULT,
        }))
    }

    for (let i = 0; i < entityCount; i++) {
        world.addEntity(new ForcesEntity({
            x: Math.random() * 500,
            y: Math.random() * 500,
            layer: LAYERS.DEFAULT,
            maxSpeed: 50,
        }))
    }

    return world
}

function makeDynamicShips(n) {
    const world = new World(1)
    for (let i = 0; i < n; i++) {
        const ship = new DynamicShipEntity({
            x: Math.random() * 1000,
            y: Math.random() * 1000,
            maxSpeed: 10,
            maxDr: 1,
            dampLinear: 0.01,
            dampAngular: 0.003,
            thrusters: [
                { name: "fwd",  offset: new Vector2(0, 0),   angle: 0,       maxThrust: 0.01 },
                { name: "rvs",  offset: new Vector2(0, 0),   angle: Math.PI, maxThrust: 0.01 },
                { name: "rotL", offset: new Vector2(-1, 0),  angle: 0,       maxThrust: 0.001 },
                { name: "rotR", offset: new Vector2(1, 0),   angle: 0,       maxThrust: 0.001 },
            ]
        })
        // Randomly activate some thrusters
        if (Math.random() > 0.5) ship.setThruster("fwd", true)
        if (Math.random() > 0.7) ship.setThruster("rotL", true)
        if (Math.random() > 0.7) ship.setThruster("rotR", true)
        if (Math.random() > 0.8) ship.setInertiaDamp(true)
        world.addEntity(ship)
    }
    return world
}

function makeParentedEntities(parentCount, childrenPerParent) {
    const world = new World(1)
    for (let i = 0; i < parentCount; i++) {
        const parent = new ThingEntity({
            x: Math.random() * 1000,
            y: Math.random() * 1000,
            vx: (Math.random() - 0.5),
            vy: (Math.random() - 0.5),
            dr: (Math.random() - 0.5) * 0.1,
        })
        world.addEntity(parent)

        for (let j = 0; j < childrenPerParent; j++) {
            world.addEntity(new PointEntity({
                parent,
                offsetX: (Math.random() - 0.5) * 20,
                offsetY: (Math.random() - 0.5) * 20,
            }))
        }
    }
    return world
}

function makeMixedScene(ships, fields, debris) {
    const world = new World(1)

    for (let i = 0; i < fields; i++) {
        world.addEntity(new ForceFieldEntity({
            x: Math.random() * 2000,
            y: Math.random() * 2000,
            radius: 800,
            strength: 20,
            affectsLayers: LAYERS.SHIPS | LAYERS.DEBRIS,
        }))
    }

    for (let i = 0; i < ships; i++) {
        const ship = new DynamicShipEntity({
            x: Math.random() * 2000,
            y: Math.random() * 2000,
            layer: LAYERS.SHIPS,
            maxSpeed: 10,
            maxDr: 1,
            dampLinear: 0.01,
            dampAngular: 0.003,
            thrusters: [
                { name: "fwd", offset: new Vector2(0, 0), angle: 0, maxThrust: 0.01 },
                { name: "rotL", offset: new Vector2(-1, 0), angle: 0, maxThrust: 0.001 },
                { name: "rotR", offset: new Vector2(1, 0), angle: 0, maxThrust: 0.001 },
            ]
        })
        if (Math.random() > 0.5) ship.setThruster("fwd", true)
        world.addEntity(ship)

        // Give ship a parented shield
        world.addEntity(new ForceFieldEntity({
            parent: ship,
            radius: 30,
            strength: -5,
            affectsLayers: LAYERS.DEBRIS,
        }))
    }

    for (let i = 0; i < debris; i++) {
        world.addEntity(new ForcesEntity({
            x: Math.random() * 2000,
            y: Math.random() * 2000,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            layer: LAYERS.DEBRIS,
            maxSpeed: 20,
        }))
    }

    return world
}

// ============================================================
// Main
// ============================================================

async function main() {
    console.log(`\nPhysics Engine Benchmark (${BENCH_STEPS} steps each, ${WARMUP_STEPS} warmup, tick budget: ${TICK_BUDGET_MS.toFixed(2)}ms @ ${HZ}Hz)\n`)

    // --- Basic entity stepping ---
    printResults("PointEntity (position + velocity only)", [
        bench("10 entities",    () => makePointEntities(10)),
        bench("100 entities",   () => makePointEntities(100)),
        bench("1,000 entities", () => makePointEntities(1000)),
        bench("10,000 entities",() => makePointEntities(10000)),
    ])

    printResults("ThingEntity (position + velocity + rotation)", [
        bench("10 entities",    () => makeThingEntities(10)),
        bench("100 entities",   () => makeThingEntities(100)),
        bench("1,000 entities", () => makeThingEntities(1000)),
        bench("10,000 entities",() => makeThingEntities(10000)),
    ])

    printResults("ForcesEntity (with 1 named force each)", [
        bench("10 entities",    () => makeForcesEntities(10)),
        bench("100 entities",   () => makeForcesEntities(100)),
        bench("1,000 entities", () => makeForcesEntities(1000)),
        bench("10,000 entities",() => makeForcesEntities(10000)),
    ])

    // --- Force field interactions (O(n*m)) ---
    printResults("ForceField interactions (all entities in range)", [
        bench("100 entities, 1 field",     () => makeForcesInField(100, 1)),
        bench("100 entities, 5 fields",    () => makeForcesInField(100, 5)),
        bench("1,000 entities, 1 field",   () => makeForcesInField(1000, 1)),
        bench("1,000 entities, 5 fields",  () => makeForcesInField(1000, 5)),
        bench("1,000 entities, 10 fields", () => makeForcesInField(1000, 10)),
        bench("10,000 entities, 1 field",  () => makeForcesInField(10000, 1)),
        bench("10,000 entities, 5 fields", () => makeForcesInField(10000, 5)),
    ])

    // --- DynamicShipEntity ---
    printResults("DynamicShipEntity (thrusters + dampening)", [
        bench("10 ships",    () => makeDynamicShips(10)),
        bench("100 ships",   () => makeDynamicShips(100)),
        bench("1,000 ships", () => makeDynamicShips(1000)),
    ])

    // --- Parenting overhead ---
    printResults("Parenting (parent sync each tick)", [
        bench("100 parents, 1 child each",   () => makeParentedEntities(100, 1)),
        bench("100 parents, 5 children each", () => makeParentedEntities(100, 5)),
        bench("100 parents, 10 children each",() => makeParentedEntities(100, 10)),
        bench("1,000 parents, 3 children each", () => makeParentedEntities(1000, 3)),
    ])

    // --- Realistic mixed scene ---
    printResults("Mixed scene (ships w/ shields + debris + gravity)", [
        bench("10 ships, 2 fields, 50 debris",      () => makeMixedScene(10, 2, 50)),
        bench("50 ships, 3 fields, 200 debris",     () => makeMixedScene(50, 3, 200)),
        bench("100 ships, 5 fields, 500 debris",    () => makeMixedScene(100, 5, 500)),
        bench("100 ships, 5 fields, 2000 debris",   () => makeMixedScene(100, 5, 2000)),
        bench("200 ships, 10 fields, 5000 debris",  () => makeMixedScene(200, 10, 5000)),
    ])

    console.log("")
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
