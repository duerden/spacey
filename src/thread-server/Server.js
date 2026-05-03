//declare var self: Worker;
import {logServer as log} from "../util/log"
import { ChannelWorkerClient } from "../lib/channel-worker/ChannelWorker";

import {World, PointEntity} from "./Physics"

const HZ = 128; //tps

class Server extends ChannelWorkerClient {
    constructor(){
        super(self)
        log("Hello i am a server meep moop")

        this.state = {
            tick: 0,
            screen: "main_menu",
            world: {
                active: false,
                entities: []
            }
        }

        this.actions = new Map([
            ["player_forwards",  (active) => this.processPlayerInput("player_forwards", active)],
            ["player_left",      (active) => this.processPlayerInput("player_left", active)],
            ["player_backwards", (active) => this.processPlayerInput("player_backwards", active)],
            ["player_right",     (active) => this.processPlayerInput("player_right", active)],
            ["player_stop",      (active) => this.processPlayerInput("player_stop", active)]
        ])

        this.world = new World(1000 / HZ)

        this.ref_player = this.world.getEntityByName("player")
        this.startTicking()

        self.addEventListener("channel_keybinds", (e) => this.processBind(e.data))
    }

    //
    // communication up
    //

    syncState(){
        this.postMessage("channel_ui_state", this.state)
    }

    //
    // communication down
    //

    moveState(newState){
        this.world.stop()
        switch(newState){
            case "game":
                //idk add some entities or something.
                this.state.screen = "game"
                this.world.start()
                break;
            case "main_menu":
                //remove entities or something
                this.state.screen = "main_menu"
                break;
        }
    }

    processBind({action, active}) {
        const ourAction = this.actions.get(action)
        if(ourAction){
            log(action, active)
            return ourAction(active)
        }else{
            log("WARNING! Unknown action!", action)
        }
    }

    //
    // tick loop
    //

    startTicking(){
        const interval = 1000 / HZ;
        var lastTick = performance.now();

        const loop = () => {
            const start = performance.now();
            const drift = start - lastTick - interval;
            lastTick = start;

            this.tick(interval /* THIS IS NOT FIXED SO DT ONLY SCALES WITH TARGET TICK RATE. IT WILL BITE YOU IN THE ASS LATER */);

            const elapsed = performance.now() - start;
            if (elapsed > interval) {
                console.warn(`[server] tick ${this.state.tick} took ${elapsed.toFixed(2)}ms (budget: ${interval.toFixed(2)}ms)`);
            }

            const next = Math.max(0, interval - (performance.now() - start));
            setTimeout(loop, next);
        };

        setTimeout(loop, interval);
    }

    tick(mspt){
        this.state.tick++;
        
        //physics
        this.world.step(mspt)

        this.state.world = this.serialiseWorld()
        this.syncState()
    }

    serialiseWorld(){
        return {
            active: this.world.active,
            entities: this.world.active ? this.world.entities : []
        }
    }

    //
    // physics
    //

    processPlayerInput(direction, active){
        //console.log(this.ref_player)
        switch(direction){
            case "player_forwards":
                this.ref_player.thr_fwd = active
            break;
            case "player_backwards":
                this.ref_player.thr_rvs = active
            break;
            case "player_left":
                this.ref_player.thr_l = active
            break;
            case "player_right":
                this.ref_player.thr_r = active
            break;
            case "player_stop":
                this.ref_player.thr_inertia_damp = active
        }
    }



}

var server = new Server();
