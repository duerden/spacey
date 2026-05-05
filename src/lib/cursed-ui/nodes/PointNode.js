let _nextId = 0
const nextId = (tag) => `${tag}-${_nextId++}`

// Walk up the tree from `node`, searching siblings at each ancestor level
// for a node with a matching slotName. Returns the slot node or null.
function findSlot(node, name) {
    let current = node
    while (current.parent) {
        const siblings = current.parent.children
        for (let i = 0; i < siblings.length; i++) {
            const sibling = siblings[i]
            if (sibling === current) continue
            if (sibling.slotName === name) return sibling
        }
        current = current.parent
    }
    return null
}

// Walk up the tree from `node` to find the nearest ancestor with resolveAnchor().
// (BoxNode and its subclasses implement resolveAnchor.)
function findNearestBoxAncestor(node) {
    let current = node.parent
    while (current) {
        if (typeof current.resolveAnchor === "function") return current
        current = current.parent
    }
    return null
}

// Base node. Everything in the UI tree is one of these.
// Has position, size, children, and a draw() method.

export class PointNode {
    constructor(tag = "pointnode") {
        this.id = nextId(tag)
        this.tag = tag
        this.parent = null
        this.children = []

        // layout
        this.x = 0
        this.y = 0
        this.scale = 1

        // alignment: reference a slot name or nine-point anchor
        this.align = null

        // slot: if set, this node is an invisible anchor point that other nodes
        // can reference via their `align` prop. Slots are skipped during draw.
        this.slotName = null

        // visibility
        this.visible = true

        // absPos cache (dirty-per-frame)
        this._absPosCache = null
        this._absPosCacheFrame = -1
    }

    add(child, index) {
        child.parent = this
        if (index !== undefined) {
            this.children.splice(index, 0, child)
        } else {
            this.children.push(child)
        }
    }

    remove(child) {
        const i = this.children.indexOf(child)
        if (i !== -1) {
            child.parent = null
            this.children.splice(i, 1)
        }
    }

    // Resolve absolute position and accumulated scale.
    //
    // Resolution chain:
    // 1. Start with this node's own x, y
    // 2. If `align` is set:
    //    a. Search for a sibling slot with that name (walk up ancestors)
    //    b. If no slot found, try nine-point anchor on nearest BoxNode ancestor
    //    c. The align offset is added to x, y (so x/y becomes a local offset from the align target)
    // 3. Walk up the tree accumulating parent positions and scale
    absPos() {
        // Cache check
        if (this._absPosCache && this._absPosCacheFrame === PointNode._currentFrame) {
            return this._absPosCache
        }

        let x = this.x, y = this.y

        // Resolve alignment
        if (this.align !== null && this.parent) {
            let resolved = false

            // Try slot lookup (walk up tree searching siblings)
            const slot = findSlot(this, this.align)
            if (slot) {
                // Use slot's position relative to its parent as our base
                const slotAbs = slot.absPos()
                const parentAbs = slot.parent.absPos()
                x += (slotAbs.x - parentAbs.x) / (parentAbs.scale || 1)
                y += (slotAbs.y - parentAbs.y) / (parentAbs.scale || 1)
                resolved = true
            }

            // Fall back to nine-point anchor on nearest BoxNode
            if (!resolved) {
                const box = findNearestBoxAncestor(this)
                if (box) {
                    const anchor = box.resolveAnchor(this.align)
                    if (anchor) {
                        x += anchor.x
                        y += anchor.y
                    }
                }
            }
        }

        // Accumulate parent positions and scale
        let s = this.scale
        let node = this.parent
        while (node) {
            x = node.x + x * node.scale
            y = node.y + y * node.scale
            s *= node.scale
            node = node.parent
        }

        const result = { x, y, scale: s }
        this._absPosCache = result
        this._absPosCacheFrame = PointNode._currentFrame
        return result
    }

    // override in subclasses to draw yourself
    drawSelf() { }

    // recursively draw this node and all children
    draw() {
        if (!this.visible) return
        // Slots are invisible anchor points — never draw themselves
        if (this.slotName !== null) return
        this.drawSelf()
        for (const child of this.children) {
            child.draw()
        }
    }

    // Call once per frame before drawing to invalidate all absPos caches
    static invalidateAbsPosCache() {
        PointNode._currentFrame++
    }
}

// Global frame counter for cache invalidation
PointNode._currentFrame = 0

// Root node. Never draws itself, just holds children.
export class RootNode extends PointNode {
    constructor() {
        super("root")
    }
}
