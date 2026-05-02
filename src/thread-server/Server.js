//declare var self: Worker;
import {logServer as log} from "../util/log"
import { ChannelWorkerClient } from "../lib/channel-worker/ChannelWorker";

const HZ = 128; //tps

class Server extends ChannelWorkerClient {
    constructor(){
        super(self)
        log("Hello i am a server meep moop")

        this.state = {
            tick: 0,
            screen: "main_menu"
        }

        this.syncState()
        this.startTicking()
    }
    
    startTicking(){
        const interval = 1000 / HZ;
        var lastTick = performance.now();

        const loop = () => {
            const start = performance.now();
            const drift = start - lastTick - interval;
            lastTick = start;

            this.tick();

            const elapsed = performance.now() - start;
            if (elapsed > interval) {
                console.warn(`[server] tick ${this.state.tick} took ${elapsed.toFixed(2)}ms (budget: ${interval.toFixed(2)}ms)`);
            }

            const next = Math.max(0, interval - (performance.now() - start));
            setTimeout(loop, next);
        };

        setTimeout(loop, interval);
    }

    syncState(){
        this.postMessage("channel_ui_state", this.state)
    }

    tick(){
        //do sum stuff
        this.state.tick++;
        this.syncState()
    }

    moveState(newState){
        switch(newState){
            case "game":
                //idk add some entities or something.
                this.state.screen = "game"
                break;
            case "main_menu":
                //remove entities or something
                this.state.screen = "main_menu"
                break;
        }
    }

}

var server = new Server();
