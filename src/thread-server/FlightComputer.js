import { Vector2 } from "./Vector2"

// ============================================================
// FlightComputer
//
// Sits between intent (player input / AI) and thruster hardware.
// Accepts a desired linear force vector + torque, solves for
// per-thruster throttle values (0.0 - 1.0).
//
// Modes:
//   "raw"      - W/S = forward/back along ship heading, A/D = turn
//   "relative" - W/S = forward/back along ship heading, ship auto-rotates toward cursor
//   "absolute" - W/S/A/D = world-space movement, ship auto-rotates toward cursor
// ============================================================

export class FlightComputer {
    constructor(ship) {
        this.ship = ship
        this.mode = "raw"

        // Precompute thruster properties for the solver
        // Each entry: { thruster, direction: Vector2, torque: number }
        // direction = unit force vector in local space
        // torque = cross(offset, direction) — torque per unit thrust
        this._thrusterInfo = ship.thrusters.map(t => {
            const direction = Vector2.fromAngle(t.angle)
            const torque = t.offset.cross(direction)
            return { thruster: t, direction, torque }
        })

        // Current input state
        this._keys = { fwd: false, back: false, left: false, right: false }
        this._cursorAngle = null // radians, world-space angle to cursor (null = no cursor)
    }

    setMode(mode) {
        this.mode = mode
    }

    setKey(key, active) {
        this._keys[key] = active
    }

    setCursorAngle(angle) {
        this._cursorAngle = angle
    }

    // Called each tick — reads input state, computes intent, solves, applies
    update() {
        const intent = this._computeIntent()
        const throttles = this._solve(intent)
        this._applyThrottles(throttles)
    }

    // --------------------------------------------------------
    // Intent computation — mode-dependent
    // --------------------------------------------------------

    _computeIntent() {
        switch (this.mode) {
            case "raw":      return this._intentRaw()
            case "relative": return this._intentRelative()
            case "absolute": return this._intentAbsolute()
            default:         return { linear: Vector2.zero(), torque: 0 }
        }
    }

    // Raw: W=forward, S=back (ship-local), A/D=turn
    _intentRaw() {
        let linear = Vector2.zero()
        let torque = 0

        if (this._keys.fwd)   linear = linear.add(Vector2.fromAngle(0))  // forward in local space
        if (this._keys.back)  linear = linear.add(Vector2.fromAngle(Math.PI))
        if (this._keys.left)  torque -= 1
        if (this._keys.right) torque += 1

        return { linear, torque }
    }

    // Relative: W=forward along heading, S=back, mouse=auto-rotate to cursor
    _intentRelative() {
        let linear = Vector2.zero()

        if (this._keys.fwd)  linear = linear.add(Vector2.fromAngle(0))
        if (this._keys.back) linear = linear.add(Vector2.fromAngle(Math.PI))

        const torque = this._autoRotateTorque()

        return { linear, torque }
    }

    // Absolute: WASD = world-space directions, mouse=auto-rotate to cursor
    _intentAbsolute() {
        // Build world-space desired direction
        let worldDir = Vector2.zero()
        if (this._keys.fwd)   worldDir = worldDir.add(new Vector2(0, -1)) // up
        if (this._keys.back)  worldDir = worldDir.add(new Vector2(0, 1))  // down
        if (this._keys.left)  worldDir = worldDir.add(new Vector2(-1, 0)) // left
        if (this._keys.right) worldDir = worldDir.add(new Vector2(1, 0))  // right

        // Convert to ship-local space by un-rotating by ship heading
        let linear = Vector2.zero()
        if (worldDir.lengthSq() > 0) {
            linear = worldDir.normalize().rotate(-this.ship.r)
        }

        const torque = this._autoRotateTorque()

        return { linear, torque }
    }

    // Compute torque demand to rotate toward cursor
    _autoRotateTorque() {
        if (this._cursorAngle === null) return 0

        // Angle difference, normalized to [-PI, PI]
        let diff = this._cursorAngle - this.ship.r
        diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI
        // Handle JS modulo for negative values
        if (diff < -Math.PI) diff += Math.PI * 2

        // Proportional control: full torque demand when far, tapering when close
        // Clamp to [-1, 1]
        const deadzone = 0.01 // radians — don't twitch for tiny differences
        if (Math.abs(diff) < deadzone) return 0

        return Math.max(-1, Math.min(1, diff / (Math.PI / 4)))
    }

    // --------------------------------------------------------
    // Axis decomposition solver
    // --------------------------------------------------------

    _solve(intent) {
        const throttles = new Float64Array(this._thrusterInfo.length)

        const linearLen = intent.linear.length()
        if (linearLen === 0 && intent.torque === 0) return throttles

        // Normalize linear intent to a direction + magnitude (capped at 1)
        const linearDir = linearLen > 0 ? intent.linear.scale(1 / linearLen) : Vector2.zero()
        const linearMag = Math.min(linearLen, 1)
        const torqueMag = Math.max(-1, Math.min(1, intent.torque))

        // Score each thruster on two axes:
        //   linearScore: dot(thruster direction, desired linear direction)
        //   torqueScore: sign match between thruster torque and desired torque
        //
        // Then combine: throttle = clamp(linearScore * linearMag + torqueScore * |torqueMag|, 0, 1)
        //
        // A thruster that opposes the intent on either axis gets 0.

        for (let i = 0; i < this._thrusterInfo.length; i++) {
            const info = this._thrusterInfo[i]
            let t = 0

            // Linear contribution
            if (linearMag > 0) {
                const score = info.direction.dot(linearDir)
                if (score > 0) {
                    t += score * linearMag
                }
            }

            // Torque contribution
            if (Math.abs(torqueMag) > 0 && Math.abs(info.torque) > 0) {
                // Does this thruster's torque match the desired direction?
                const torqueSign = Math.sign(info.torque)
                const desiredSign = Math.sign(torqueMag)

                if (torqueSign === desiredSign) {
                    t += Math.abs(torqueMag)
                }
            }

            throttles[i] = Math.max(0, Math.min(1, t))
        }

        return throttles
    }

    // --------------------------------------------------------
    // Apply throttles to the ship
    // --------------------------------------------------------

    _applyThrottles(throttles) {
        this.ship.setThrottles(throttles)
    }
}
