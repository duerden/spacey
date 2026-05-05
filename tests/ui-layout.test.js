import { test, expect, describe, beforeEach } from "bun:test"
import { PointNode, RootNode } from "../src/lib/cursed-ui/nodes/PointNode.js"

// Minimal BoxNode stand-in that doesn't import raylib.
// We just need resolveAnchor() for testing the layout system.
class TestBoxNode extends PointNode {
    constructor(w = 100, h = 100) {
        super("testbox")
        this.w = w
        this.h = h
    }

    resolveAnchor(name) {
        switch (name) {
            case "top_left":      return { x: 0,          y: 0 }
            case "top_centre":    return { x: this.w / 2, y: 0 }
            case "top_right":     return { x: this.w,     y: 0 }
            case "centre_left":   return { x: 0,          y: this.h / 2 }
            case "centre":        return { x: this.w / 2, y: this.h / 2 }
            case "centre_right":  return { x: this.w,     y: this.h / 2 }
            case "base_left":     return { x: 0,          y: this.h }
            case "base_centre":   return { x: this.w / 2, y: this.h }
            case "base_right":    return { x: this.w,     y: this.h }
            default:              return null
        }
    }
}

// ============================================================
// Helpers
// ============================================================

function makeTree(...buildFns) {
    const root = new RootNode()
    for (const fn of buildFns) {
        fn(root)
    }
    PointNode.invalidateAbsPosCache()
    return root
}

// ============================================================
// Nine-point anchors
// ============================================================

describe("Nine-point anchors", () => {
    test("centre anchor resolves to w/2, h/2", () => {
        const box = new TestBoxNode(200, 100)
        const anchor = box.resolveAnchor("centre")
        expect(anchor.x).toBe(100)
        expect(anchor.y).toBe(50)
    })

    test("top_left is 0,0", () => {
        const box = new TestBoxNode(200, 100)
        const anchor = box.resolveAnchor("top_left")
        expect(anchor.x).toBe(0)
        expect(anchor.y).toBe(0)
    })

    test("base_right is w,h", () => {
        const box = new TestBoxNode(200, 100)
        const anchor = box.resolveAnchor("base_right")
        expect(anchor.x).toBe(200)
        expect(anchor.y).toBe(100)
    })

    test("unknown anchor returns null", () => {
        const box = new TestBoxNode(200, 100)
        expect(box.resolveAnchor("nonexistent")).toBeNull()
    })

    test("all nine anchors are defined", () => {
        const box = new TestBoxNode(100, 100)
        const names = [
            "top_left", "top_centre", "top_right",
            "centre_left", "centre", "centre_right",
            "base_left", "base_centre", "base_right"
        ]
        for (const name of names) {
            const anchor = box.resolveAnchor(name)
            expect(anchor).not.toBeNull()
            expect(typeof anchor.x).toBe("number")
            expect(typeof anchor.y).toBe("number")
        }
    })
})

// ============================================================
// Align with nine-point anchors
// ============================================================

describe("Align with anchors", () => {
    test("align to centre of parent box", () => {
        const box = new TestBoxNode(200, 100)
        box.x = 10
        box.y = 20

        const child = new PointNode()
        child.align = "centre"
        box.add(child)

        const root = new RootNode()
        root.add(box)

        PointNode.invalidateAbsPosCache()
        const pos = child.absPos()

        // Box at (10,20), centre is (100, 50), child offset (0,0)
        // child absolute = box.x + (child.x + anchor.x) * box.scale
        // = 10 + (0 + 100) = 110, 20 + (0 + 50) = 70
        expect(pos.x).toBeCloseTo(110)
        expect(pos.y).toBeCloseTo(70)
    })

    test("align to base_right with local offset", () => {
        const box = new TestBoxNode(200, 100)
        box.x = 0
        box.y = 0

        const child = new PointNode()
        child.align = "base_right"
        child.x = -10 // offset 10px left from base_right
        child.y = -5
        box.add(child)

        const root = new RootNode()
        root.add(box)

        PointNode.invalidateAbsPosCache()
        const pos = child.absPos()

        // base_right = (200, 100), plus local offset (-10, -5)
        expect(pos.x).toBeCloseTo(190)
        expect(pos.y).toBeCloseTo(95)
    })

    test("align respects parent scale", () => {
        const box = new TestBoxNode(200, 100)
        box.x = 0
        box.y = 0
        box.scale = 2

        const child = new PointNode()
        child.align = "centre" // (100, 50) on the box
        box.add(child)

        const root = new RootNode()
        root.add(box)

        PointNode.invalidateAbsPosCache()
        const pos = child.absPos()

        // anchor (100,50) + child offset (0,0) = (100,50)
        // scaled by parent scale 2: box.x + 100*2 = 200, box.y + 50*2 = 100
        expect(pos.x).toBeCloseTo(200)
        expect(pos.y).toBeCloseTo(100)
    })

    test("align with no matching anchor or slot is ignored", () => {
        const box = new TestBoxNode(200, 100)
        box.x = 10
        box.y = 20

        const child = new PointNode()
        child.align = "nonexistent_thing"
        child.x = 5
        child.y = 5
        box.add(child)

        const root = new RootNode()
        root.add(box)

        PointNode.invalidateAbsPosCache()
        const pos = child.absPos()

        // No slot or anchor found, just normal position
        expect(pos.x).toBeCloseTo(15)
        expect(pos.y).toBeCloseTo(25)
    })
})

// ============================================================
// Slot system
// ============================================================

describe("Slots", () => {
    test("align to a sibling slot", () => {
        const parent = new PointNode()
        parent.x = 10
        parent.y = 10

        const slot = new PointNode()
        slot.slotName = "target"
        slot.x = 50
        slot.y = 30
        parent.add(slot)

        const content = new PointNode()
        content.align = "target"
        parent.add(content)

        const root = new RootNode()
        root.add(parent)

        PointNode.invalidateAbsPosCache()
        const pos = content.absPos()

        // Slot is at (50, 30) relative to parent
        // Content aligns to slot, so its base is (50, 30) relative to parent
        // Absolute: parent (10,10) + (50,30) = (60, 40)
        expect(pos.x).toBeCloseTo(60)
        expect(pos.y).toBeCloseTo(40)
    })

    test("align to slot with local offset", () => {
        const parent = new PointNode()
        parent.x = 0
        parent.y = 0

        const slot = new PointNode()
        slot.slotName = "anchor"
        slot.x = 100
        slot.y = 100
        parent.add(slot)

        const content = new PointNode()
        content.align = "anchor"
        content.x = 10 // offset from slot
        content.y = -5
        parent.add(content)

        const root = new RootNode()
        root.add(parent)

        PointNode.invalidateAbsPosCache()
        const pos = content.absPos()

        expect(pos.x).toBeCloseTo(110)
        expect(pos.y).toBeCloseTo(95)
    })

    test("slots are invisible (skipped in draw)", () => {
        const slot = new PointNode()
        slot.slotName = "hidden"
        slot.visible = true

        // draw() should return early for slots
        // We verify by checking that drawSelf is not called
        let drawn = false
        slot.drawSelf = () => { drawn = true }

        slot.draw()

        expect(drawn).toBe(false)
    })

    test("slot children are also not drawn", () => {
        const slot = new PointNode()
        slot.slotName = "hidden"

        let childDrawn = false
        const child = new PointNode()
        child.drawSelf = () => { childDrawn = true }
        slot.add(child)

        slot.draw()

        expect(childDrawn).toBe(false)
    })

    test("slot lookup walks up the tree", () => {
        // Structure: root > container > wrapper > content
        // Slot is a sibling of wrapper inside container
        // Content should find the slot by walking up
        const root = new RootNode()

        const container = new PointNode()
        container.x = 0
        container.y = 0
        root.add(container)

        const slot = new PointNode()
        slot.slotName = "deep_slot"
        slot.x = 80
        slot.y = 40
        container.add(slot)

        const wrapper = new PointNode()
        wrapper.x = 0
        wrapper.y = 0
        container.add(wrapper)

        const content = new PointNode()
        content.align = "deep_slot"
        wrapper.add(content)

        PointNode.invalidateAbsPosCache()
        const pos = content.absPos()

        // Slot at (80, 40) relative to container
        // Content is in wrapper (inside container), aligns to slot
        expect(pos.x).toBeCloseTo(80)
        expect(pos.y).toBeCloseTo(40)
    })

    test("slot takes priority over anchor", () => {
        // If both a slot named "centre" and a box anchor "centre" exist,
        // the slot should win
        const box = new TestBoxNode(200, 100) // anchor "centre" = (100, 50)
        box.x = 0
        box.y = 0

        const slot = new PointNode()
        slot.slotName = "centre"
        slot.x = 10 // deliberately different from box centre
        slot.y = 10
        box.add(slot)

        const content = new PointNode()
        content.align = "centre"
        box.add(content)

        const root = new RootNode()
        root.add(box)

        PointNode.invalidateAbsPosCache()
        const pos = content.absPos()

        // Slot at (10, 10) should win over anchor at (100, 50)
        expect(pos.x).toBeCloseTo(10)
        expect(pos.y).toBeCloseTo(10)
    })

    test("slots can chain (slot aligns to another slot)", () => {
        const parent = new PointNode()
        parent.x = 0
        parent.y = 0

        const slot1 = new PointNode()
        slot1.slotName = "slot_a"
        slot1.x = 50
        slot1.y = 0
        parent.add(slot1)

        const slot2 = new PointNode()
        slot2.slotName = "slot_b"
        slot2.align = "slot_a"
        slot2.x = 0
        slot2.y = 30 // 30px below slot_a
        parent.add(slot2)

        const content = new PointNode()
        content.align = "slot_b"
        parent.add(content)

        const root = new RootNode()
        root.add(parent)

        PointNode.invalidateAbsPosCache()
        const pos = content.absPos()

        // slot_a at (50, 0)
        // slot_b aligns to slot_a, offset (0, 30) = (50, 30)
        // content aligns to slot_b = (50, 30)
        expect(pos.x).toBeCloseTo(50)
        expect(pos.y).toBeCloseTo(30)
    })

    test("scale affects slot-aligned children", () => {
        const parent = new PointNode()
        parent.x = 0
        parent.y = 0
        parent.scale = 2

        const slot = new PointNode()
        slot.slotName = "scaled_target"
        slot.x = 50
        slot.y = 50
        parent.add(slot)

        const content = new PointNode()
        content.align = "scaled_target"
        parent.add(content)

        const root = new RootNode()
        root.add(parent)

        PointNode.invalidateAbsPosCache()
        const pos = content.absPos()

        // Slot is at (50, 50) relative to parent
        // Content aligns to slot: base (50, 50) + offset (0, 0) = (50, 50)
        // Scaled by parent 2: (100, 100)
        expect(pos.x).toBeCloseTo(100)
        expect(pos.y).toBeCloseTo(100)
    })
})

// ============================================================
// absPos caching
// ============================================================

describe("absPos caching", () => {
    test("returns same object on repeated calls in same frame", () => {
        const node = new PointNode()
        node.x = 10
        node.y = 20
        const root = new RootNode()
        root.add(node)

        PointNode.invalidateAbsPosCache()
        const a = node.absPos()
        const b = node.absPos()

        expect(a).toBe(b) // same object reference
    })

    test("recalculates after invalidation", () => {
        const node = new PointNode()
        node.x = 10
        node.y = 20
        const root = new RootNode()
        root.add(node)

        PointNode.invalidateAbsPosCache()
        const a = node.absPos()

        node.x = 99
        PointNode.invalidateAbsPosCache()
        const b = node.absPos()

        expect(a.x).toBe(10)
        expect(b.x).toBe(99)
    })
})
