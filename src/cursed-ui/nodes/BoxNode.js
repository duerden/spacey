import * as r from "raylib";
import { UINode } from "./UINode";


// A box with optional background color, positioned absolutely

export class BoxNode extends UINode {
    constructor() {
        super("box")
        this.bg = null // null = transparent
        this.color = null
    }

    drawSelf() {
        if (!this.bg) return
        const pos = this.absPos()
        r.DrawRectangle(pos.x, pos.y, this.w, this.h, this.bg)
    }
}
// Styled box with texture-based borders (corners + sides).
// Expects a border config: { corner, side, size }
// where corner/side are Textures, size is the border thickness in px.
// Draws 9-slice style: 4 corners, 4 sides (tiled/stretched), 1 fill.

export class StyledBoxNode extends BoxNode {
    constructor() {
        super()
        this.tag = "styledbox"
        this.border = null // { tl, tr, bl, br, top, bottom, left, right, size }
    }

    drawSelf() {
        const pos = this.absPos()

        // fill
        if (this.bg) {
            r.DrawRectangle(pos.x, pos.y, this.w, this.h, this.bg)
        }

        if (!this.border) return
        const b = this.border
        const s = b.size

        // corners
        if (b.tl) r.DrawTexture(b.tl, pos.x, pos.y, r.WHITE)
        if (b.tr) r.DrawTexture(b.tr, pos.x + this.w - s, pos.y, r.WHITE)
        if (b.bl) r.DrawTexture(b.bl, pos.x, pos.y + this.h - s, r.WHITE)
        if (b.br) r.DrawTexture(b.br, pos.x + this.w - s, pos.y + this.h - s, r.WHITE)

        // sides (stretched via DrawTexturePro)
        const src = (tex) => ({ x: 0, y: 0, width: tex.width, height: tex.height })
        if (b.top) {
            const dest = { x: pos.x + s, y: pos.y, width: this.w - s * 2, height: s }
            r.DrawTexturePro(b.top, src(b.top), dest, { x: 0, y: 0 }, 0, r.WHITE)
        }
        if (b.bottom) {
            const dest = { x: pos.x + s, y: pos.y + this.h - s, width: this.w - s * 2, height: s }
            r.DrawTexturePro(b.bottom, src(b.bottom), dest, { x: 0, y: 0 }, 0, r.WHITE)
        }
        if (b.left) {
            const dest = { x: pos.x, y: pos.y + s, width: s, height: this.h - s * 2 }
            r.DrawTexturePro(b.left, src(b.left), dest, { x: 0, y: 0 }, 0, r.WHITE)
        }
        if (b.right) {
            const dest = { x: pos.x + this.w - s, y: pos.y + s, width: s, height: this.h - s * 2 }
            r.DrawTexturePro(b.right, src(b.right), dest, { x: 0, y: 0 }, 0, r.WHITE)
        }
    }
}

