import * as r from "raylib";
import {logRenderer as log} from "../util/log.js"
import AssetLoader from "./AssetLoader.js"
import { createSignal } from "solid-js"
import SolidUI from "../lib/cursed-ui/SolidUI.js"
import { createComponent } from "../lib/cursed-ui/reconciler.js"
import Root from "../gui/Root.jsx"
import { ChannelWorkerHost } from "../lib/channel-worker/ChannelWorker.js";

class GameHost {
    constructor(
        width = 1280,
        height = 720,
        title = "raylib [core] example - basic window",
        fps = 60,
    ) {
        //setup actual window
        this.width = width;
        this.height = height;
        this.title = title;
        this.fps = fps; //vsync?

        this.setupWindow()
        this.keybinds = this.setupKeybinds()
        this.assets = this.setupAssets()
        /* setupWorkers */ {
            this.workers = new Map()
            this.setupStateWorker()
            //network?
        }

        this.setupUI()

        //all good to go!
        this.render();
    }

    setupKeybinds(){
        r.SetExitKey(r.KEY_NULL)

        //later: read a config file?
        //raylib key, intents, action name, conditional?

        //key is the raylib key id.

        //intents are *when* a key is sent to the server:
        // once: tell the server this key has been pressed once. never that its been released.
        // constant: tell the server when this key changes from up to down
        // toggle: tell the server when we tap this key, and flip its state on/off

        //action names just identify the name of this action. any string

        //conditionals only send updates for this key when conditional is true. set to true to always send it.


        //essentially we rename keys
        const default_binds = [
            //global keys
            [r.KEY_LEFT_ALT, "toggle", "debug_enable",     ()=>true],
            [r.KEY_ESCAPE, "once",     "quit",             ()=>this.state.screen == "main_menu"],
            [r.KEY_ESCAPE, "once",     "open_pause_menu",  ()=>this.state.screen == "game"],
            [r.KEY_M,      "toggle",   "open_map",         ()=>this.state.screen == "game"],

            [r.KEY_W,      "constant", "player_forwards",  ()=>this.state.screen == "game"],
            [r.KEY_A,      "constant", "player_left",      ()=>this.state.screen == "game"],
            [r.KEY_S,      "constant", "player_backwards", ()=>this.state.screen == "game"],
            [r.KEY_D,      "constant", "player_right",     ()=>this.state.screen == "game"],
            [r.KEY_LEFT_SHIFT, "constant", "player_stop",      ()=>this.state.screen == "game"],
        ]//.map(key => ({key: key[0], intent: key[1], action: key[2], conditional:key[3], active:false}))

        var binds = new Map(default_binds.map( (key) => (
            [key[2], {key: key[0], intent: key[1], action: key[2], conditional:key[3], active:false}]
        )))

        console.log(binds)

        return binds
    }

    setupWindow(){
        r.InitWindow(
            this.width,
            this.height,
            this.title
        )
    }

    setupAssets(){
        // INTENTIONALLY SYNC
        const loader = new AssetLoader();
        loader.onAssetLoadSometimes((progress)=>{
            var str = `Loading: ${progress.name}s\n[${progress.currentFile}/${progress.totalFiles}]\n${progress.file}`
            this.drawLoading(str);
        })
        return loader.load()
    }

    setupStateWorker(){
        this.state = {}

        // reactive state signal -- updated from worker, read by JSX
        const [getUiState, setUiState] = createSignal(this.state)
        this._getUiState = getUiState
        this._setUiState = setUiState

        // server handles ticking and sim and general state off threaed
        this.server = new ChannelWorkerHost("./src/thread-server/Server.js")
        this.server.addEventListener("channel_ui_state", (event) => {
            this.state = event.data
            this._setUiState(event.data) //update UI
        });

        this.server.addEventListener("error", (error)=>{
            console.error("server error!")
            throw error
        })
        this.workers.set("thread-server", this.server)
    }

    setupUI(){
        // solid UI layer
        this.ui = new SolidUI()
        const self = this
        this.ui.mount(() => {
            return createComponent(Root, {
                state: this._getUiState,
                server: self.server,
                width: self.width,
                height: self.height,
                assets: self.assets
            })
        })
    }

    processKeys(){
        const tell_server = (action, active, tidbit) => {
            var packet = {
                action,
                active
            }
            //log(tidbit, action, active)
            this.server.postMessage("channel_keybinds", {action, active})
        }
        const action_change = (action, active) => {
            tell_server(action, active, "action changed!")
        }
        const action_once = (action, active) => {
            tell_server(action, active, "action pressed!")
        }
        const action_toggle = (action, active) => {
            tell_server(action, active, "action toggled!")
        }

        for(let [_, bind] of this.keybinds){
            if(bind.conditional()){
                if(bind.intent == "constant"){
                    var pressed = r.IsKeyDown(bind.key)
                    if(bind.active != pressed){ action_change(bind.action, pressed) }
                    bind.active = pressed

                }else if(bind.intent == "once"){
                    var pressed = r.IsKeyPressed(bind.key)
                    if(bind.active != pressed){ action_change(bind.action, pressed) }
                    bind.active = pressed

                }else if(bind.intent == "toggle") {
                    if(r.IsKeyPressed(bind.key)) {
                        bind.active = !bind.active
                        action_toggle(bind.action, bind.active)
                    }
                }
            }
        }

        return this.keybinds
    }

    //stuff that renders at vsync
    //only ever entered after loading 
    async render/*loop*/(){
        r.SetTargetFPS(this.fps)

        while (!r.WindowShouldClose()) {
            this.processKeys()

            if(this.keybinds.get("quit").active){
                break
            }

            await Bun.sleep(0); //allow eventlisteners to tick before us

            r.BeginDrawing(); {
                r.ClearBackground(r.BLACK);

                // UI layer draws over everything
                this.ui.draw();
            }; r.EndDrawing();
        }

        this.quit()
    }

    async quit(){
        log("quitting!")
        this.ui.dispose()
        await this.closeWorkers()
        r.CloseWindow()
        log("goodbye user! :D")
    }

    closeWorkers(){
        for(let [name, worker] of this.workers){
            log("goodbye", name, "!")
            worker.terminate()
        }
    }

    //draws just once.
    drawLoading(str){
        r.BeginDrawing(); {
            r.ClearBackground(r.BLACK);
            r.DrawText(str, 10, 10, 20, r.WHITE);
        }; r.EndDrawing();
    }
}



export default GameHost