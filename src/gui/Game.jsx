export function Game(props) {
    return (
        <box x={10} y={10} w={props.width} h={props.height}>
            <text>imagine a game here</text>
            <button y={30} w={200} h={40} bg={props.r.GRAY} onClick={() => {
                props.server.postMessage({ type: "move_state", newState: "main_menu" });
            }}>
                <text x={10} y={10}> -- go back</text>
            </button>
        </box>
    );
}
