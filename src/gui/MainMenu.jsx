import * as r from "raylib";
import { useMaster } from "./ctx/Master";

export function MainMenu(props) {
    const {window, state, server} = useMaster()
    return (
        <box x={0} y={0} w={window.width} h={window.height}>
            <text x={40} y={40} fontSize={40} color={r.WHITE}>
                GenericName
            </text>
            <button
                x={40} y={120} w={200} h={40}
                onClick={() => {
                    server.postMessage({ type: "move_state", newState: "game" });
                }}
            >
                <text x={0} y={10} fontSize={20} color={r.GREEN}>
                    New Game
                </text>
            </button>
            <text x={40} y={680} fontSize={14} color={r.GRAY}>
                {`tick: ${state()?.tick ?? 0}`}
                {`screen: ${state()?.screen}`}
            </text>
        </box>
    );
}
