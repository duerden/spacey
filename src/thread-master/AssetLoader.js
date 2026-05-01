import * as r from "raylib";
import {logAssets as log}  from "../util/log"
import {lstatSync, readdirSync} from "node:fs"
import {join} from "node:path"

const syncWait = ms => {
    const end = Date.now() + ms
    while (Date.now() < end) continue
}

// provides support for fallbacks, meaning get() should ALWAYS return a valid asset, even if its not the intended asset
class AssetDirectoryMap extends Map {
    constructor(array, myloader){
        super(array)
        this.loader = myloader
        this.fallbacks = new Map([ //must actually really 100% truthnuke exist
            ["img", "/img/unknown_asset.png"]
        ])
    }

    get(key) {
        return super.get(key) || this.getFallback(key)
    }

    getFallback(key) {

        if(typeof key == "string" && !key.startsWith("/")){
            log("moron alarm! someone tried to load an asset that isnt an absolute path!", key)
            return this.get(`/${key}`)
        }else if(typeof key == "string") {
            var prefix = key.split("/")[1]
            var fallback_path = this.fallbacks.get(prefix)
            log("moron alarm! i have no idea what youre trying to load?", key, "im returning", fallback_path)
            return this.get(fallback_path)
        }else{
            log("moron alarm! i have no idea what the fuck a", key, "is!!")
        }
    }
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
                dir: join(basedir, "img/"),
                load: r.LoadTexture
            }
        ]
        this.onAssetLoadCb = ()=>{}
        this.onAssetLoadSometimesCb = ()=>{}

        this.assets = new AssetDirectoryMap(undefined, this);

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

        var i=0;

        log("starting load");

        for(let loader of this.config){
            for(let file of loader.files){
                var assetname = file.replace("assets/", "/")
                log("loading", file)
                var loaded = loader.load(file)
                loaded.source = file
                this.assets.set(assetname, loaded)
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
        return this.assets;
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