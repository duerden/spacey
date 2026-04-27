import * as r from "raylib";
import {logRenderer as log} from "../util/log"
import AssetLoader from "./AssetLoader"
import { createSignal } from "solid-js"
import SolidUI from "../cursed-ui/SolidUI.js"
import { createComponent } from "../cursed-ui/reconciler.js"
import Root from "../gui/Root.jsx"

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
        this.fps = fps;

        r.InitWindow(
            this.width,
            this.height,
            this.title
        )

        this.state = {}
        this.workers = []


        // who cares if this is sync
        const loader = new AssetLoader();
        loader.onAssetLoadSometimes((progress)=>{
            var str = `Loading: ${progress.name}s\n[${progress.currentFile}/${progress.totalFiles}]\n${progress.file}`
            this.drawLoading(str);
        })
        this.assets = loader.load()

        // reactive state signal -- updated from worker, read by JSX
        const [state, setState] = createSignal(this.state)
        this._getState = state
        this._setState = setState

        // server handles ticking and sim and general state off threaed
        this.server = new Worker("./src/simulation/Server.js")
        this.server.addEventListener("message", (event) => {
            this.state = event.data
            this._setState(event.data) //update UI
        });
        this.server.addEventListener("error", (error)=>{
            console.error("server error!")
            throw error
        })
        this.workers.push(this.server)

        // solid UI layer
        this.ui = new SolidUI()
        this.mountScreen()

        this.render();
    }

    mountScreen() {
        const self = this
        this.ui.mount(() => {
            return createComponent(Root, {
                get state() { return self._getState() },
                server: self.server,
                width: self.width,
                height: self.height,
                r,
            })
        })
    }

    //stuff that renders at vsync
    //only ever entered after loading 
    async render/*loop*/(){
        r.SetTargetFPS(this.fps)
        while (!r.WindowShouldClose()) {
            await Bun.sleep(0)
            r.BeginDrawing();
            r.ClearBackground(r.BLACK);

            // game-world drawing goes here (raw raylib calls)
            switch (this.state?.screen) {
                case "game":
                    this.drawGame();
                    break;
            }

            // UI layer draws over everything
            this.ui.draw();

            r.EndDrawing();
        }

        this.ui.dispose()
        await this.close()
        log("goodbye!")
    }

    close(){
        for(let worker of this.workers){
            worker.terminate()
        }
    }

    drawGame(){
        // raw raylib game world drawing goes here
    }

    //draws just once.
    drawLoading(str){
        r.BeginDrawing();
            r.ClearBackground(r.BLACK);
            r.DrawText(str, 10, 10, 20, r.WHITE);
        r.EndDrawing();
    }
}



export default GameHost