import { TextNode } from "./nodes/TextNode"
import { BoxNode, StyledBoxNode } from "./nodes/BoxNode"
import { ButtonNode } from "./nodes/ButtonNode"
import { FramebufferNode } from "./nodes/FramebufferNode"
import { PointNode } from "./nodes/PointNode"
import { AssetNode } from "./nodes/AssetNode"
import {
    PhysPointEntityNode,
    PhysThingEntityNode
} from "./nodes/PhysicsRepresentationNodes"

// Tag -> Node class mapping. The reconciler uses this.
export const NODE_TYPES = {
    //base
    point: PointNode,

    //raylib
    box: BoxNode,
    text: TextNode,
    button: ButtonNode,
    styledbox: StyledBoxNode,
    framebuffer: FramebufferNode,
    asset: AssetNode,

    //phys
    phys_point_entity: PhysPointEntityNode,
    phys_thing_entity: PhysThingEntityNode,
}
