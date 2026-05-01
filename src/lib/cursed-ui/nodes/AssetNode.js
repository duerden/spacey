import * as r from "raylib";
import { BoxNode } from "./BoxNode";
import { useMaster } from "../../../gui/ctx/Master";
import {logUI as log} from "../../../util/log"

// draws as asset from AssetLoader

export class AssetNode extends BoxNode {
    constructor(tag = "asset") {
        super(tag)

        this.src, this._src = "/img/unknown_asset.png" //cursed
        this.raylibAsset = null
    }

    get src() {
        return this._src
    }

    set src(v) {
        this._src = v

        //the assetloader is super robust and AssetDirectoryMap has moronproof:tm: protection, so assets.get should always return something vaguely valid
        this.raylibAsset = useMaster().assets.get(v)
        this.w = this.raylibAsset.width
        this.h = this.raylibAsset.height
    }

    // draws TEXTURES
    drawSelf() {
        if(!this.raylibAsset){
            if(this.src == "/img/unknown_asset.png"){
                log("im drawing an unknown asset!")
            }
        }
        const pos = this.absPos()

        super.drawSelf() //draws bg

        r.DrawTexture(this.raylibAsset, pos.x, pos.y, r.WHITE)

    }
}

// we purposefully dont allow the UI to pass assets by r.Texture instance.
// if youre doing texture loading in the gui, youre doing it wrong!! stop it!!

