import * as r from "raylib";
import { useMaster } from "./ctx/Master";
import { For } from "solid-js";
import {logUI as log} from "../util/log"

function SmartEntityNode(props){
    switch(props.type){
        case "PointEntity":
            return <phys_point_entity {...props} />
        break;
        case "ThingEntity":
        case "ShipEntity":
            return <phys_thing_entity {...props} />
        break;
        default:
            log("UNKNOWN NODE TYPE", props.type)
        break;
    }
    return null
}


export function Game(props) {
    var {window, server, state} = useMaster()

    return (
        <box x={0} y={0} w={window.width} h={window.height}>
            <box>
                <button w={200} h={40} bg={r.GRAY} onClick={() => {
                    server.callMethod("moveState", "main_menu");
                }}>
                    <text x={10} y={10}> -- go back</text>
                </button>
            </box>
            <box>
                <text x={2} visible={state().playerEntity.inertia_damp} y={window.height - 20} color={r.RED}>[Damping Movement]</text>
            </box>
            <box x={0} y={0} w={window.width} h={window.height}>
                {/* shift center of screen to 0,0 */}
                <point x={Math.floor(window.width/2)} y={Math.floor(window.height/2)}>
                    <For each={state().world.entities}>
                        {(ent, idx) => (
                            <SmartEntityNode {...ent} />
                        )}
                    </For>
                </point>
            </box>
        </box>
    );
}
