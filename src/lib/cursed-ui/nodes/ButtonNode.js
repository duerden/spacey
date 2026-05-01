import * as r from "raylib";
import { BoxNode } from "./BoxNode";


// cursor-interactable region. Fires onClick when mouse clicks inside bounds.

export class ButtonNode extends BoxNode {
    constructor(tag = "button") {
        super(tag)

        //basic events
        this.onMouseDown = null
        this.onMouseUp = null
        this.onCursorEnter = null
        this.onCursorLeave = null

        this._pressed = false
        this._hovered = false

        // actually useful events
        this.onClick = null
        this.onHover = null
        this.onChange = null

        this._hovered_last = false
        this._changed = false

        this.button = r.MOUSE_BUTTON_LEFT
    }

    // called by SolidUI.update() each frame before draw
    handleInput() {
        const pos = this.absPos()
        const mouse = r.GetMousePosition()
        const rect = { x: pos.x, y: pos.y, width: this.w, height: this.h }

        this._hovered = r.CheckCollisionPointRec(mouse, rect)

        if(this._hovered_last && !this._hovered) { //cursor left this frame
            if(this.onHover) {this.onHover(false)}
            if(this.onCursorEnter) {this.onCursorLeave()}
            this._changed = true
        }
        if(!this._hovered_last && this._hovered){ //cursor entered this frame
            if(this.onHover) {this.onHover(true)}
            if(this.onCursorEnter) {this.onCursorEnter()}
            this._changed = true
        }

        this._hovered_last = this._hovered
        

        if (this._hovered && r.IsMouseButtonPressed(this.button)) {
            if (this.onClick) {this.onClick()}
            if (this.onMouseDown) {this.onMouseDown()}
            this._pressed = true
            this._changed = true
        }

        if (this._pressed && r.IsMouseButtonReleased(this.button)) {
            if (this.onMouseUp) {this.onMouseUp()}
            this._pressed = false
            this._changed = true
        }

        if (this._changed) {
            if(this.onChange) {this.onChange(this._hovered, this._pressed)}
            this._changed = false
        }
    }
}
