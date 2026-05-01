import { RootNode } from "./nodes/PointNode.js"
import { ButtonNode } from "./nodes/ButtonNode.js"
import { render } from "./reconciler.js"

export default class SolidUI {
    constructor() {
        this.root = new RootNode()
        this._dispose = null
    }

    // Mount a JSX tree. Call once (or call again to remount).
    // `component` is a function returning JSX: () => <MyApp />
    mount(component) {
        if (this._dispose) this._dispose()
        this._dispose = render(component, this.root)
    }

    // Call every frame BEFORE draw, inside BeginDrawing/EndDrawing.
    // Handles input for button nodes, then draws the full tree.
    draw() {
        this._processInput(this.root)
        this.root.draw()
    }

    // Walk tree and let interactive nodes handle input
    _processInput(node) {
        if (node instanceof ButtonNode) {
            node.handleInput()
        }
        for (const child of node.children) {
            this._processInput(child)
        }
    }

    dispose() {
        if (this._dispose) {
            this._dispose()
            this._dispose = null
        }
    }
}
