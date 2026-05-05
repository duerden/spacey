import * as r from "raylib";
import { useMaster } from "./ctx/Master";

export function LightingTestComponent(props) {
    var { window } = useMaster()

    const setupScene = (node) => {
        node.loadShader("assets/shaders/lighting.vs", "assets/shaders/lighting.fs")

        // Light 0: warm point light that follows the mouse
        node.addLight({
            x: window.width / 2,
            y: window.height / 2,
            color: { r: 1.0, g: 0.9, b: 0.7 },
            radius: 400,
            intensity: 1.5
        })

        // Light 1: cool static light on the left
        node.addLight({
            x: 200,
            y: 300,
            color: { r: 0.4, g: 0.6, b: 1.0 },
            radius: 300,
            intensity: 1.0
        })

        // Light 2: red accent light on the right
        node.addLight({
            x: window.width - 200,
            y: 200,
            color: { r: 1.0, g: 0.2, b: 0.1 },
            radius: 250,
            intensity: 0.8
        })

        // Per-frame: update light 0 to follow mouse
        node.onBeforeDraw = (scene) => {
            scene.lights[0].x = r.GetMouseX()
            scene.lights[0].y = r.GetMouseY()
        }
    }

    return (
        <box x={0} y={0} w={window.width} h={window.height} bg={r.BLACK}>
            <box x={10} y={10}>
                <text fontSize={20} color={r.WHITE}>Lighting Test - move mouse to move light</text>
            </box>

            <lit_scene
                x={0} y={0}
                w={window.width} h={window.height}
                onInit={setupScene}
                ambientStrength={0.08}
                specularPower={32.0}
            >
                <shaded_sprite src="/img/blob_kitty" x={window.width / 2} y={window.height / 2} />
                <shaded_sprite src="/img/blob_kitty" x={300} y={250} />
                <shaded_sprite src="/img/blob_kitty" x={700} y={400} />
                <shaded_sprite src="/img/blob_kitty" x={500} y={200} />
                <shaded_sprite src="/img/blob_kitty" x={900} y={350} scale={2} />
            </lit_scene>
        </box>
    );
}
