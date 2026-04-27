import {Switch, Match, For, createSignal} from "solid-js"
import {logUI as log} from "../util/log"
import { MainMenu } from "./MainMenu";
import { Game } from "./Game";

const UIDEV = true;

function Root(props) {
    return (
        <Switch fallback={<UIDevTestComponent {...props} />}>
            <Match when={!UIDEV}>
                <Switch fallback={<WTF {...props} />}>
                    <Match when={props.state?.screen == "main_menu"}>
                        <MainMenu {...props} />
                    </Match>
                    <Match when={props.state?.screen == "game"}>
                        <Game {...props} />
                    </Match>
                </Switch>
            </Match>
        </Switch>

    )
}

function WTF(props){
    return (
        <box x={0} y={0} w={props.width} h={props.height}>
            <text fontSize={20} color={props.r.RED}>
                how did you get here?
                screen: {`${props.state?.screen}`}
            </text>
        </box>
    )
}

function UIDevTestComponent(props){
    const DEFAULT_FONT = props.r.GetFontDefault()
    const [bg, setBg] = createSignal(props.r.GRAY)
    const [fg, setFg] = createSignal(props.r.WHITE)

    const [bg2, setBg2] = createSignal(props.r.GRAY)
    const [fg2, setFg2] = createSignal(props.r.WHITE)
    return (
        <box x={20} y={20} w={props.width - 40} h={props.height - 40}>
            <For each={[
                // [fontsize, offset_from_top]
                [10, 0],
                [20, 10],
                [30, 30],
                [40, 60],
                [50, 100]
            ]}>
                {([fontSize, offset], i)=>(<text y={offset} fontSize={fontSize}>text</text>)}
            </For>

            <button x={200} w={220} h={40} bg={bg()}
            
                /* Generally, these 4 are good for basic appearance changes. */
                /* Dont use these for mixed hover/press changes if they all change the same attr */
                onMouseDown={   () => {console.log("onMouseDown")  ; setBg(props.r.DARKGRAY)}}
                onMouseUp={     () => {console.log("onMouseUp")    ; setBg(props.r.GRAY)}}
                onCursorEnter={ () => {console.log("onCursorEnter"); setFg(props.r.YELLOW)}}
                onCursorLeave={ () => {console.log("onCursorLeave"); setFg(props.r.WHITE)}}

                /* these two are intended for generic functions and are just aliased to the above */
                onClick={(...a) => {console.log("onClick", ...a)}}
                onHover={(...a) => {console.log("onHover", ...a)}} //fires twice, once for mouse in where arg[0] is true, then once for mouse out where arg[1] is false

                /* all of the above! good for lookup-style styling. */
                onChange={(hovered, pressed) => console.log("->", "hovered", hovered, "pressed", pressed)}
            >
                <text x={10} y={10} color={fg()}>click and hover me</text>
            </button>

            <button x={200} y={60} w={220} h={40} bg={bg2()}
                /* an example of the above lookup styling. */
                onChange={(hovered, pressed) => {
                    setFg2(hovered ? props.r.YELLOW : props.r.WHITE)
                    setBg2(pressed ? props.r.DARKGRAY : props.r.GRAY)
                }}
            >
                <text x={10} y={10} color={fg2()}>click and hover me</text>
            </button>

        </box>
    )
}

export default Root;
