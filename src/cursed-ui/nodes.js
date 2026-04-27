import { TextNode } from "./nodes/TextNode"
import { BoxNode, StyledBoxNode } from "./nodes/BoxNode"
import { ButtonNode } from "./nodes/ButtonNode"
import { FramebufferNode } from "./nodes/FramebufferNode"
import { UINode } from "./nodes/UINode"

// Tag -> Node class mapping. The reconciler uses this.
export const NODE_TYPES = {
    box: BoxNode,
    text: TextNode,
    button: ButtonNode,
    styledbox: StyledBoxNode,
    framebuffer: FramebufferNode,
}
