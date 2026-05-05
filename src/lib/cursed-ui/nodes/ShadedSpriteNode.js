import * as r from "raylib";
import { PointNode } from "./PointNode";
import { useMaster } from "../../../gui/ctx/Master";

// A sprite node designed for the lit rendering pipeline.
// Holds a TextureBundle and draws into diffuse/normal passes.
//
// Usage in JSX:
//   <shaded_sprite src="/img/blob_kitty" />
//
// The `src` prop should be the base path (without extension).
// The TextureBundle is fetched via assets.getBundle().

export class ShadedSpriteNode extends PointNode {
    constructor(tag = "shaded_sprite") {
        super(tag)

        this._src = null
        this.bundle = null // TextureBundle { diffuse, normal, specular, dynamic }
        this.r = 0 // rotation in radians
    }

    get src() {
        return this._src
    }

    set src(v) {
        this._src = v
        this.bundle = useMaster().assets.getBundle(v)
    }

    // Shared draw logic — draws a given texture at this node's position/rotation/scale
    _drawTex(tex) {
        if (!tex) return
        const pos = this.absPos()
        const w = tex.width * pos.scale
        const h = tex.height * pos.scale

        const src = { x: 0, y: 0, width: tex.width, height: tex.height }
        const dest = { x: pos.x, y: pos.y, width: w, height: h }
        const origin = { x: Math.floor(w / 2), y: Math.floor(h / 2) }
        const deg = this.r * (180 / Math.PI)

        r.DrawTexturePro(tex, src, dest, origin, deg, r.WHITE)
    }

    // Called during diffuse pass (by LitSceneNode)
    drawDiffuse() {
        if (!this.bundle) return
        this._drawTex(this.bundle.diffuse)
    }

    // Called during normal pass (by LitSceneNode)
    drawNormal() {
        if (!this.bundle) return
        this._drawTex(this.bundle.normal)
    }

    // Called during specular pass (by LitSceneNode)
    drawSpecular() {
        if (!this.bundle) return
        this._drawTex(this.bundle.specular)
    }

    // Not used in the lit pipeline — drawSelf is a no-op for shaded sprites.
    // All rendering happens through the LitSceneNode passes.
    drawSelf() {}
}
