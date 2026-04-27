import * as r from "raylib";
import {logAssets as log}  from "../util/log"
import {lstatSync, readdirSync} from "node:fs"
import {join} from "node:path"

const syncWait = ms => {
    const end = Date.now() + ms
    while (Date.now() < end) continue
}

//loads a ton of assets in {dir}, assuming:
// dir/audio/ - Audio data
// dir/data/ - Any data
// dir/fonts/ - Font data
// dir/img/ - Image data
// all exist.
class AssetLoader {
    constructor(basedir = "assets/") {
        this.ready = false;
        this.basedir = basedir;
        this.config = [
            {
                name:"texture",
                dir: join(basedir + "img/"),
                load: r.LoadTexture
            }
        ]
        this.onAssetLoadCb = ()=>{}
        this.onAssetLoadSometimesCb = ()=>{}


        //walk the stack
        this.config = this.config.map((loader) => {
            log("preloading", loader.name)
            return {
                ...loader,
                files: readdirSync(loader.dir, {recursive:true})
                    .map(f => join(loader.dir + f))
                    .filter(f => lstatSync(f).isFile()) //no dirs
                    .map(p => p.replaceAll("\\", "/")) //i hate windows
            }
        })

        //sum
        this.totalFiles = this.config.reduce(
            (acc, loader) => acc + loader.files.length,
            0
        )

        log("preload complete")
        this.ready = true;
    }
    
    load(){
        if(this.ready != true) {
            throw new Error("[A] Loader not yet initialised")
        }
        r.SetTraceLogLevel(r.LOG_WARNING)

        var assets = new Map();
        var i=0;

        log("starting load");

        for(let loader of this.config){
            for(let file of loader.files){
                log("loading", file)
                assets.set(file, loader.load(file))
                var progress = {
                    file: file,
                    name: loader.name,
                    totalFiles: this.totalFiles,
                    currentFile: i++,
                }
                this.onAssetLoadCb(progress)
                if(i % 32 == 0){
                    this.onAssetLoadSometimesCb(progress)
                }
                //syncWait(3000)
            }
        }

        r.SetTraceLogLevel(r.LOG_INFO)
        return assets;
    }

    onAssetLoad(fn){
        this.onAssetLoadCb = fn;
    }

    // called every 32 assets loaded.
    onAssetLoadSometimes /*this is a dumb name*/ (fn){
        this.onAssetLoadSometimesCb = fn;
    }
}


export default AssetLoader