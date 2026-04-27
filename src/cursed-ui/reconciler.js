import { createRenderer } from "./universal.js"
import { NODE_TYPES } from "./nodes.js"
import { UINode, RootNode } from "./nodes/UINode.js"
import { RawTextNode } from "./nodes/TextNode.js"

// Slot node -- used by Solid as a marker/placeholder in the tree
class SlotNode extends UINode {
    constructor() {
        super("slot")
    }
}

export const {
    render,
    effect,
    memo,
    createComponent,
    createElement,
    createTextNode,
    insertNode,
    insert,
    spread,
    setProp,
    mergeProps,
    use,
} = createRenderer({

    createElement(tag) {
        const NodeClass = NODE_TYPES[tag]
        if (!NodeClass) {
            // unknown tag -- just make a generic UINode so we don't crash
            console.warn(`[ui] unknown element <${tag}>, using generic UINode`)
            return new UINode(tag)
        }
        return new NodeClass()
    },

    createTextNode(value) {
        return new RawTextNode(value)
    },

    createSlotNode() {
        return new SlotNode()
    },

    isTextNode(node) {
        return node instanceof RawTextNode
    },

    replaceText(node, value) {
        if (node instanceof RawTextNode) {
            node.text = String(value)
        }
    },

    setProperty(node, name, value, prev) {
        // event handlers: onClick, onHover, etc
        if (name.startsWith("on") && name.length > 2) {
            // keep camelCase as-is: onClick -> onClick
            node[name] = value
            return
        }

        // everything else: just set it
        node[name] = value
    },

    insertNode(parent, node, anchor) {
        if (!parent || !node) return
        if (anchor) {
            const i = parent.children.indexOf(anchor)
            parent.add(node, i !== -1 ? i : undefined)
        } else {
            parent.add(node)
        }
    },

    removeNode(parent, node) {
        if (!parent || !node) return
        parent.remove(node)
        // clean up framebuffer resources
        if (node.destroy) node.destroy()
    },

    getParentNode(node) {
        return node?.parent ?? undefined
    },

    getFirstChild(node) {
        return node?.children?.[0] ?? undefined
    },

    getNextSibling(node) {
        if (!node?.parent) return undefined
        const siblings = node.parent.children
        const i = siblings.indexOf(node)
        return (i !== -1 && i < siblings.length - 1) ? siblings[i + 1] : undefined
    },
})
