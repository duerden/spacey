export class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x
        this.y = y
    }

    clone() {
        return new Vector2(this.x, this.y)
    }

    set(x, y) {
        this.x = x
        this.y = y
        return this
    }

    copy(v) {
        this.x = v.x
        this.y = v.y
        return this
    }

    add(v) {
        return new Vector2(this.x + v.x, this.y + v.y)
    }

    sub(v) {
        return new Vector2(this.x - v.x, this.y - v.y)
    }

    scale(s) {
        return new Vector2(this.x * s, this.y * s)
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y)
    }

    lengthSq() {
        return this.x * this.x + this.y * this.y
    }

    normalize() {
        const len = this.length()
        if (len === 0) return new Vector2(0, 0)
        return this.scale(1 / len)
    }

    dot(v) {
        return this.x * v.x + this.y * v.y
    }

    // 2D cross product (scalar) - useful for torque
    cross(v) {
        return this.x * v.y - this.y * v.x
    }

    // Rotate this vector by angle (radians)
    rotate(angle) {
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        return new Vector2(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        )
    }

    // Unit vector from an angle (0 = up/+y, clockwise)
    // Matching the existing convention: sin(r) for x, -cos(r) for y
    static fromAngle(angle) {
        return new Vector2(Math.sin(angle), -Math.cos(angle))
    }

    static zero() {
        return new Vector2(0, 0)
    }
}
