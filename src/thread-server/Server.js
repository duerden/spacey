//declare var self: Worker;
import {logServer as log} from "../util/log"
import { ChannelWorkerClient } from "../lib/channel-worker/ChannelWorker";

import {World, PointEntity, DynamicShipEntity, ForceFieldEntity, LAYERS} from "./Physics"
import {Vector2} from "./Vector2"
import {FlightComputer} from "./FlightComputer"

export const HZ = 128; //tps

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
            ["player_forwards",  (active) => this.processPlayerInput("fwd", active)],
            ["player_left",      (active) => this.processPlayerInput("left", active)],
            ["player_backwards", (active) => this.processPlayerInput("back", active)],
            ["player_right",     (active) => this.processPlayerInput("right", active)],
        ])

        this.world = new World(1000 / HZ)

        // Ship hardware: thrusters are just physical descriptions.
        // The flight computer decides how to use them.
        const playerShip = new DynamicShipEntity({
            name: "player",
            layer: LAYERS.SHIPS,
            maxSpeed: 0.4,
            maxDr: 0.5 * (Math.PI / 180),
            thrusters: [
                // Main engines (center, fore/aft)
                { name: "main_fwd", offset: new Vector2(0, 0),  angle: 0,       maxThrust: 0.01 },
                { name: "main_rvs", offset: new Vector2(0, 0),  angle: Math.PI, maxThrust: 0.01 },
                // Maneuvering thrusters (offset from center, produce torque)
                { name: "rcs_fr",   offset: new Vector2(1, 0),  angle: 0,       maxThrust: 0.002 },
                { name: "rcs_fl",   offset: new Vector2(-1, 0), angle: 0,       maxThrust: 0.002 },
                { name: "rcs_br",   offset: new Vector2(1, 0),  angle: Math.PI, maxThrust: 0.002 },
                { name: "rcs_bl",   offset: new Vector2(-1, 0), angle: Math.PI, maxThrust: 0.002 },
            ]
        })

        this.world.addEntity(
            new PointEntity({name: "zerozero"}),
            playerShip
        )

        this.ref_player = this.world.getEntityByName("player")
        this.flightComputer = new FlightComputer(this.ref_player)
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

        // Flight computer resolves intent → throttles before physics steps
        this.flightComputer.update()

        //physics
        this.world.step(mspt)

        this.state.world = this.serialiseWorld()
        this.state.playerEntity = {
            flightMode: this.flightComputer.mode,
        }
        this.syncState()
    }

    serialiseWorld(){
        return {
            active: this.world.active,
            entities: this.world.active ? this.world.entities.map(e => ({
                x: e.pos.x,
                y: e.pos.y,
                r: e.r || 0,
                scale: e.scale ?? 1,
                name: e.name,
                type: e.type,
                id: e.id,
            })) : []
        }
    }

    //
    // physics
    //

    processPlayerInput(key, active){
        this.flightComputer.setKey(key, active)
    }



}

var server = new Server();
