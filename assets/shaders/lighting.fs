#version 330

in vec2 fragTexCoord;
in vec4 fragColor;

out vec4 finalColor;

// Texture samplers — bound from JS via SetShaderValueTexture
uniform sampler2D texture0;     // diffuse (raylib binds this automatically)
uniform sampler2D normalMap;    // normal map
uniform sampler2D specularMap;  // R=smoothness, G=specular intensity, B=emissive

// Screen resolution (needed to convert fragment position to screen coords)
uniform vec2 screenResolution;

// Ambient light — minimum illumination so unlit areas aren't pure black
uniform float ambientStrength;  // 0.0 - 1.0
uniform vec3 ambientColor;      // typically (1,1,1)

// Point lights — up to MAX_LIGHTS
#define MAX_LIGHTS 16

uniform int lightCount;
uniform vec2 lightPos[MAX_LIGHTS];      // screen-space position (pixels)
uniform vec3 lightColor[MAX_LIGHTS];    // RGB, 0-1
uniform float lightRadius[MAX_LIGHTS];  // falloff radius in pixels
uniform float lightIntensity[MAX_LIGHTS]; // brightness multiplier

// Specular / view config
// In 2D top-down, the "camera" is always directly above, so view direction is (0, 0, 1)
const vec3 viewDir = vec3(0.0, 0.0, 1.0);
uniform float specularPower; // shininess exponent (higher = tighter highlights)

void main() {
    // Sample textures
    vec4 diffuse = texture(texture0, fragTexCoord) * fragColor;
    vec3 normalSample = texture(normalMap, fragTexCoord).rgb;
    vec4 specSample = texture(specularMap, fragTexCoord);

    // Early discard fully transparent pixels
    if (diffuse.a < 0.01) discard;

    // Decode normal from [0,1] to [-1,1] range and normalize
    vec3 normal = normalize(normalSample * 2.0 - 1.0);

    // Decode specular map channels
    float smoothness = specSample.r;        // 0 = rough, 1 = mirror
    float specIntensity = specSample.g;     // specular highlight strength
    float emissive = specSample.b;          // emissive glow strength

    // Fragment position in screen pixels
    vec2 fragPos = gl_FragCoord.xy;
    // Flip Y because raylib render textures are Y-flipped relative to screen
    fragPos.y = screenResolution.y - fragPos.y;

    // Start with ambient light
    vec3 totalLight = ambientColor * ambientStrength;
    vec3 totalSpecular = vec3(0.0);

    // Accumulate contribution from each point light
    for (int i = 0; i < lightCount && i < MAX_LIGHTS; i++) {
        // Vector from fragment to light (in screen pixel space)
        vec2 toLight2D = lightPos[i] - fragPos;
        float dist = length(toLight2D);

        // Skip if outside radius
        if (dist > lightRadius[i]) continue;

        // Attenuation: smooth falloff to zero at radius edge
        float attenuation = 1.0 - smoothstep(0.0, lightRadius[i], dist);
        attenuation *= lightIntensity[i];

        // Light direction in 3D (treat light as slightly above the surface)
        // The Z component controls how "overhead" the light feels.
        // Higher Z = more top-down, lower Z = more raking/dramatic
        vec3 lightDir = normalize(vec3(toLight2D, 80.0));

        // Diffuse: how much the surface faces the light
        float diffFactor = max(dot(normal, lightDir), 0.0);

        // Specular: Blinn-Phong half-vector
        vec3 halfVec = normalize(lightDir + viewDir);
        float specFactor = pow(max(dot(normal, halfVec), 0.0), specularPower * smoothness * 255.0 + 1.0);
        specFactor *= specIntensity * smoothness;

        totalLight += lightColor[i] * diffFactor * attenuation;
        totalSpecular += lightColor[i] * specFactor * attenuation;
    }

    // Final composition
    vec3 litColor = diffuse.rgb * totalLight + totalSpecular;

    // Add emissive (uses diffuse color as the emissive tint)
    litColor += diffuse.rgb * emissive;

    finalColor = vec4(litColor, diffuse.a);
}
