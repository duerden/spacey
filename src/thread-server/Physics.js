let _nextId = 0
const nextId = (cn, name) => `${_nextId++}-${cn}`

function abs_clamp(n, r){
    return Math.min(Math.max(n, -r), r)
}

export class World {
    constructor(msps) {
        this.active = false
        this.target_tick_ms = msps
        this.last_tick_ms = 0
        this.entities = []
        this.addEntity(
            new PointEntity({name: "zerozero"}),
            //new ThingEntity({name: "thingy", dr:0.01}),
            new ShipEntity({name: "player"})
        )
    }

    start(){this.active = true}
    stop() {this.active = false}

    addEntity(...entities) {
        for(let entity of entities){
            if(entity instanceof PointEntity){
                this.entities.push(entity)
            }
        }
    }

    getEntityByName(name){
        return this.entities.find(e => e.name == name)
    }

    step(dt) {
        if(!this.active) {return}
        var start = performance.now()
        for(let entity of this.entities){
            entity.step(dt)
        }
        this.last_tick_ms = performance.now() - start
    }
}

export class PointEntity {
    constructor(i) {
        this.x = i.x || 0 //position 
        this.y = i.y || 0

        this.vx = i.vx || 0 //velocity
        this.vy = i.vy || 0

        this.name = i.name || "point_entity"
        this.type = this.constructor.name // done so on serialisation this carries through

        this.id = nextId(this.constructor.name)
    }

    step(dt) {
        this.x += this.vx * dt
        this.y += this.vy * dt
    }
}

export class ThingEntity extends PointEntity {
    constructor(i) {
        super(i)

        this.r = i.r || 0 //rotation (radians)
        this.dr = i.dr || 0 //angular velocity (radians/tick)
    }

    step(dt) {
        super.step(dt)
        this.r += this.dr * dt
    }
}

export class ShipEntity extends ThingEntity {
    constructor(i) {
        super(i)

        this.max_accel_fwd =  0.01;
        this.max_accel_rot =  0.1 * (Math.PI/180); //change in degrees

        this.max_dr = 0.5 * (Math.PI/180);
        this.max_speed = 0.4;
        this.speed = 0;

        this.thrust_fwd = false;
        this.thrust_rvs = false;
        this.thrust_l = false;
        this.thrust_r = false;
        this.inertia_damp = false;

        this.forces_vector = {l:0,r:0};
    }

    recalc_forces_vector(){
        var fv = {l:0,r:0};

        if(!this.inertia_damp && this.thrust_fwd){ fv.l += this.max_accel_fwd }
        if(!this.inertia_damp && this.thrust_rvs){ fv.l -= this.max_accel_fwd }
        if(!this.inertia_damp && this.thrust_r)  { fv.r += this.max_accel_rot }
        if(!this.inertia_damp && this.thrust_l)  { fv.r -= this.max_accel_rot }

        console.log("speed", this.speed)
        console.log("new vec", fv)
        return fv
    }

    set thr_fwd(v) {
        this.thrust_fwd = v;
        this.forces_vector = this.recalc_forces_vector()
    }

    set thr_rvs(v) {
        this.thrust_rvs = v;
        this.forces_vector = this.recalc_forces_vector()
    }

    set thr_l(v) {
        this.thrust_l = v;
        this.forces_vector = this.recalc_forces_vector()
    }

    set thr_r(v) {
        this.thrust_r = v;
        this.forces_vector = this.recalc_forces_vector()
    }

    set thr_inertia_damp(v) {
        this.inertia_damp = v;
        this.forces_vector = this.recalc_forces_vector()
    }

    stop_movement() {
        this.vx = 0
        this.vy = 0
        this.dr = 0
    }

    step(dt) {
        this.speed = Math.sqrt(this.vx ** 2 + this.vy ** 2)

        super.step(dt)

        this.dr += this.forces_vector.r
        if(this.inertia_damp && Math.abs(this.dr) > 0) {
            var brake = Math.min(this.max_accel_rot, Math.abs(this.dr))
            this.dr -= Math.sign(this.dr) * brake
        }
        this.dr = abs_clamp(this.dr, this.max_dr)


        this.vx += this.forces_vector.l * Math.sin(this.r)
        this.vy -= this.forces_vector.l * Math.cos(this.r)

        // inertia dampening: apply a braking force directly opposing velocity
        if(this.inertia_damp && this.speed > 0) {
            var brake = Math.min(this.max_accel_fwd, this.speed)
            this.vx -= (this.vx / this.speed) * brake
            this.vy -= (this.vy / this.speed) * brake
        }

        if(this.speed > this.max_speed) {
            var scale = this.max_speed / this.speed
            this.vx *= scale
            this.vy *= scale
        }
    }
}