import { TextNode } from "./nodes/TextNode"
import { BoxNode, StyledBoxNode } from "./nodes/BoxNode"
import { ButtonNode } from "./nodes/ButtonNode"
import { FramebufferNode } from "./nodes/FramebufferNode"
import { PointNode } from "./nodes/PointNode"
import { AssetNode } from "./nodes/AssetNode"

// Tag -> Node class mapping. The reconciler uses this.
export const NODE_TYPES = {
    point: PointNode,
    box: BoxNode,
    text: TextNode,
    button: ButtonNode,
    styledbox: StyledBoxNode,
    framebuffer: FramebufferNode,
    asset: AssetNode
}
