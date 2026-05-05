import { test, expect, describe } from "bun:test"
import { Vector2 } from "../src/thread-server/Vector2.js"
import {
    World, PointEntity, ThingEntity, ForcesEntity,
    ForceFieldEntity, DynamicShipEntity, LAYERS
} from "../src/thread-server/Physics.js"
import { FlightComputer } from "../src/thread-server/FlightComputer.js"

// ============================================================
// Helpers
// ============================================================

function stepN(world, n, dt = 1) {
    for (let i = 0; i < n; i++) {
        world.step(dt)
    }
}

function makeWorld(...entities) {
    const world = new World(1)
    world.addEntity(...entities)
    world.start()
    return world
}

// ============================================================
// Vector2
// ============================================================

describe("Vector2", () => {
    test("add returns sum of two vectors", () => {
        const a = new Vector2(1, 2)
        const b = new Vector2(3, 4)
        const c = a.add(b)
        expect(c.x).toBe(4)
        expect(c.y).toBe(6)
    })

    test("sub returns difference", () => {
        const a = new Vector2(5, 7)
        const b = new Vector2(2, 3)
        const c = a.sub(b)
        expect(c.x).toBe(3)
        expect(c.y).toBe(4)
    })

    test("scale multiplies both components", () => {
        const v = new Vector2(3, 4).scale(2)
        expect(v.x).toBe(6)
        expect(v.y).toBe(8)
    })

    test("length computes magnitude", () => {
        expect(new Vector2(3, 4).length()).toBe(5)
        expect(new Vector2(0, 0).length()).toBe(0)
    })

    test("lengthSq avoids sqrt", () => {
        expect(new Vector2(3, 4).lengthSq()).toBe(25)
    })

    test("normalize returns unit vector", () => {
        const v = new Vector2(0, 5).normalize()
        expect(v.x).toBeCloseTo(0)
        expect(v.y).toBeCloseTo(1)
    })

    test("normalize of zero vector returns zero", () => {
        const v = new Vector2(0, 0).normalize()
        expect(v.x).toBe(0)
        expect(v.y).toBe(0)
    })

    test("dot product", () => {
        expect(new Vector2(1, 0).dot(new Vector2(0, 1))).toBe(0)
        expect(new Vector2(2, 3).dot(new Vector2(4, 5))).toBe(23)
    })

    test("cross product (2D scalar)", () => {
        // cross of (1,0) x (0,1) = 1 (right-hand rule)
        expect(new Vector2(1, 0).cross(new Vector2(0, 1))).toBe(1)
        expect(new Vector2(0, 1).cross(new Vector2(1, 0))).toBe(-1)
    })

    test("rotate by 90 degrees", () => {
        const v = new Vector2(1, 0).rotate(Math.PI / 2)
        expect(v.x).toBeCloseTo(0)
        expect(v.y).toBeCloseTo(1)
    })

    test("rotate by 180 degrees", () => {
        const v = new Vector2(1, 0).rotate(Math.PI)
        expect(v.x).toBeCloseTo(-1)
        expect(v.y).toBeCloseTo(0)
    })

    test("fromAngle(0) points up (negative y)", () => {
        const v = Vector2.fromAngle(0)
        expect(v.x).toBeCloseTo(0)
        expect(v.y).toBeCloseTo(-1)
    })

    test("fromAngle(PI/2) points right", () => {
        const v = Vector2.fromAngle(Math.PI / 2)
        expect(v.x).toBeCloseTo(1)
        expect(v.y).toBeCloseTo(0)
    })

    test("clone creates independent copy", () => {
        const a = new Vector2(1, 2)
        const b = a.clone()
        b.x = 99
        expect(a.x).toBe(1)
    })

    test("operations are immutable (don't modify original)", () => {
        const a = new Vector2(1, 2)
        a.add(new Vector2(10, 10))
        expect(a.x).toBe(1)
        expect(a.y).toBe(2)

        a.scale(5)
        expect(a.x).toBe(1)

        a.rotate(Math.PI)
        expect(a.x).toBe(1)
    })
})

// ============================================================
// PointEntity - linear motion
// ============================================================

describe("PointEntity", () => {
    test("starts at given position", () => {
        const e = new PointEntity({ x: 10, y: 20 })
        expect(e.pos.x).toBe(10)
        expect(e.pos.y).toBe(20)
    })

    test("moves linearly with constant velocity", () => {
        const e = new PointEntity({ x: 0, y: 0, vx: 1, vy: 0 })
        const world = makeWorld(e)

        stepN(world, 64)

        expect(e.pos.x).toBe(64)
        expect(e.pos.y).toBe(0)
    })

    test("moves in both axes simultaneously", () => {
        const e = new PointEntity({ x: 0, y: 0, vx: 2, vy: -3 })
        const world = makeWorld(e)

        stepN(world, 10)

        expect(e.pos.x).toBe(20)
        expect(e.pos.y).toBe(-30)
    })

    test("zero velocity means no movement", () => {
        const e = new PointEntity({ x: 5, y: 5 })
        const world = makeWorld(e)

        stepN(world, 100)

        expect(e.pos.x).toBe(5)
        expect(e.pos.y).toBe(5)
    })

    test("respects dt scaling", () => {
        const e = new PointEntity({ x: 0, y: 0, vx: 1, vy: 0 })
        const world = makeWorld(e)

        // 10 ticks at dt=0.5 should be same as 5 ticks at dt=1
        stepN(world, 10, 0.5)

        expect(e.pos.x).toBeCloseTo(5)
    })

    test("serialisation getters expose x/y/vx/vy", () => {
        const e = new PointEntity({ x: 3, y: 7, vx: 1, vy: 2 })
        expect(e.x).toBe(3)
        expect(e.y).toBe(7)
        expect(e.vx).toBe(1)
        expect(e.vy).toBe(2)
    })
})

// ============================================================
// ThingEntity - rotation
// ============================================================

describe("ThingEntity", () => {
    test("rotates with constant angular velocity", () => {
        const e = new ThingEntity({ dr: Math.PI / 4 }) // 45 deg/tick
        const world = makeWorld(e)

        stepN(world, 4)

        expect(e.r).toBeCloseTo(Math.PI) // 4 * 45 = 180 degrees
    })

    test("rotation and translation are independent", () => {
        const e = new ThingEntity({ x: 0, y: 0, vx: 1, vy: 0, dr: 0.1 })
        const world = makeWorld(e)

        stepN(world, 10)

        expect(e.pos.x).toBe(10)
        expect(e.r).toBeCloseTo(1.0) // 10 * 0.1
    })

    test("zero angular velocity means no rotation", () => {
        const e = new ThingEntity({ r: 1.5 })
        const world = makeWorld(e)

        stepN(world, 50)

        expect(e.r).toBe(1.5)
    })
})

// ============================================================
// ForcesEntity - named forces
// ============================================================

describe("ForcesEntity", () => {
    test("accelerates from a constant absolute force", () => {
        const e = new ForcesEntity({})
        e.addForce("push", new Vector2(1, 0), false) // absolute: +x
        const world = makeWorld(e)

        stepN(world, 10)

        // Velocity should be 10 (1 per tick * 10 ticks with dt=1)
        // Position = sum(1..10) = 0+1+2+...+9 = 45? No:
        // Each tick: vel += force*dt, then pos += vel*dt
        // tick 1: vel=1, pos=1
        // tick 2: vel=2, pos=3
        // tick n: vel=n, pos=n(n+1)/2
        expect(e.vel.x).toBeCloseTo(10)
        expect(e.pos.x).toBeCloseTo(55) // sum 1..10 = 55
    })

    test("relative force rotates with entity", () => {
        // Entity facing right (r = PI/2), relative force "forward" (angle 0 = up/-y)
        const e = new ForcesEntity({ r: Math.PI / 2 })
        // A relative force of (0, -1) in local space
        // When rotated by PI/2, should become (−1, 0)... wait let me think.
        // Actually let's use a simpler test: force is (1, 0) relative.
        // Rotated by PI/2: (1,0).rotate(PI/2) = (0, 1)
        e.addForce("thrust", new Vector2(1, 0), true)
        const world = makeWorld(e)

        stepN(world, 1)

        // Force (1,0) rotated by PI/2 = (0, 1), applied for dt=1
        expect(e.vel.x).toBeCloseTo(0)
        expect(e.vel.y).toBeCloseTo(1)
    })

    test("multiple forces combine additively", () => {
        const e = new ForcesEntity({})
        e.addForce("a", new Vector2(1, 0))
        e.addForce("b", new Vector2(0, 2))
        const world = makeWorld(e)

        stepN(world, 1)

        expect(e.vel.x).toBeCloseTo(1)
        expect(e.vel.y).toBeCloseTo(2)
    })

    test("removing a force stops its contribution", () => {
        const e = new ForcesEntity({})
        e.addForce("push", new Vector2(1, 0))
        const world = makeWorld(e)

        stepN(world, 5)
        e.removeForce("push")
        const velAfterRemove = e.vel.x
        stepN(world, 5)

        // Velocity should not change after removal (no friction)
        expect(e.vel.x).toBeCloseTo(velAfterRemove)
        // But position should still advance (coasting)
        expect(e.pos.x).toBeGreaterThan(0)
    })

    test("speed is clamped to maxSpeed", () => {
        const e = new ForcesEntity({ maxSpeed: 5 })
        e.addForce("push", new Vector2(10, 0)) // very strong force
        const world = makeWorld(e)

        stepN(world, 100)

        expect(e.vel.length()).toBeCloseTo(5)
    })

    test("angular velocity is clamped to maxDr", () => {
        const maxDr = 0.5
        const e = new ForcesEntity({ maxDr, dr: 10 })
        const world = makeWorld(e)

        stepN(world, 1)

        expect(Math.abs(e.dr)).toBeLessThanOrEqual(maxDr + 1e-10)
    })

    test("clearForces removes all forces", () => {
        const e = new ForcesEntity({})
        e.addForce("a", new Vector2(1, 0))
        e.addForce("b", new Vector2(0, 1))
        e.clearForces()
        const world = makeWorld(e)

        stepN(world, 5)

        expect(e.vel.x).toBe(0)
        expect(e.vel.y).toBe(0)
    })
})

// ============================================================
// ForceFieldEntity - gravitational/repulsive fields
// ============================================================

describe("ForceFieldEntity", () => {
    test("attracts entities within radius", () => {
        const field = new ForceFieldEntity({
            x: 0, y: 0,
            radius: 100,
            strength: 100,
            affectsLayers: LAYERS.SHIPS
        })
        const ship = new ForcesEntity({ x: 50, y: 0, layer: LAYERS.SHIPS })
        const world = makeWorld(field, ship)

        stepN(world, 1)

        // Ship should be pulled toward field (negative x direction)
        expect(ship.vel.x).toBeLessThan(0)
    })

    test("repels entities with negative strength", () => {
        const field = new ForceFieldEntity({
            x: 0, y: 0,
            radius: 100,
            strength: -100,
            affectsLayers: LAYERS.SHIPS
        })
        const ship = new ForcesEntity({ x: 50, y: 0, layer: LAYERS.SHIPS })
        const world = makeWorld(field, ship)

        stepN(world, 1)

        // Ship should be pushed away (positive x direction)
        expect(ship.vel.x).toBeGreaterThan(0)
    })

    test("does not affect entities outside radius", () => {
        const field = new ForceFieldEntity({
            x: 0, y: 0,
            radius: 10,
            strength: 1000,
            affectsLayers: LAYERS.SHIPS
        })
        const ship = new ForcesEntity({ x: 50, y: 0, layer: LAYERS.SHIPS })
        const world = makeWorld(field, ship)

        stepN(world, 10)

        expect(ship.vel.x).toBe(0)
        expect(ship.vel.y).toBe(0)
    })

    test("does not affect entities on different layers", () => {
        const field = new ForceFieldEntity({
            x: 0, y: 0,
            radius: 100,
            strength: 1000,
            affectsLayers: LAYERS.DEBRIS // only affects debris
        })
        const ship = new ForcesEntity({ x: 50, y: 0, layer: LAYERS.SHIPS })
        const world = makeWorld(field, ship)

        stepN(world, 10)

        expect(ship.vel.x).toBe(0)
        expect(ship.vel.y).toBe(0)
    })

    test("force is stronger at closer distances (inverse square)", () => {
        const field = new ForceFieldEntity({
            x: 0, y: 0,
            radius: 200,
            strength: 100,
            affectsLayers: LAYERS.DEFAULT
        })
        const close = new ForcesEntity({ x: 10, y: 0, layer: LAYERS.DEFAULT })
        const far = new ForcesEntity({ x: 100, y: 0, layer: LAYERS.DEFAULT })
        const world = makeWorld(field, close, far)

        stepN(world, 1)

        // Close entity should experience much stronger force
        expect(Math.abs(close.vel.x)).toBeGreaterThan(Math.abs(far.vel.x))
    })

    test("entity orbits around field (doesn't just fall in)", () => {
        // Give entity tangential velocity - it should curve, not fall straight in
        const field = new ForceFieldEntity({
            x: 0, y: 0,
            radius: 1000,
            strength: 50,
            affectsLayers: LAYERS.DEFAULT
        })
        const orbiter = new ForcesEntity({ x: 100, y: 0, vx: 0, vy: 0.5, layer: LAYERS.DEFAULT })
        const world = makeWorld(field, orbiter)

        stepN(world, 100)

        // After many ticks, entity should have moved in y AND x (curved path)
        // and should still be roughly orbiting (distance from center shouldn't collapse to zero)
        const dist = orbiter.pos.length()
        expect(dist).toBeGreaterThan(10) // hasn't collapsed into center
        expect(orbiter.pos.y).not.toBeCloseTo(0, 0) // has moved off x-axis
    })
})

// ============================================================
// Layers
// ============================================================

describe("Layers", () => {
    test("bitmask values are distinct powers of 2", () => {
        const values = Object.values(LAYERS)
        for (let i = 0; i < values.length; i++) {
            for (let j = i + 1; j < values.length; j++) {
                expect(values[i] & values[j]).toBe(0)
            }
        }
    })

    test("entity can match multiple layers via OR", () => {
        const field = new ForceFieldEntity({
            x: 0, y: 0,
            radius: 100,
            strength: 100,
            affectsLayers: LAYERS.SHIPS | LAYERS.DEBRIS
        })

        const ship = new ForcesEntity({ x: 50, y: 0, layer: LAYERS.SHIPS })
        const debris = new ForcesEntity({ x: 50, y: 0, layer: LAYERS.DEBRIS })
        const shield = new ForcesEntity({ x: 50, y: 0, layer: LAYERS.SHIELDS })

        const world = makeWorld(field, ship, debris, shield)
        stepN(world, 1)

        // Ship and debris affected, shield not
        expect(ship.vel.x).toBeLessThan(0)
        expect(debris.vel.x).toBeLessThan(0)
        expect(shield.vel.x).toBe(0)
    })
})

// ============================================================
// Parenting
// ============================================================

describe("Parenting", () => {
    test("child follows parent position with no offset", () => {
        const parent = new ForcesEntity({ x: 0, y: 0, vx: 1, vy: 0 })
        const child = new PointEntity({ parent, offsetX: 0, offsetY: 0 })
        const world = makeWorld(parent, child)

        stepN(world, 10)

        expect(child.pos.x).toBeCloseTo(parent.pos.x)
        expect(child.pos.y).toBeCloseTo(parent.pos.y)
    })

    test("child maintains offset from parent", () => {
        const parent = new ForcesEntity({ x: 0, y: 0, vx: 1, vy: 0 })
        const child = new PointEntity({ parent, offsetX: 5, offsetY: 0 })
        const world = makeWorld(parent, child)

        stepN(world, 10)

        // Parent at x=10, child should be at x=15 (offset of 5)
        expect(child.pos.x).toBeCloseTo(parent.pos.x + 5)
        expect(child.pos.y).toBeCloseTo(parent.pos.y)
    })

    test("child offset rotates with parent", () => {
        const parent = new ThingEntity({ x: 0, y: 0, r: Math.PI / 2 }) // facing right
        const child = new PointEntity({ parent, offsetX: 10, offsetY: 0 })
        const world = makeWorld(parent, child)

        stepN(world, 1)

        // Offset (10, 0) rotated by PI/2 = (0, 10)
        expect(child.pos.x).toBeCloseTo(0)
        expect(child.pos.y).toBeCloseTo(10)
    })

    test("parented entity does not move on its own", () => {
        const parent = new PointEntity({ x: 0, y: 0 })
        const child = new PointEntity({ parent, vx: 100, vy: 100 })
        const world = makeWorld(parent, child)

        stepN(world, 10)

        // Despite having velocity, child should be at parent's position
        expect(child.pos.x).toBeCloseTo(0)
        expect(child.pos.y).toBeCloseTo(0)
    })

    test("ForceFieldEntity parented to ship follows it", () => {
        const ship = new ForcesEntity({ x: 0, y: 0, vx: 2, vy: 0 })
        const shield = new ForceFieldEntity({
            parent: ship,
            offsetX: 0, offsetY: 0,
            radius: 50,
            strength: -10,
            affectsLayers: LAYERS.DEBRIS
        })
        const world = makeWorld(ship, shield)

        stepN(world, 5)

        expect(shield.pos.x).toBeCloseTo(ship.pos.x)
        expect(shield.pos.y).toBeCloseTo(ship.pos.y)
    })
})

// ============================================================
// Scale
// ============================================================

describe("Scale", () => {
    test("default scale is 1", () => {
        const e = new PointEntity({})
        expect(e.scale).toBe(1)
    })

    test("scale can be set via constructor", () => {
        const e = new PointEntity({ scale: 0.5 })
        expect(e.scale).toBe(0.5)
    })

    test("scale of 0 is preserved (not defaulted)", () => {
        const e = new PointEntity({ scale: 0 })
        expect(e.scale).toBe(0)
    })

    test("parent scale affects child offset", () => {
        const parent = new ThingEntity({ x: 0, y: 0, scale: 2 })
        const child = new PointEntity({ parent, offsetX: 10, offsetY: 0 })
        const world = makeWorld(parent, child)

        stepN(world, 1)

        // Offset of 10 scaled by parent's 2 = 20
        expect(child.pos.x).toBeCloseTo(20)
        expect(child.pos.y).toBeCloseTo(0)
    })

    test("parent scale + rotation affects child offset", () => {
        const parent = new ThingEntity({ x: 0, y: 0, scale: 2, r: Math.PI / 2 })
        const child = new PointEntity({ parent, offsetX: 10, offsetY: 0 })
        const world = makeWorld(parent, child)

        stepN(world, 1)

        // Offset (10, 0) scaled by 2 = (20, 0), rotated by PI/2 = (0, 20)
        expect(child.pos.x).toBeCloseTo(0)
        expect(child.pos.y).toBeCloseTo(20)
    })

    test("half-scale parent halves child offset", () => {
        const parent = new ThingEntity({ x: 100, y: 0, scale: 0.5 })
        const child = new PointEntity({ parent, offsetX: 20, offsetY: 0 })
        const world = makeWorld(parent, child)

        stepN(world, 1)

        // Offset 20 scaled by 0.5 = 10, added to parent pos 100
        expect(child.pos.x).toBeCloseTo(110)
        expect(child.pos.y).toBeCloseTo(0)
    })

    test("force field radius scales with entity scale", () => {
        // Field at scale 0.5 with radius 100 should only affect entities within 50
        const field = new ForceFieldEntity({
            x: 0, y: 0,
            radius: 100,
            scale: 0.5,
            strength: 100,
            affectsLayers: LAYERS.DEFAULT
        })
        const close = new ForcesEntity({ x: 40, y: 0, layer: LAYERS.DEFAULT })
        const far = new ForcesEntity({ x: 60, y: 0, layer: LAYERS.DEFAULT })
        const world = makeWorld(field, close, far)

        stepN(world, 1)

        // Effective radius is 50. close (40) is in range, far (60) is not.
        expect(close.vel.x).not.toBe(0)
        expect(far.vel.x).toBe(0)
    })

    test("force field at scale 2 doubles effective radius", () => {
        const field = new ForceFieldEntity({
            x: 0, y: 0,
            radius: 50,
            scale: 2,
            strength: 100,
            affectsLayers: LAYERS.DEFAULT
        })
        const entity = new ForcesEntity({ x: 80, y: 0, layer: LAYERS.DEFAULT })
        const world = makeWorld(field, entity)

        stepN(world, 1)

        // Effective radius is 100. Entity at 80 is within range.
        expect(entity.vel.x).not.toBe(0)
    })

    test("scale does not affect velocity or position integration", () => {
        const a = new PointEntity({ x: 0, y: 0, vx: 1, scale: 0.5 })
        const b = new PointEntity({ x: 0, y: 0, vx: 1, scale: 2 })
        const world = makeWorld(a, b)

        stepN(world, 10)

        // Both should move the same distance regardless of scale
        expect(a.pos.x).toBeCloseTo(b.pos.x)
    })
})

// ============================================================
// DynamicShipEntity - thruster model
// ============================================================

describe("DynamicShipEntity", () => {
    function makeShip(thrusters, opts = {}) {
        return new DynamicShipEntity({
            maxSpeed: 10,
            maxDr: 1,
            ...opts,
            thrusters
        })
    }

    test("full throttle on forward thruster accelerates in facing direction", () => {
        const ship = makeShip([
            { name: "fwd", offset: new Vector2(0, 0), angle: 0, maxThrust: 1 }
        ])
        ship.setThrottles([1.0])
        const world = makeWorld(ship)

        stepN(world, 10)

        // Facing 0 (up), so should move in -y direction
        expect(ship.vel.y).toBeLessThan(0)
        expect(Math.abs(ship.vel.x)).toBeLessThan(0.001)
    })

    test("half throttle produces half the acceleration", () => {
        const shipFull = makeShip([
            { name: "fwd", offset: new Vector2(0, 0), angle: 0, maxThrust: 1 }
        ])
        const shipHalf = makeShip([
            { name: "fwd", offset: new Vector2(0, 0), angle: 0, maxThrust: 1 }
        ])
        shipFull.setThrottles([1.0])
        shipHalf.setThrottles([0.5])
        const world = makeWorld(shipFull, shipHalf)

        stepN(world, 10)

        // Half throttle should have roughly half the velocity
        expect(Math.abs(shipHalf.vel.y)).toBeCloseTo(Math.abs(shipFull.vel.y) * 0.5, 1)
    })

    test("ship rotated PI/2 thrusts in +x direction", () => {
        const ship = makeShip([
            { name: "fwd", offset: new Vector2(0, 0), angle: 0, maxThrust: 1 }
        ], { r: Math.PI / 2 })
        ship.setThrottles([1.0])
        const world = makeWorld(ship)

        stepN(world, 10)

        expect(ship.vel.x).toBeGreaterThan(0)
        expect(Math.abs(ship.vel.y)).toBeLessThan(0.01)
    })

    test("offset thruster produces torque", () => {
        const ship = makeShip([
            { name: "rotL", offset: new Vector2(1, 0), angle: 0, maxThrust: 1 }
        ])
        ship.setThrottles([1.0])
        const world = makeWorld(ship)

        stepN(world, 5)

        // cross((1,0), fromAngle(0)) = cross((1,0), (0,-1)) = -1
        expect(ship.dr).toBeLessThan(0)
    })

    test("symmetric thrusters produce no net torque", () => {
        const ship = makeShip([
            { name: "left",  offset: new Vector2(-1, 0), angle: 0, maxThrust: 1 },
            { name: "right", offset: new Vector2(1, 0),  angle: 0, maxThrust: 1 }
        ])
        ship.setThrottles([1.0, 1.0])
        const world = makeWorld(ship)

        stepN(world, 10)

        expect(ship.dr).toBeCloseTo(0)
    })

    test("throttle is clamped to [0, 1]", () => {
        const ship = makeShip([
            { name: "fwd", offset: new Vector2(0, 0), angle: 0, maxThrust: 1 }
        ])
        ship.setThrottles([5.0]) // over 1
        expect(ship.throttles[0]).toBe(1)

        ship.setThrottles([-2.0]) // under 0
        expect(ship.throttles[0]).toBe(0)
    })

    test("asymmetric thruster layout causes drift", () => {
        const ship = makeShip([
            { name: "main", offset: new Vector2(2, 0), angle: 0, maxThrust: 1 }
        ], { maxDr: 10 })
        ship.setThrottles([1.0])
        const world = makeWorld(ship)

        stepN(world, 10)

        expect(ship.vel.length()).toBeGreaterThan(0)
        expect(ship.dr).not.toBeCloseTo(0)
    })

    test("zero throttle stops acceleration (coasts)", () => {
        const ship = makeShip([
            { name: "fwd", offset: new Vector2(0, 0), angle: 0, maxThrust: 1 }
        ])
        ship.setThrottles([1.0])
        const world = makeWorld(ship)

        stepN(world, 5)
        ship.setThrottles([0])
        const velAfter = ship.vel.clone()

        stepN(world, 5)

        expect(ship.vel.x).toBeCloseTo(velAfter.x)
        expect(ship.vel.y).toBeCloseTo(velAfter.y)
    })

    test("speed is clamped even with strong thrusters", () => {
        const ship = makeShip([
            { name: "fwd", offset: new Vector2(0, 0), angle: 0, maxThrust: 100 }
        ], { maxSpeed: 5 })
        ship.setThrottles([1.0])
        const world = makeWorld(ship)

        stepN(world, 100)

        expect(ship.vel.length()).toBeCloseTo(5, 1)
    })
})

// ============================================================
// FlightComputer
// ============================================================

describe("FlightComputer", () => {
    // Standard symmetric ship layout for testing
    function makeTestShip(opts = {}) {
        return new DynamicShipEntity({
            maxSpeed: 10,
            maxDr: 1,
            ...opts,
            thrusters: [
                // Main engines
                { name: "main_fwd", offset: new Vector2(0, 0),  angle: 0,       maxThrust: 1 },
                { name: "main_rvs", offset: new Vector2(0, 0),  angle: Math.PI, maxThrust: 1 },
                // RCS (produce torque)
                { name: "rcs_fr",   offset: new Vector2(1, 0),  angle: 0,       maxThrust: 0.5 },
                { name: "rcs_fl",   offset: new Vector2(-1, 0), angle: 0,       maxThrust: 0.5 },
                { name: "rcs_br",   offset: new Vector2(1, 0),  angle: Math.PI, maxThrust: 0.5 },
                { name: "rcs_bl",   offset: new Vector2(-1, 0), angle: Math.PI, maxThrust: 0.5 },
            ]
        })
    }

    describe("raw mode", () => {
        test("W key produces forward thrust", () => {
            const ship = makeTestShip()
            const fc = new FlightComputer(ship)
            fc.setMode("raw")
            fc.setKey("fwd", true)
            fc.update()

            const world = makeWorld(ship)
            stepN(world, 10)

            expect(ship.vel.y).toBeLessThan(0) // moving up
            expect(Math.abs(ship.vel.x)).toBeLessThan(0.01)
        })

        test("S key produces reverse thrust", () => {
            const ship = makeTestShip()
            const fc = new FlightComputer(ship)
            fc.setMode("raw")
            fc.setKey("back", true)
            fc.update()

            const world = makeWorld(ship)
            stepN(world, 10)

            expect(ship.vel.y).toBeGreaterThan(0) // moving down
        })

        test("A key produces left rotation (negative dr)", () => {
            const ship = makeTestShip()
            const fc = new FlightComputer(ship)
            fc.setMode("raw")
            fc.setKey("left", true)
            fc.update()

            const world = makeWorld(ship)
            stepN(world, 10)

            expect(ship.dr).toBeLessThan(0)
        })

        test("D key produces right rotation (positive dr)", () => {
            const ship = makeTestShip()
            const fc = new FlightComputer(ship)
            fc.setMode("raw")
            fc.setKey("right", true)
            fc.update()

            const world = makeWorld(ship)
            stepN(world, 10)

            expect(ship.dr).toBeGreaterThan(0)
        })

        test("W+A produces forward movement AND rotation", () => {
            const ship = makeTestShip()
            const fc = new FlightComputer(ship)
            fc.setMode("raw")
            fc.setKey("fwd", true)
            fc.setKey("left", true)
            fc.update()

            const world = makeWorld(ship)
            stepN(world, 10)

            expect(ship.vel.length()).toBeGreaterThan(0)
            expect(ship.dr).toBeLessThan(0)
        })

        test("no keys = no throttle", () => {
            const ship = makeTestShip()
            const fc = new FlightComputer(ship)
            fc.setMode("raw")
            fc.update()

            for (let i = 0; i < ship.throttles.length; i++) {
                expect(ship.throttles[i]).toBe(0)
            }
        })
    })

    describe("relative mode", () => {
        test("W key thrusts forward along ship heading", () => {
            const ship = makeTestShip({ r: Math.PI / 2 }) // facing right
            const fc = new FlightComputer(ship)
            fc.setMode("relative")
            fc.setKey("fwd", true)
            fc.update()

            const world = makeWorld(ship)
            stepN(world, 10)

            // Facing right (PI/2), forward should be +x
            expect(ship.vel.x).toBeGreaterThan(0)
        })

        test("cursor angle produces rotation toward target", () => {
            const ship = makeTestShip({ r: 0 }) // facing up
            const fc = new FlightComputer(ship)
            fc.setMode("relative")
            fc.setCursorAngle(Math.PI / 2) // cursor is to the right
            fc.update()

            const world = makeWorld(ship)
            stepN(world, 10)

            // Should rotate clockwise (positive) toward PI/2
            expect(ship.dr).toBeGreaterThan(0)
        })

        test("no cursor angle means no rotation", () => {
            const ship = makeTestShip()
            const fc = new FlightComputer(ship)
            fc.setMode("relative")
            fc.setCursorAngle(null)
            fc.setKey("fwd", true)
            fc.update()

            const world = makeWorld(ship)
            stepN(world, 10)

            expect(ship.dr).toBeCloseTo(0)
        })
    })

    describe("absolute mode", () => {
        test("W key moves up regardless of ship rotation", () => {
            const ship = makeTestShip({ r: Math.PI / 2 }) // facing right
            const fc = new FlightComputer(ship)
            fc.setMode("absolute")
            fc.setKey("fwd", true)
            fc.update()

            const world = makeWorld(ship)
            stepN(world, 10)

            // Should move up (-y) even though ship faces right
            expect(ship.vel.y).toBeLessThan(0)
        })

        test("D key moves right regardless of ship rotation", () => {
            const ship = makeTestShip({ r: Math.PI }) // facing down
            const fc = new FlightComputer(ship)
            fc.setMode("absolute")
            fc.setKey("right", true)
            fc.update()

            const world = makeWorld(ship)
            stepN(world, 10)

            expect(ship.vel.x).toBeGreaterThan(0)
        })

        test("W+D: ship with lateral thrusters moves diagonally", () => {
            // Need lateral thrusters for true absolute diagonal movement
            const ship = new DynamicShipEntity({
                maxSpeed: 10, maxDr: 1,
                thrusters: [
                    { name: "fwd",   offset: new Vector2(0, 0), angle: 0,              maxThrust: 1 },
                    { name: "rvs",   offset: new Vector2(0, 0), angle: Math.PI,        maxThrust: 1 },
                    { name: "right", offset: new Vector2(0, 0), angle: Math.PI / 2,    maxThrust: 1 },
                    { name: "left",  offset: new Vector2(0, 0), angle: -Math.PI / 2,   maxThrust: 1 },
                ]
            })
            const fc = new FlightComputer(ship)
            fc.setMode("absolute")
            fc.setKey("fwd", true)
            fc.setKey("right", true)
            fc.update()

            const world = makeWorld(ship)
            stepN(world, 10)

            expect(ship.vel.x).toBeGreaterThan(0)
            expect(ship.vel.y).toBeLessThan(0)
        })

        test("W+D: ship without lateral thrusters still moves (forward component only)", () => {
            const ship = makeTestShip() // no lateral thrusters
            const fc = new FlightComputer(ship)
            fc.setMode("absolute")
            fc.setKey("fwd", true)
            fc.setKey("right", true)
            fc.update()

            const world = makeWorld(ship)
            stepN(world, 10)

            // Can only thrust along forward axis, so moves up but not right
            expect(ship.vel.y).toBeLessThan(0)
        })
    })

    describe("solver properties", () => {
        test("solver uses RCS thrusters for rotation", () => {
            const ship = makeTestShip()
            const fc = new FlightComputer(ship)
            fc.setMode("raw")
            fc.setKey("right", true)
            fc.update()

            // At least one RCS thruster should have non-zero throttle
            const rcsThrottles = [ship.throttles[2], ship.throttles[3], ship.throttles[4], ship.throttles[5]]
            expect(rcsThrottles.some(t => t > 0)).toBe(true)
        })

        test("forward intent fires main engine + contributing RCS", () => {
            const ship = makeTestShip()
            const fc = new FlightComputer(ship)
            fc.setMode("raw")
            fc.setKey("fwd", true)
            fc.update()

            // Main forward thruster (index 0) should be on
            expect(ship.throttles[0]).toBeGreaterThan(0)
            // Main reverse (index 1) should be off
            expect(ship.throttles[1]).toBe(0)
        })

        test("combined intent shares thrusters between linear and rotation", () => {
            const ship = makeTestShip()
            const fc = new FlightComputer(ship)
            fc.setMode("raw")
            fc.setKey("fwd", true)
            fc.setKey("right", true)
            fc.update()

            // Should have both forward thrust and rotation
            // Main forward engine should fire
            expect(ship.throttles[0]).toBeGreaterThan(0)
            // Some RCS should be active for torque
            const anyRcsActive = [2, 3, 4, 5].some(i => ship.throttles[i] > 0)
            expect(anyRcsActive).toBe(true)
        })
    })
})

// ============================================================
// World orchestration
// ============================================================

describe("World", () => {
    test("inactive world does not step entities", () => {
        const e = new PointEntity({ x: 0, y: 0, vx: 1 })
        const world = new World(1)
        world.addEntity(e)
        // world NOT started

        stepN(world, 10)

        expect(e.pos.x).toBe(0)
    })

    test("start/stop controls stepping", () => {
        const e = new PointEntity({ x: 0, y: 0, vx: 1 })
        const world = new World(1)
        world.addEntity(e)

        world.start()
        stepN(world, 5)
        expect(e.pos.x).toBe(5)

        world.stop()
        stepN(world, 5)
        expect(e.pos.x).toBe(5) // no change
    })

    test("removeEntity removes from simulation", () => {
        const e = new PointEntity({ x: 0, y: 0, vx: 1 })
        const world = makeWorld(e)

        stepN(world, 5)
        world.removeEntity(e)
        stepN(world, 5)

        expect(e.pos.x).toBe(5) // stopped at tick 5
    })

    test("getEntityByName finds entity", () => {
        const a = new PointEntity({ name: "alice" })
        const b = new PointEntity({ name: "bob" })
        const world = makeWorld(a, b)

        expect(world.getEntityByName("bob")).toBe(b)
        expect(world.getEntityByName("nobody")).toBeUndefined()
    })

    test("force field + parented shield scenario", () => {
        // Gravity well at origin, ship with a parented repulsor shield
        // Another entity (debris) near the ship should be repelled by shield
        // but attracted by the gravity well
        const gravity = new ForceFieldEntity({
            name: "star",
            x: 0, y: 0,
            radius: 500,
            strength: 10,
            affectsLayers: LAYERS.SHIPS | LAYERS.DEBRIS
        })

        const ship = new ForcesEntity({
            name: "ship",
            x: 100, y: 0,
            layer: LAYERS.SHIPS
        })

        const shield = new ForceFieldEntity({
            name: "shield",
            parent: ship,
            offsetX: 0, offsetY: 0,
            radius: 30,
            strength: -50, // repels
            affectsLayers: LAYERS.DEBRIS
        })

        const debris = new ForcesEntity({
            name: "debris",
            x: 110, y: 0, // close to ship
            layer: LAYERS.DEBRIS
        })

        const world = makeWorld(gravity, ship, shield, debris)
        stepN(world, 1)

        // Debris should be pushed away from shield (positive x) 
        // and pulled toward gravity (negative x)
        // The shield is stronger at close range, so net should be positive x
        expect(debris.vel.x).toBeGreaterThan(0)
    })

    test("last_tick_ms is populated after step", () => {
        const world = makeWorld(new PointEntity({}))
        stepN(world, 1)
        expect(world.last_tick_ms).toBeGreaterThanOrEqual(0)
    })
})
