import * as r from "raylib";
import {Switch, Match, createSignal} from "solid-js"
import {logUI as log} from "../util/log"
import { MainMenu } from "./MainMenu";
import { Game } from "./Game";
import { UIDevTestComponent } from "./UIDevTest";

import { MasterProvider, useMaster } from "./ctx/Master";

function Providers(props){
    //console.log(props)
    return (
        <MasterProvider value={{
            state: props.state,
            server: props.server,
            window: {
                width: props.width,
                height: props.height,
            },
            assets: props.assets
        }}>
            {props.children}
        </MasterProvider>
    )
}

const UIDEV = false;

function Root(props) {
    var [getUIDEV, setUIDEV] = createSignal(false);

    return (
        <Providers {...props}>
            <Switch fallback={<WTF />}>
                <Match when={getUIDEV()}>
                    <UIDevTestComponent />
                </Match>


                <Match when={props.state()?.screen == "main_menu"}>
                    <MainMenu setUIDEV={setUIDEV}/>
                </Match>
                <Match when={props.state()?.screen == "lobby"}>
                    <Game />
                </Match>
                <Match when={props.state()?.screen == "game"}>
                    <Game />
                </Match>
            </Switch>
        </Providers>
    )
}

function WTF(props){
    var {window, state} = useMaster()
    return (
        <box x={0} y={0} w={window.width} h={window.height}>
            <text fontSize={20} color={r.RED}>
                how did you get here?
                screen: {`${state()?.screen}`}
            </text>
        </box>
    )
}

export default Root;
