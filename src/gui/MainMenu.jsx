export function MainMenu(props) {
    return (
        <box x={0} y={0} w={props.width} h={props.height}>
            <text x={40} y={40} fontSize={40} color={props.r.WHITE}>
                GenericName
            </text>
            <button
                x={40} y={120} w={200} h={40}
                onClick={() => {
                    props.server.postMessage({ type: "move_state", newState: "game" });
                }}
            >
                <text x={0} y={10} fontSize={20} color={props.r.GREEN}>
                    New Game
                </text>
            </button>
            <text x={40} y={680} fontSize={14} color={props.r.GRAY}>
                {`tick: ${props.state?.tick ?? 0}`}
                {`screen: ${props.state?.screen}`}
            </text>
        </box>
    );
}
