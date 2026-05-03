import * as r from "raylib";
import { PointNode } from "./PointNode";
import { useMaster } from "../../../gui/ctx/Master";
import {logUI as log} from "../../../util/log"

// intended to debug locations of Physics::PointEntity

export class PhysPointEntityNode extends PointNode {
    constructor(tag = "phys_point_entity") {
        super(tag)

        this.tex = /* r.Texture*/ useMaster().assets.get("/img/phys_rn/point_entity.png")
        this.iox = -Math.floor(this.tex.width / 2)
        this.ioy = -Math.floor(this.tex.height / 2)
    }

    // draws TEXTURES
    drawSelf() {
        const pos = this.absPos()

        r.DrawTexture(this.tex, pos.x + this.iox, pos.y + this.ioy, r.WHITE)
    }
}

// intended to debug locations and rotations of Physics::ThingEntity

export class PhysThingEntityNode extends PointNode {
    constructor(tag = "phys_thing_entity") {
        super(tag)

        this.tex = /* r.Texture*/ useMaster().assets.get("/img/phys_rn/thing_entity.png") // arrow in texture points north
        this.r = 0 // rotation in radians, synced from physics
    }

    // draws TEXTURES (rotated via DrawTexturePro)
    drawSelf() {
        const pos = this.absPos()
        const w = this.tex.width
        const h = this.tex.height

        const src = { x: 0, y: 0, width: w, height: h }
        const dest = { x: pos.x, y: pos.y, width: w, height: h }
        const origin = { x: Math.floor(w / 2), y: Math.floor(h / 2) }
        const deg = this.r * (180 / Math.PI)

        r.DrawTexturePro(this.tex, src, dest, origin, deg, r.WHITE)
    }
}

// we purposefully dont allow the UI to pass assets by r.Texture instance.
// if youre doing texture loading in the gui, youre doing it wrong!! stop it!!

