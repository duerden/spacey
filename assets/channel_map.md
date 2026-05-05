# Texture Channel Map

## File naming convention

For any texture `name.png`, companion maps are loaded automatically by suffix:

```
name.png      -> diffuse (colour)
name_n.png    -> normal map (optional, falls back to flat normal)
name_s.png    -> specular map (optional, falls back to black)
```

All three are bundled together by the AssetLoader and accessed via `assets.getBundle("/img/name")`.

## Diffuse (`name.png`)

Standard RGBA colour texture.

| Channel | Use            |
|---------|----------------|
| R       | Red            |
| G       | Green          |
| B       | Blue           |
| A       | Transparency   |

## Normal map (`name_n.png`)

Tangent-space normal map. Each pixel encodes a surface direction vector.

| Channel | Use                  | Range    | Neutral value |
|---------|----------------------|----------|---------------|
| R       | X (left/right lean)  | 0-255    | 128 (no lean) |
| G       | Y (up/down lean)     | 0-255    | 128 (no lean) |
| B       | Z (toward camera)    | 128-255  | 255 (flat)    |
| A       | Unused               | -        | -             |

A completely flat surface (facing the camera) is `(128, 128, 255)`.

The shader decodes via `normal = sample.rgb * 2.0 - 1.0` then normalizes.

Fallback: 1x1 pixel `(128, 128, 255)` -- flat lit from all directions equally.

## Specular map (`name_s.png`)

Material properties packed into channels. Follows labPBR conventions where applicable.

| Channel | Use                 | Range   | Notes                                    |
|---------|---------------------|---------|------------------------------------------|
| R       | Perceptual smoothness | 0-255 | 0 = rough, 255 = mirror. Inverse of roughness. |
| G       | Specular intensity  | 0-255   | Strength of specular highlights.         |
| B       | Emissive intensity  | 0-255   | Glow strength. Colour taken from diffuse. |
| A       | Unused / reserved   | -       | Available for future use (damage, heat, etc). |

Fallback: 1x1 pixel `(0, 0, 0, 0)` -- rough, no specular, no emission.

## Dynamic texture

Allocated automatically per bundle at the same resolution as the diffuse texture. Initialised to `(0, 0, 0, 0)`. Written to at runtime for effects like damage scorching, heat glow, shield hits, etc. Channel assignments TBD based on gameplay needs.
