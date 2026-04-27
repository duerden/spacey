import * as r from "raylib";
import { UINode } from "./UINode";


// Renders into an offscreen RenderTexture2D, then composites at (x,y).
// Use: give it a `renderFn` prop -- a function that receives (rt) and draws into it.
// Each frame: BeginTextureMode -> renderFn() -> EndTextureMode -> DrawTexture

export class FramebufferNode extends UINode {
    constructor() {
        super("framebuffer")
        this._rt = null
        this._rtW = 0
        this._rtH = 0
        this.renderFn = null
    }

    _ensureRT() {
        if (this.w <= 0 || this.h <= 0) return
        if (this._rt && this._rtW === this.w && this._rtH === this.h) return
        if (this._rt) r.UnloadRenderTexture(this._rt)
        this._rt = r.LoadRenderTexture(this.w, this.h)
        this._rtW = this.w
        this._rtH = this.h
    }

    drawSelf() {
        if (!this.renderFn || this.w <= 0 || this.h <= 0) return
        this._ensureRT()
        if (!this._rt) return

        // draw into the offscreen buffer
        r.BeginTextureMode(this._rt)
        r.ClearBackground(r.BLANK)
        this.renderFn(this._rt)
        r.EndTextureMode()

        // composite onto the screen
        // RenderTexture is flipped vertically, so we negate height in source rect
        const pos = this.absPos()
        const src = { x: 0, y: 0, width: this.w, height: -this.h }
        const dest = { x: pos.x, y: pos.y, width: this.w, height: this.h }
        r.DrawTexturePro(this._rt.texture, src, dest, { x: 0, y: 0 }, 0, r.WHITE)
    }

    destroy() {
        if (this._rt) {
            r.UnloadRenderTexture(this._rt)
            this._rt = null
        }
    }
}
