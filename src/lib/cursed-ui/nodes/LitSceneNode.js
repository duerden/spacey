import * as r from "raylib";
import { PointNode } from "./PointNode";

// Default flat normal: (128, 128, 255) = surface pointing straight at camera
const FLAT_NORMAL = { r: 128, g: 128, b: 255, a: 255 }
// Default specular: (0, 0, 0, 0) = rough, no specular, no emissive
const BLACK_TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 }

// LitSceneNode: orchestrates multi-pass deferred 2D lighting.
//
// Owns three framebuffers (diffuse + normal + specular) and a lighting shader.
// Children that implement drawDiffuse()/drawNormal()/drawSpecular() are drawn
// into the respective framebuffers. The shader composites them with point lights.
//
// Children that only implement drawSelf() are drawn unlit after the
// lighting composite (overlays, UI anchored to world-space).
//
// Usage:
//   const scene = new LitSceneNode()
//   scene.w = screenWidth
//   scene.h = screenHeight
//   scene.loadShader("assets/shaders/lighting.vs", "assets/shaders/lighting.fs")
//   scene.addLight({ x: 400, y: 300, color: {r:1,g:0.9,b:0.8}, radius: 300, intensity: 1.5 })

export class LitSceneNode extends PointNode {
    constructor(tag = "litscene") {
        super(tag)

        this.w = 0
        this.h = 0

        // Framebuffers
        this._diffuseFB = null
        this._normalFB = null
        this._specularFB = null
        this._fbW = 0
        this._fbH = 0

        // Shader
        this._shader = null
        this._locs = {}

        // Lights
        this.lights = []

        // Ambient
        this.ambientStrength = 0.15
        this.ambientColor = { x: 1, y: 1, z: 1 }

        // Specular
        this.specularPower = 16.0
    }

    // Called by the reconciler when the onInit prop is set.
    // Fires the callback with this node so imperative setup can happen.
    set onInit(fn) {
        if (typeof fn === "function") fn(this)
    }

    loadShader(vsPath, fsPath) {
        this._shader = r.LoadShader(vsPath, fsPath)

        // Cache uniform locations
        this._locs.normalMap = r.GetShaderLocation(this._shader, "normalMap")
        this._locs.specularMap = r.GetShaderLocation(this._shader, "specularMap")
        this._locs.screenResolution = r.GetShaderLocation(this._shader, "screenResolution")
        this._locs.ambientStrength = r.GetShaderLocation(this._shader, "ambientStrength")
        this._locs.ambientColor = r.GetShaderLocation(this._shader, "ambientColor")
        this._locs.lightCount = r.GetShaderLocation(this._shader, "lightCount")
        this._locs.specularPower = r.GetShaderLocation(this._shader, "specularPower")

        // Per-light uniform locations (arrays)
        this._locs.lightPos = []
        this._locs.lightColor = []
        this._locs.lightRadius = []
        this._locs.lightIntensity = []
        for (let i = 0; i < 16; i++) {
            this._locs.lightPos.push(r.GetShaderLocation(this._shader, `lightPos[${i}]`))
            this._locs.lightColor.push(r.GetShaderLocation(this._shader, `lightColor[${i}]`))
            this._locs.lightRadius.push(r.GetShaderLocation(this._shader, `lightRadius[${i}]`))
            this._locs.lightIntensity.push(r.GetShaderLocation(this._shader, `lightIntensity[${i}]`))
        }
    }

    addLight(light) {
        // light: { x, y, color: {r,g,b}, radius, intensity }
        this.lights.push(light)
        return this.lights.length - 1
    }

    removeLight(index) {
        this.lights.splice(index, 1)
    }

    _ensureFBs() {
        if (this.w <= 0 || this.h <= 0) return
        if (this._diffuseFB && this._fbW === this.w && this._fbH === this.h) return

        if (this._diffuseFB) r.UnloadRenderTexture(this._diffuseFB)
        if (this._normalFB) r.UnloadRenderTexture(this._normalFB)
        if (this._specularFB) r.UnloadRenderTexture(this._specularFB)

        this._diffuseFB = r.LoadRenderTexture(this.w, this.h)
        this._normalFB = r.LoadRenderTexture(this.w, this.h)
        this._specularFB = r.LoadRenderTexture(this.w, this.h)
        this._fbW = this.w
        this._fbH = this.h
    }

    _updateShaderUniforms() {
        if (!this._shader) return
        const s = this._shader
        const l = this._locs

        // Screen resolution
        r.SetShaderVec2(s, l.screenResolution, { x: this.w, y: this.h })

        // Ambient
        r.SetShaderFloat(s, l.ambientStrength, this.ambientStrength)
        r.SetShaderVec3(s, l.ambientColor, this.ambientColor)

        // Specular
        r.SetShaderFloat(s, l.specularPower, this.specularPower)

        // Light count
        const count = Math.min(this.lights.length, 16)
        r.SetShaderInt(s, l.lightCount, count)

        // Per-light data
        for (let i = 0; i < count; i++) {
            const light = this.lights[i]
            r.SetShaderVec2(s, l.lightPos[i], { x: light.x, y: light.y })
            r.SetShaderVec3(s, l.lightColor[i], {
                x: light.color.r,
                y: light.color.g,
                z: light.color.b
            })
            r.SetShaderFloat(s, l.lightRadius[i], light.radius)
            r.SetShaderFloat(s, l.lightIntensity[i], light.intensity ?? 1.0)
        }
    }

    // Walk children and call a method if it exists
    _walkChildren(node, methodName) {
        for (const child of node.children) {
            if (!child.visible) continue
            if (child.slotName !== null) continue
            if (typeof child[methodName] === "function") {
                child[methodName]()
            }
            this._walkChildren(child, methodName)
        }
    }

    drawSelf() {
        if (!this._shader || this.w <= 0 || this.h <= 0) return
        this._ensureFBs()
        if (!this._diffuseFB || !this._normalFB || !this._specularFB) return

        // Pre-draw hook for per-frame updates (light positions, etc)
        if (typeof this.onBeforeDraw === "function") this.onBeforeDraw(this)

        // Pass 1: Draw diffuse textures into diffuse framebuffer
        r.BeginTextureMode(this._diffuseFB)
        r.ClearBackground(r.BLANK)
        this._walkChildren(this, "drawDiffuse")
        r.EndTextureMode()

        // Pass 2: Draw normal maps into normal framebuffer
        r.BeginTextureMode(this._normalFB)
        r.ClearBackground(FLAT_NORMAL)
        this._walkChildren(this, "drawNormal")
        r.EndTextureMode()

        // Pass 3: Draw specular maps into specular framebuffer
        r.BeginTextureMode(this._specularFB)
        r.ClearBackground(BLACK_TRANSPARENT)
        this._walkChildren(this, "drawSpecular")
        r.EndTextureMode()

        // Update shader uniforms
        this._updateShaderUniforms()

        // Bind additional texture samplers
        // texture0 (diffuse) is bound automatically by raylib when we DrawTexturePro
        r.SetShaderValueTexture(this._shader, this._locs.normalMap, this._normalFB.texture)
        r.SetShaderValueTexture(this._shader, this._locs.specularMap, this._specularFB.texture)

        // Pass 4: Composite with lighting shader
        const pos = this.absPos()
        r.BeginShaderMode(this._shader)

        // Draw diffuse FB as a full-screen quad — shader samples it as texture0
        // Flip Y for render texture
        const src = { x: 0, y: 0, width: this.w, height: -this.h }
        const dest = { x: pos.x, y: pos.y, width: this.w, height: this.h }
        r.DrawTexturePro(this._diffuseFB.texture, src, dest, { x: 0, y: 0 }, 0, r.WHITE)

        r.EndShaderMode()

        // Pass 5: Draw unlit overlays (nodes with only drawSelf, no drawDiffuse)
        this._walkChildren(this, "drawOverlay")
    }

    // Override draw() to prevent normal recursive draw of children
    // (we handle child drawing ourselves in the passes above)
    draw() {
        if (!this.visible) return
        this.drawSelf()
    }

    destroy() {
        if (this._diffuseFB) {
            r.UnloadRenderTexture(this._diffuseFB)
            this._diffuseFB = null
        }
        if (this._normalFB) {
            r.UnloadRenderTexture(this._normalFB)
            this._normalFB = null
        }
        if (this._specularFB) {
            r.UnloadRenderTexture(this._specularFB)
            this._specularFB = null
        }
        if (this._shader) {
            r.UnloadShader(this._shader)
            this._shader = null
        }
    }
}
