import * as r from "raylib";
import { useMaster } from "./ctx/Master";
import { createSignal } from "solid-js";

function MenuButton(props){
    //props.action = fn to call on click

    const [getHovered, setHovered] = createSignal(false);

    return <button
        x={40} y={props.y} w={200} h={40}
        onClick={props.action}
        onHover={ setHovered }
        bg={getHovered() ? r.DARKGRAY : r.GRAY}
    >
        <text x={10} y={10} fontSize={20} color={r.GREEN}>
            {props.children}
        </text>
    </button>
}

export function MainMenu(props) {
    const {window, state, server} = useMaster()
    console.log(props)
    return (
        <box x={0} y={0} w={window.width} h={window.height}>
            <text x={40} y={40} fontSize={40} color={r.WHITE}>
                GenericName
            </text>

            <MenuButton y={120} action={() => { server.postMessage({ type: "move_state", newState: "game" }) }}>
                Start Game
            </MenuButton>

            <MenuButton y={180} action={() => { props.setUIDEV(true) }}>
                GUI Dev Test
            </MenuButton>
                

            <text x={40} y={680} fontSize={14} color={r.GRAY}>
                {`tick: ${state()?.tick ?? 0}`}
                {`screen: ${state()?.screen}`}
            </text>
        </box>
    );
}
