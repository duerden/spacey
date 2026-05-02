import * as r from "raylib";
import { useMaster } from "./ctx/Master";

export function Game(props) {
    var {window, server} = useMaster()
    return (
        <box x={10} y={10} w={window.width} h={window.height}>
            <text>imagine a game here</text>
            <button y={30} w={200} h={40} bg={r.GRAY} onClick={() => {
                server.callMethod("moveState", "main_menu");
            }}>
                <text x={10} y={10}> -- go back</text>
            </button>
        </box>
    );
}
