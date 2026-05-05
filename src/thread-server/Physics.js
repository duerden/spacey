import { Vector2 } from "./Vector2"

let _nextId = 0
const nextId = (cn) => `${_nextId++}-${cn}`

// ============================================================
// Layers - bitmask system for force field interaction filtering
// ============================================================

export const LAYERS = {
    DEFAULT:  1,       // 0b0001
    SHIPS:    1 << 1,  // 0b0010
    SHIELDS:  1 << 2,  // 0b0100
    DEBRIS:   1 << 3,  // 0b1000
}

// ============================================================
// World
// ============================================================

export class World {
    constructor(msps) {
        this.active = false
        this.target_tick_ms = msps
        this.last_tick_ms = 0
        this.entities = []
    }

    start() { this.active = true }
    stop()  { this.active = false }

    addEntity(...entities) {
        for (let entity of entities) {
            this.entities.push(entity)
        }
    }

    removeEntity(entity) {
        const idx = this.entities.indexOf(entity)
        if (idx !== -1) this.entities.splice(idx, 1)
    }

    getEntityByName(name) {
        return this.entities.find(e => e.name === name)
    }

    getEntitiesByType(type) {
        return this.entities.filter(e => e instanceof type)
    }

    step(dt) {
        if (!this.active) return
        const start = performance.now()

        // Pass 1: sync parented positions so force fields are at correct locations
        for (let entity of this.entities) {
            if (entity.parent) {
                entity.syncToParent()
            }
        }

        // Pass 2: apply force fields to nearby entities
        const fields = this.getEntitiesByType(ForceFieldEntity)
        const forcesEntities = this.getEntitiesByType(ForcesEntity)

        for (let field of fields) {
            for (let entity of forcesEntities) {
                if (entity === field) continue
                if ((field.affectsLayers & entity.layer) === 0) continue

                const delta = entity.pos.sub(field.pos)
                const distSq = delta.lengthSq()
                const radius = field.radius * field.scale

                if (distSq > 0 && distSq <= radius * radius) {
                    const dist = Math.sqrt(distSq)
                    const direction = delta.scale(1 / dist) // unit vector from field to entity

                    // strength is positive = attract (toward field), negative = repel (away)
                    // Force scales with inverse square, capped at radius boundary
                    const magnitude = field.strength / distSq

                    // attract: force toward field center (negative direction)
                    // repel: force away from field center (positive direction)
                    const force = direction.scale(-magnitude)
                    entity.vel = entity.vel.add(force.scale(dt))
                }
            }
        }

        // Pass 3: step all entities
        for (let entity of this.entities) {
            entity.step(dt)
        }

        // Pass 4: sync parented entity positions (after parents have moved)
        for (let entity of this.entities) {
            if (entity.parent) {
                entity.syncToParent()
            }
        }

        this.last_tick_ms = performance.now() - start
    }
}

// ============================================================
// PointEntity - position + velocity
// ============================================================

export class PointEntity {
    constructor(i = {}) {
        this.pos = new Vector2(i.x || 0, i.y || 0)
        this.vel = new Vector2(i.vx || 0, i.vy || 0)

        this.name = i.name || "point_entity"
        this.type = this.constructor.name
        this.id = nextId(this.constructor.name)

        // Scale
        this.scale = i.scale ?? 1

        // Parenting
        this.parent = i.parent || null
        this.parentOffset = new Vector2(i.offsetX || 0, i.offsetY || 0)

        // Layer membership
        this.layer = i.layer || LAYERS.DEFAULT
    }

    syncToParent() {
        if (!this.parent) return
        // Scale offset by parent's scale, rotate by parent's rotation, then add to parent's position
        const scaled = this.parentOffset.scale(this.parent.scale)
        const rotated = scaled.rotate(this.parent.r || 0)
        this.pos = this.parent.pos.add(rotated)
    }

    step(dt) {
        // Parented entities don't move on their own
        if (this.parent) return
        this.pos = this.pos.add(this.vel.scale(dt))
    }

    // Serialisation helpers
    get x() { return this.pos.x }
    get y() { return this.pos.y }
    get vx() { return this.vel.x }
    get vy() { return this.vel.y }
}

// ============================================================
// ThingEntity - adds rotation + angular velocity
// ============================================================

export class ThingEntity extends PointEntity {
    constructor(i = {}) {
        super(i)
        this.r = i.r || 0      // rotation (radians)
        this.dr = i.dr || 0    // angular velocity (radians/tick)
    }

    step(dt) {
        super.step(dt)
        if (this.parent) return
        this.r += this.dr * dt
    }
}

// ============================================================
// ForcesEntity - entity with named forces applied to it
// Forces can be absolute (world-space) or relative (to rotation)
// ============================================================

export class ForcesEntity extends ThingEntity {
    constructor(i = {}) {
        super(i)

        // Map of name -> { vector: Vector2, relative: boolean }
        // relative=true means the force direction rotates with the entity
        this.forces = new Map()

        this.maxSpeed = i.maxSpeed || Infinity
        this.maxDr = i.maxDr || Infinity
    }

    addForce(name, vector, relative = false) {
        this.forces.set(name, { vector, relative })
    }

    removeForce(name) {
        this.forces.delete(name)
    }

    hasForce(name) {
        return this.forces.has(name)
    }

    clearForces() {
        this.forces.clear()
    }

    step(dt) {
        if (this.parent) {
            this.syncToParent()
            return
        }

        // Apply all named forces
        for (let [name, force] of this.forces) {
            let dir = force.vector
            if (force.relative) {
                dir = dir.rotate(this.r)
            }
            this.vel = this.vel.add(dir.scale(dt))
        }

        // Clamp speed
        const speed = this.vel.length()
        if (speed > this.maxSpeed) {
            this.vel = this.vel.scale(this.maxSpeed / speed)
        }

        // Clamp angular velocity
        if (Math.abs(this.dr) > this.maxDr) {
            this.dr = Math.sign(this.dr) * this.maxDr
        }

        // Integrate position and rotation
        this.pos = this.pos.add(this.vel.scale(dt))
        this.r += this.dr * dt
    }
}

// ============================================================
// ForceFieldEntity - applies forces to nearby ForcesEntities
// ============================================================

export class ForceFieldEntity extends PointEntity {
    constructor(i = {}) {
        super(i)

        this.radius = i.radius || 100
        // positive = attracts, negative = repels
        this.strength = i.strength || 1

        // Bitmask: which layers does this field affect?
        this.affectsLayers = i.affectsLayers || LAYERS.DEFAULT | LAYERS.SHIPS | LAYERS.DEBRIS
    }
}

// ============================================================
// DynamicShipEntity - flight model computed from thruster layout
//
// Each thruster has:
//   - offset: Vector2 (position relative to ship center)
//   - angle: number (direction thruster pushes, in radians, relative to ship)
//   - maxThrust: number (maximum force magnitude)
//   - name: string (for binding to input)
// ============================================================

export class DynamicShipEntity extends ForcesEntity {
    constructor(i = {}) {
        super(i)

        // Array of thruster definitions
        this.thrusters = i.thrusters || []

        // Map of thruster name -> active (boolean)
        this.thrusterState = new Map()
        for (let thruster of this.thrusters) {
            this.thrusterState.set(thruster.name, false)
        }

        this.inertiaDamp = false
        this.dampLinear = i.dampLinear || 0.01   // braking acceleration for linear
        this.dampAngular = i.dampAngular || 0.003 // braking acceleration for angular
    }

    setThruster(name, active) {
        this.thrusterState.set(name, active)
        this._recomputeThrusters()
    }

    setInertiaDamp(active) {
        this.inertiaDamp = active
    }

    _recomputeThrusters() {
        // Remove old thruster force
        this.removeForce("__thrusters_linear")

        let netForce = Vector2.zero()
        let netTorque = 0

        for (let thruster of this.thrusters) {
            if (!this.thrusterState.get(thruster.name)) continue

            // Thrust direction (in ship-local space)
            const thrustDir = Vector2.fromAngle(thruster.angle)
            const force = thrustDir.scale(thruster.maxThrust)

            netForce = netForce.add(force)

            // Torque = cross(offset, force)
            netTorque += thruster.offset.cross(force)
        }

        // Apply as a relative force (rotates with ship)
        if (netForce.lengthSq() > 0) {
            this.addForce("__thrusters_linear", netForce, true)
        }

        // Store torque for per-frame application in step()
        this._thrusterTorque = netTorque
    }

    step(dt) {
        // Apply thruster torque
        if (this._thrusterTorque) {
            this.dr += this._thrusterTorque * dt
        }

        // Inertia dampening
        if (this.inertiaDamp) {
            // Linear dampening
            const speed = this.vel.length()
            if (speed > 0) {
                const brake = Math.min(this.dampLinear, speed)
                const brakeVec = this.vel.normalize().scale(-brake)
                this.vel = this.vel.add(brakeVec.scale(dt))
            }

            // Angular dampening
            if (Math.abs(this.dr) > 0) {
                const brake = Math.min(this.dampAngular, Math.abs(this.dr))
                this.dr -= Math.sign(this.dr) * brake * dt
            }
        }

        super.step(dt)
    }
}
