let _nextId = 0
const nextId = (tag) => `${tag}-${_nextId++}`

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

        // visibility
        this.visible = true
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

    // resolve absolute position and accumulated scale by walking up the tree
    absPos() {
        let x = this.x, y = this.y
        let s = this.scale
        let node = this.parent
        while (node) {
            // parent's scale affects our offset from parent
            x = node.x + x * node.scale
            y = node.y + y * node.scale
            s *= node.scale
            node = node.parent
        }
        return { x, y, scale: s }
    }

    // override in subclasses to draw yourself
    drawSelf() { }

    // recursively draw this node and all children
    draw() {
        if (!this.visible) return
        this.drawSelf()
        for (const child of this.children) {
            child.draw()
        }
    }
}
// Root node. Never draws itself, just holds children.
export class RootNode extends PointNode {
    constructor() {
        super("root")
    }
}
