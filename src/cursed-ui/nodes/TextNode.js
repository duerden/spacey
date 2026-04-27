import * as r from "raylib";
import { UINode } from "./UINode";

// A text node that Solid's reconciler uses for raw string children
// (not a visible element -- just carries a string value)

export class RawTextNode extends UINode {
    constructor(value) {
        super("rawtext")
        this.text = String(value)
    }

    // raw text nodes don't draw directly -- their parent reads .text
    drawSelf() { }
}

// Plain text drawn at (x, y).
// If `text` prop is set, draws that. Otherwise collects text from RawTextNode children.

export class TextNode extends UINode {
    constructor() {
        super("text")
        this.text = ""
        this.fontSize = 20
        this.color = r.WHITE
    }

    _resolveText() {
        if (this.text) return this.text
        // gather from RawTextNode children
        const resolved = this.children
            .filter(c => c instanceof RawTextNode)
            .map(c => c.text)
            .join("\n")
        return resolved
    }

    drawSelf() {
        const str = this._resolveText()
        if (!str) return
        const pos = this.absPos()
        r.DrawText(str, pos.x, pos.y, this.fontSize, this.color)
    }
}

