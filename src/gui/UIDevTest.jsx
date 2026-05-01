import { createSignal, For } from "solid-js";
import * as r from "raylib";
import { useMaster } from "./ctx/Master";

export function UIDevTestComponent(props) {
    const DEFAULT_FONT = r.GetFontDefault();

    const [bg, setBg] = createSignal(r.GRAY);
    const [fg, setFg] = createSignal(r.WHITE);
    const [bg2, setBg2] = createSignal(r.GRAY);
    const [fg2, setFg2] = createSignal(r.WHITE);

    var {window} = useMaster()

    return (
        <box x={20} y={20} w={window.width - 40} h={window.height - 40}>
            <box x={0}>
                <For each={[
                    // [fontsize, offset_from_top]
                    [10, 0],
                    [20, 10],
                    [30, 30],
                    [40, 60],
                    [50, 100]
                ]}>
                    {([fontSize, offset], i) => (<text y={offset} fontSize={fontSize}>text</text>)}
                </For>
            </box>

            <box x={200}>
                <button w={220} h={40} bg={bg()}

                    /* Generally, these 4 are good for basic appearance changes. */
                    /* Dont use these for mixed hover/press changes if they all change the same attr */
                    onMouseDown={() => { console.log("onMouseDown"); setBg(r.DARKGRAY); } }
                    onMouseUp={() => { console.log("onMouseUp"); setBg(r.GRAY); } }
                    onCursorEnter={() => { console.log("onCursorEnter"); setFg(r.YELLOW); } }
                    onCursorLeave={() => { console.log("onCursorLeave"); setFg(r.WHITE); } }

                    /* these two are intended for generic functions and are just aliased to the above */
                    onClick={(...a) => { console.log("onClick", ...a); } }
                    onHover={(...a) => { console.log("onHover", ...a); } } //fires twice, once for mouse in where arg[0] is true, then once for mouse out where arg[1] is false


                    /* all of the above! good for lookup-style styling. */
                    onChange={(hovered, pressed) => console.log("->", "hovered", hovered, "pressed", pressed)}
                >
                    <text x={10} y={10} color={fg()}>click and hover me</text>
                </button>

                <button y={60} w={220} h={40} bg={bg2()}
                    /* an example of the above lookup styling. */
                    onChange={(hovered, pressed) => {
                        setFg2(hovered ? r.YELLOW : r.WHITE);
                        setBg2(pressed ? r.DARKGRAY : r.GRAY);
                        //note the order of these is important. if these both set bg, what should take precedence? (hint: its the press state)
                        //note that its possible for pressed:true hovered:false as a possible state, where you click, hold, and move cursour out
                        // of the bounding box. 
                    } }
                >
                    <text x={10} y={10} color={fg2()}>click and hover me</text>
                </button>
            </box>
            <box x={500}>
                <asset x={0  } y={0  } src={"/img/blob_kitty.png"} bg={r.WHITE}/>
                <asset x={128} y={0  } src={"/img/blob_kitty.png"}/>
                <asset x={0  } y={128} src={"/img/blob_kitty_inverted.png"} bg={r.WHITE}/>
                <asset x={128} y={128} src={"/img/blob_kitty_inverted.png"}/>
            </box>
        </box>
    );
}
