import { useMemo } from 'react';
import * as THREE from 'three';
import { useThemeColor } from '../../../hooks/useThemeColor';

// GLSL Utilities

const COMMON_GLSL = `
    // High-performance hash
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    // Value Noise (2D)
    float noise(vec2 p) {
        vec2 ip = floor(p);
        vec2 u = fract(p);
        u = u*u*(3.0-2.0*u);
        float res = mix(
            mix(hash(ip), hash(ip+vec2(1.0,0.0)), u.x),
            mix(hash(ip+vec2(0.0,1.0)), hash(ip+vec2(1.0,1.0)), u.x),
            u.y
        );
        return res*res;
    }
    
    // Value Noise (3D Overload)
    float noise(vec3 p) {
        return noise(p.xy + p.z * 0.5);
    }
    
    // Custom Bump Mapping Logic
    vec3 customPerturbNormal(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection) {
        vec3 vSigmaX = vec3(dFdx(surf_pos.x), dFdx(surf_pos.y), dFdx(surf_pos.z));
        vec3 vSigmaY = vec3(dFdy(surf_pos.x), dFdy(surf_pos.y), dFdy(surf_pos.z));
        vec3 vN = surf_norm;
        vec3 R1 = cross(vN, vSigmaY);
        vec3 R2 = cross(vSigmaX, vN);
        float fDet = dot(vSigmaX, R1);
        fDet *= (float(gl_FrontFacing) * 2.0 - 1.0);
        vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
        return normalize(abs(fDet) * surf_norm - vGrad);
    }
`;

// Material Factories

/**
 * Injects custom GLSL into standard Three.js materials to allow world-space
 * procedural texturing without the overhead of ShaderMaterial boilerplate.
 */
const createWorldProceduralMaterial = (
    uniforms: Record<string, any>,
    colorLogic: string,
    normalLogic: string,
    parameters?: THREE.MeshStandardMaterialParameters
) => {
    const mat = new THREE.MeshStandardMaterial(parameters);

    mat.onBeforeCompile = (shader) => {
        if (shader.fragmentShader.includes('// CUSTOM_CHUNKS_INJECTED')) return;

        Object.assign(shader.uniforms, uniforms);

        // Inject varyings
        shader.vertexShader = `
            varying vec3 vWorldPosition;
            varying vec3 vCustomViewPos; 
            ${ shader.vertexShader }
        `;

        // Capture world position
        shader.vertexShader = shader.vertexShader.replace(
            '#include <project_vertex>',
            `#include <project_vertex>
            vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
            vCustomViewPos = -mvPosition.xyz;`
        );

        // Inject Common GLSL and Uniforms
        shader.fragmentShader = `
            // CUSTOM_CHUNKS_INJECTED
            uniform vec3 uColor;
            uniform vec3 uSecColor;
            varying vec3 vWorldPosition;
            varying vec3 vCustomViewPos;
            ${ COMMON_GLSL }
            ${ shader.fragmentShader }
        `;

        // Replace Color Logic
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `{ ${ colorLogic } } 
            #include <color_fragment>`
        );

        // Replace Normal Logic
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <normal_fragment_maps>',
            `#include <normal_fragment_maps> 
            { ${ normalLogic } }`
        );
    };

    mat.customProgramCacheKey = () => colorLogic + normalLogic;
    return mat;
};

const useStandardMaterial = (color: string, roughness = 0.5, metalness = 0.0) => {
    return useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            roughness,
            metalness,
        });
    }, [color, roughness, metalness]);
};

// Procedural World Materials

export const useWoodFloorMaterial = (customColor?: string) => {
    const primary = useThemeColor('--game-floor-wood');
    const gap = '#1a0f05';
    const color = customColor || primary || '#5c4033';

    return useMemo(() => {
        const uniforms = {
            uColor: { value: new THREE.Color(color) },
            uSecColor: { value: new THREE.Color(gap) },
        };
        const vars = `
            vec2 st = vWorldPosition.xz * vec2(2.5, 0.5); 
            float row = floor(st.x);
            if (mod(row, 1.5) > 0.5) st.y += 0.5;
            vec2 fpos = fract(st);
            vec2 grid = step(vec2(0.01), fpos) * step(fpos, vec2(0.95));
            float isPlank = grid.x * grid.y;
            float grain = noise(st * vec2(2.0, 2.0)); 
        `;
        const colorLogic = `
            ${ vars }
            float tint = 0.9 + 0.2 * noise(vec2(row, floor(st.y))); 
            vec3 wood = uColor * tint * (0.9 + 0.1 * grain);
            diffuseColor.rgb = mix(uSecColor, wood, isPlank);
        `;
        const normalLogic = `
            ${ vars }
            float height = isPlank * (0.5 + 0.1 * grain);
            vec2 dHdxy = vec2(dFdx(height), dFdy(height)) * 0.5;
            normal = customPerturbNormal(-vCustomViewPos, normal, dHdxy, 1.0);
        `;
        return createWorldProceduralMaterial(uniforms, colorLogic, normalLogic, { roughness: 0.5, metalness: 0.0 });
    }, [color]);
};

export const useWoodFurnitureMaterial = (customColor?: string) => {
    const primary = useThemeColor('--game-object-wood');
    const grainColor = '#3f2e18';
    const color = customColor || primary || '#8b5a2b';

    return useMemo(() => {
        const uniforms = {
            uColor: { value: new THREE.Color(color) },
            uSecColor: { value: new THREE.Color(grainColor) },
        };
        const vars = `
            vec3 pos = vWorldPosition * 4.0;
            float grain = noise(vec2(pos.x * 2.0, pos.y * 0.2 + pos.z));
        `;
        const colorLogic = `
            ${ vars }
            vec3 wood = mix(uColor, uColor * 0.8, grain * 0.3);
            diffuseColor.rgb = wood;
        `;
        const normalLogic = `
            ${ vars }
            float height = grain;
            vec2 dHdxy = vec2(dFdx(height), dFdy(height)) * 0.2;
            normal = customPerturbNormal(-vCustomViewPos, normal, dHdxy, 1.0);
        `;
        return createWorldProceduralMaterial(uniforms, colorLogic, normalLogic, { roughness: 0.3, metalness: 0.0 });
    }, [color]);
};

export const useBrickMaterial = (customColor?: string) => {
    const brickColor = useThemeColor('--game-brick-base') || '#803020';
    const mortarColor = useThemeColor('--game-brick-mortar') || '#a0a0a0';
    const color = customColor || brickColor;

    return useMemo(() => {
        const uniforms = {
            uColor: { value: new THREE.Color(color) },
            uSecColor: { value: new THREE.Color(mortarColor) },
        };
        const vars = `
            vec2 uvSpace = vWorldPosition.y * vec2(0.0, 1.0) + vWorldPosition.x * vec2(1.0, 0.0) + vWorldPosition.z * vec2(0.5, 0.0);
            vec2 st = uvSpace * 3.5; 
            st.x *= 0.3; 
            float row = floor(st.y);
            if (mod(row, 2.0) > 0.5) st.x += 0.5;
            vec2 fpos = fract(st);
            vec2 grid = step(vec2(0.1), fpos) * step(fpos, vec2(0.9));
            float isBrick = grid.x * grid.y;
            float n = noise(st * 3.0);
        `;
        const colorLogic = `
            ${ vars }
            float tint = 0.85 + 0.3 * hash(vec2(floor(st.x), floor(st.y)));
            vec3 brick = uColor * tint * (0.9 + 0.1 * n);
            diffuseColor.rgb = mix(uSecColor, brick, isBrick);
        `;
        const normalLogic = `
            ${ vars }
            float height = isBrick;
            vec2 dHdxy = vec2(dFdx(height), dFdy(height)) * 2.0; 
            normal = customPerturbNormal(-vCustomViewPos, normal, dHdxy, 1.0);
        `;
        return createWorldProceduralMaterial(uniforms, colorLogic, normalLogic, { roughness: 0.9 });
    }, [color, mortarColor]);
};

export const useGrassMaterial = () => {
    const grassColor = useThemeColor('--game-grass') || '#3a5a20';
    const dirtColor = '#3f2e18';

    return useMemo(() => {
        const uniforms = {
            uColor: { value: new THREE.Color(grassColor) },
            uSecColor: { value: new THREE.Color(dirtColor) },
        };

        const vars = `
            // 1. Macro patches
            float patches = noise(vWorldPosition.xz * 0.5);
            // 2. Medium clumps
            float clumps = noise(vWorldPosition.xz * 2.0);
            // 3. Micro detail
            float grain = noise(vWorldPosition.xz * 35.0);
            
            // Combined density map
            float density = patches + (clumps * 0.25);
            float mask = smoothstep(-0.3, 0.25, density);
        `;

        const colorLogic = `
            ${ vars }
            vec3 variedGrass = uColor * (0.85 + 0.3 * grain);
            vec3 c = mix(uSecColor, variedGrass, mask);
            diffuseColor.rgb = c;
        `;

        const normalLogic = `
            ${ vars }
            float height = mask * (0.3 + 0.05 * clumps);
            vec2 dHdxy = vec2(dFdx(height), dFdy(height)) * 0.6; 
            normal = customPerturbNormal(-vCustomViewPos, normal, dHdxy, 1.0);
        `;

        return createWorldProceduralMaterial(uniforms, colorLogic, normalLogic, { roughness: 1.0, metalness: 0.0 });
    }, [grassColor]);
};

export const useLakeBedMaterial = () => {
    // A dark, murky brown/gray for the lake bottom
    const baseColor = '#2b2118';
    const highlightColor = '#3e3226';

    return useMemo(() => {
        const uniforms = {
            uColor: { value: new THREE.Color(baseColor) },
            uSecColor: { value: new THREE.Color(highlightColor) },
        };
        const vars = `
            float noiseScale = 8.0; 
            // FBM-like layering for muddy texture
            float n1 = noise(vWorldPosition.xz * noiseScale);
            float n2 = noise(vWorldPosition.xz * (noiseScale * 2.0));
            float combined = (n1 * 0.7 + n2 * 0.3);
        `;
        const colorLogic = `
            ${ vars }
            // Mix base mud with lighter silt based on noise
            vec3 mud = mix(uColor, uSecColor, combined);
            
            // DEPTH GRADIENT TRICK:
            // Darken the floor as Z increases (towards camera/bottom of screen in Alley level)
            // This fakes the "abyss" look under the water
            float depthDarkening = smoothstep(0.0, 10.0, vWorldPosition.z); 
            mud *= (1.0 - depthDarkening * 0.6); // Darken up to 60%
            diffuseColor.rgb = mud;
        `;
        const normalLogic = `
            ${ vars }
            float height = combined;
            // Very subtle bump map for silt
            vec2 dHdxy = vec2(dFdx(height), dFdy(height)) * 0.5; 
            normal = customPerturbNormal(-vCustomViewPos, normal, dHdxy, 1.0);
        `;
        return createWorldProceduralMaterial(uniforms, colorLogic, normalLogic, { roughness: 0.9, metalness: 0.0 });
    }, []);
};

export const useAsphaltMaterial = (customColor?: string) => {
    const roadColor = customColor || '#222222';
    return useMemo(() => {
        const uniforms = {
            uColor: { value: new THREE.Color(roadColor) },
            uSecColor: { value: new THREE.Color('#333333') },
        };
        const vars = `
            float grain = hash(vWorldPosition.xz * 150.0);
            float spots = noise(vWorldPosition.xz * 2.0); 
        `;
        const colorLogic = `
            ${ vars }
            vec3 col = uColor + (grain * 0.05) - (spots * 0.05);
            diffuseColor.rgb = col;
        `;
        const normalLogic = `
            ${ vars }
            float height = grain;
            vec2 dHdxy = vec2(dFdx(height), dFdy(height)) * 0.1;
            normal = customPerturbNormal(-vCustomViewPos, normal, dHdxy, 1.0);
        `;
        return createWorldProceduralMaterial(uniforms, colorLogic, normalLogic, { roughness: 0.9 });
    }, [roadColor]);
};

export const useNoiseMaterial = (customColor: string, scale = 1.0, intensity = 0.1) => {
    return useMemo(() => {
        const uniforms = { uColor: { value: new THREE.Color(customColor) } };
        const vars = `float n = noise(vWorldPosition.xyz * ${ scale.toFixed(1) });`;
        const colorLogic = `${ vars } diffuseColor.rgb = uColor + (n * ${ intensity.toFixed(2) });`;
        const normalLogic = `
            ${ vars }
            float height = n;
            vec2 dHdxy = vec2(dFdx(height), dFdy(height)) * 0.1;
            normal = customPerturbNormal(-vCustomViewPos, normal, dHdxy, 1.0);
        `;
        return createWorldProceduralMaterial(uniforms, colorLogic, normalLogic, { roughness: 0.7 });
    }, [customColor, scale, intensity]);
};

export const useFeltMaterial = (customColor: string) => {
    // High frequency noise for fabric look
    return useNoiseMaterial(customColor, 150.0, 0.08);
};

// Simple Materials

export const useFabricMaterial = (customColor: string) => useStandardMaterial(customColor, 0.9, 0.0);
export const useSkinMaterial = (customColor: string) => useStandardMaterial(customColor, 0.6, 0.0);
export const useLeatherMaterial = (customColor: string) => useStandardMaterial(customColor, 0.4, 0.2);

// VFX Shaders

export const WindowRainShader = {
    uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#aaccff') },
    },
    vertexShader: `
        uniform float uTime;
        attribute float aSpeed;
        void main() {
            vec3 pos = position;
            float fallDistance = uTime * aSpeed;
            float height = 7.0;
            pos.y = 4.0 - mod(fallDistance, height);
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = max(1.5, 250.0 * (0.05 / -mvPosition.z));
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            if (dist > 0.5) discard;
            float alpha = 0.6 * (1.0 - (dist * 2.0));
            gl_FragColor = vec4(uColor, alpha);
        }
    `
};

export const SceneRainShader = {
    uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#aaccff') },
    },
    vertexShader: `
    uniform float uTime;
    attribute float aSpeed;
    void main() {
        vec3 pos = position;
        float fallDistance = uTime * aSpeed + position.y;
        float height = 25.0; 
        pos.y = 20.0 - mod(fallDistance, height); 
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = max(1.5, 400.0 * (0.05 / -mvPosition.z));
    }`,
    fragmentShader: `
    uniform vec3 uColor;
    void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;
        float alpha = 0.5 * (1.0 - (dist * 2.0));
        gl_FragColor = vec4(uColor, alpha);
    }`
};

export const FireShader = {
    uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color('#ffaa00') },
        uColorB: { value: new THREE.Color('#ff2200') },
    },
    vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        vec3 pos = position;
        float sway = sin(pos.y * 2.0 - uTime * 2.0) * 0.05 * pos.y;
        pos.x += sway;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }`,
    fragmentShader: `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uTime;
    varying vec2 vUv;
    
    // Standalone hash/noise
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float noise(vec2 p) {
        vec2 ip = floor(p);
        vec2 u = fract(p);
        u = u*u*(3.0-2.0*u);
        float res = mix(
            mix(hash(ip), hash(ip+vec2(1.0,0.0)), u.x),
            mix(hash(ip+vec2(0.0,1.0)), hash(ip+vec2(1.0,1.0)), u.x),
            u.y
        );
        return res*res;
    }

    void main() {
        vec2 uv = vUv;
        vec2 noiseUV = vec2(uv.x * 2.5, uv.y - uTime * 1.5);
        float n = noise(noiseUV * 3.0);
        
        float bottomWidth = 0.6;
        float sideMask = 1.0 - smoothstep(bottomWidth - (uv.y * 0.4), bottomWidth, abs(uv.x - 0.5) * 2.0);
        float topMask = 1.0 - uv.y;
        
        float shape = (n * 1.5) * sideMask * topMask;
        float alpha = smoothstep(0.3, 0.45, shape);
        
        if (alpha < 0.1) discard;
        
        vec3 color = mix(uColorB, uColorA, shape + 0.2);
        gl_FragColor = vec4(color, 1.0);
    }`
};

export const LakeWaterShader = {
    uniforms: {
        uColor: { value: new THREE.Color('#1e3a8a') },
        uTime: { value: 0 },
        uRaining: { value: 0.0 } // 0.0 = No rain, 1.0 = Raining
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
            vUv = uv;
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        uniform float uRaining;
        varying vec2 vUv;
        varying vec3 vPos;

        // --- NOISE FUNCTIONS ---
        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
                       mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }

        float fbm(vec2 p) {
            float v = 0.0;
            v += 0.500 * noise(p); p *= 2.0;
            v += 0.250 * noise(p); p *= 2.0;
            v += 0.125 * noise(p); p *= 2.0;
            return v;
        }

        // RAIN RIPPLE LOGIC (Dense, fast)
        float rippleLayer(vec2 uv, float scale, float timeOffset) {
            vec2 p = uv * scale;
            vec2 i = floor(p);
            vec2 f = fract(p) - 0.5;
            
            float t = uTime * 3.0 + hash(i) * 10.0 + timeOffset;
            float life = fract(t); 
            
            float d = length(f);
            float ring = smoothstep(0.05, 0.0, abs(d - (life * 0.4)));
            float alpha = 1.0 - life;
            
            return ring * alpha * step(hash(i + vec2(1.0)), 0.3);
        }

        // OCCASIONAL LARGE SPLASH (Fish/Bubble)
        // Sparse, slow, random locations
        float occasionalRipple(vec2 uv) {
            vec2 p = uv * 4.0; // Grid 3x3 (Lower density grid)
            vec2 i = floor(p);
            vec2 f = fract(p) - 0.5;
            
            // Time logic:
            // "t" drives the expansion lifecycle.
            // "generation" is an integer that increments every cycle.
            float t = uTime * 0.8 + hash(i) * 10.0;
            float generation = floor(t);
            float life = fract(t);

            // Randomness:
            // By adding 'generation' to the hash seed, the active cells change every time the ripple finishes.
            // This prevents the "same spot" issue.
            float rnd = hash(i + vec2(generation * 31.0));

            // Scarcity:
            if (rnd < 0.945) return 0.0;
            
            float d = length(f);
            float radius = life * 0.35;
            
            // Thickness:
            // Reduced first smoothstep param from 0.1 to 0.015 for a much thinner, sharper ring.
            float ring = smoothstep(0.005, 0.0, abs(d - radius));
            
            // Fade out earlier so it doesn't look like a hard cut at max radius
            float alpha = smoothstep(1.0, 0.4, life); 
            
            return ring * alpha;
        }

        void main() {
            // 1. Base Water Movement (Calm & Smooth)
            vec2 flowUV = vUv * 8.0 + vec2(sin(uTime * 0.5) * 0.3, uTime * 0.2);
            float waterNoise = fbm(flowUV);
            
            // Sharpen the noise peaks
            waterNoise = smoothstep(0.2, 0.8, waterNoise);
            
            // 2. Depth/Edge Logic
            float depth = 1.0 - vUv.y;
            float edgeBlend = smoothstep(0.0, 0.2, depth);
            float opacity = 0.6 + (depth * 0.4);

            // 3. Ripples
            float surfaceDisturbance = 0.0;
            
            // A: Periodic Splash (Always active)
            surfaceDisturbance += occasionalRipple(vUv);

            // B: Rain Ripples (Conditional)
            if (uRaining > 0.5) {
                surfaceDisturbance += rippleLayer(vUv, 40.0, 5.0);
                surfaceDisturbance += rippleLayer(vUv, 25.0, 15.0);
            }

            // 4. Color Composition
            vec3 highlight = mix(uColor, vec3(0.9, 0.95, 1.0), 0.5);
            
            // Mix: 
            // - Calm noise (0.3 intensity)
            // - Splashes (1.0 intensity - full white)
            float finalMix = (waterNoise * 0.3) + surfaceDisturbance;
            
            vec3 finalColor = mix(uColor, highlight, clamp(finalMix, 0.0, 1.0));

            gl_FragColor = vec4(finalColor, opacity * edgeBlend);
        }
    `
};
