import * as r from "raylib";
import {logAssets as log}  from "../util/log"
import {lstatSync, readdirSync, existsSync} from "node:fs"
import {join} from "node:path"

const syncWait = ms => {
    const end = Date.now() + ms
    while (Date.now() < end) continue
}

// A bundle of related textures for a single visual entity.
// diffuse: RGBA colour texture
// normal:  RGB normal map (default: flat 0x8080FF)
// specular: RGBA (R=smoothness, G=specular intensity, B=emissive, A=unused)
// dynamic: RGBA zero-filled, same size as diffuse, for runtime effects (damage, heat, etc)
export class TextureBundle {
    constructor(diffuse, normal, specular, dynamic) {
        this.diffuse = diffuse
        this.normal = normal
        this.specular = specular
        this.dynamic = dynamic
    }
}

// Generate fallback textures (1x1, created once and shared)
let _fallbackNormal = null
let _fallbackSpecular = null

function getFallbackNormal() {
    if (!_fallbackNormal) {
        const img = r.GenImageColor(1, 1, { r: 128, g: 128, b: 255, a: 255 })
        _fallbackNormal = r.LoadTextureFromImage(img)
        r.UnloadImage(img)
    }
    return _fallbackNormal
}

function getFallbackSpecular() {
    if (!_fallbackSpecular) {
        const img = r.GenImageColor(1, 1, { r: 0, g: 0, b: 0, a: 0 })
        _fallbackSpecular = r.LoadTextureFromImage(img)
        r.UnloadImage(img)
    }
    return _fallbackSpecular
}

function createDynamicTexture(width, height) {
    const img = r.GenImageColor(width, height, { r: 0, g: 0, b: 0, a: 0 })
    const tex = r.LoadTextureFromImage(img)
    r.UnloadImage(img)
    return tex
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

    // Get a texture bundle by base path (e.g. "/img/ship").
    // Returns TextureBundle with diffuse/normal/specular/dynamic.
    getBundle(key) {
        return super.get(`${key}.__bundle`) || this.getFallback(key)
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

        // Build texture bundles for all loaded images.
        // For each base texture (not ending in _n or _s), create a bundle
        // that references its companion normal/specular maps or fallbacks.
        this._buildTextureBundles()

        r.SetTraceLogLevel(r.LOG_INFO)
        return this.assets;
    }

    _buildTextureBundles() {
        const suffix_n = "_n.png"
        const suffix_s = "_s.png"

        // Collect base texture paths (anything that isn't a _n or _s companion)
        const basePaths = []
        for (let [key] of this.assets) {
            if (typeof key !== "string") continue
            if (key.endsWith(suffix_n) || key.endsWith(suffix_s)) continue
            if (!key.endsWith(".png")) continue
            basePaths.push(key)
        }

        for (let path of basePaths) {
            const stem = path.replace(/\.png$/, "")
            const normalPath = `${stem}${suffix_n}`
            const specPath = `${stem}${suffix_s}`

            const diffuse = this.assets.get(path)

            // Use companion textures if they were loaded, otherwise fallback
            const normal = this.assets.has(normalPath)
                ? this.assets.get(normalPath)
                : getFallbackNormal()

            const specular = this.assets.has(specPath)
                ? this.assets.get(specPath)
                : getFallbackSpecular()

            // Dynamic texture: same size as diffuse, zero-filled, for runtime effects
            const dynamic = createDynamicTexture(diffuse.width, diffuse.height)

            const bundle = new TextureBundle(diffuse, normal, specular, dynamic)

            // Store under "/img/ship.__bundle" so getBundle("/img/ship") works
            this.assets.set(`${stem}.__bundle`, bundle)

            log("bundle", stem, "->",
                "n:", this.assets.has(normalPath) ? "loaded" : "fallback",
                "s:", this.assets.has(specPath) ? "loaded" : "fallback",
                "dyn:", `${diffuse.width}x${diffuse.height}`
            )
        }
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