import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { SoftBlock } from './CoreAssets';

type Position = [number, number, number];
type Rotation = [number, number, number];

export const Floor = ({ colorOverride, useGrass }: { colorOverride?: string; useGrass?: boolean }) => {
    const defaultColor = useThemeColor('--bg-surface');
    const grassColor = useThemeColor('--game-grass');

    return (
        <group position={ [0, -0.01, 0] }>
            <mesh rotation={ [-Math.PI / 2, 0, 0] } receiveShadow>
                <planeGeometry args={ [100, 100] }/>
                <meshStandardMaterial
                    color={ colorOverride || (useGrass ? grassColor : defaultColor) }
                    roughness={ 1 }
                />
            </mesh>
        </group>
    );
};

export const PortalDoor = ({
                               position,
                               rotation = [0, 0, 0],
                               label,
                               isOpen
                           }: {
    position: Position;
    rotation?: Rotation;
    label: string;
    isOpen: boolean;
}) => {
    const frameColor = useThemeColor('--text-muted');
    const doorColor = useThemeColor('--bg-surface');
    const textColor = useThemeColor('--brand-primary');
    const signBg = useThemeColor('--bg-surface-highlight');
    const doorGroupRef = useRef<THREE.Group>(null);

    useFrame((_, delta) => {
        if (doorGroupRef.current) {
            const targetY = isOpen ? -Math.PI / 2.5 : 0;
            doorGroupRef.current.rotation.y = THREE.MathUtils.lerp(
                doorGroupRef.current.rotation.y,
                targetY,
                delta * 5
            );
        }
    });

    return (
        <group position={ position } rotation={ rotation }>
            <SoftBlock args={ [2.4, 3.4, 0.2] } color={ frameColor } position={ [0, 1.7, 0] }/>
            <group position={ [-1, 1.7, 0.1] } ref={ doorGroupRef }>
                <SoftBlock args={ [2.0, 3.0, 0.1] } color={ doorColor } position={ [1, 0, 0] }/>
                <SoftBlock args={ [0.1, 0.4, 0.2] } color={ textColor } position={ [1.8, -0.1, 0.1] }/>
            </group>
            <group position={ [0, 3.8, 0.2] }>
                <SoftBlock args={ [1.6, 0.6, 0.1] } color={ signBg }/>
                <Text
                    position={ [0, 0, 0.06] }
                    fontSize={ 0.35 }
                    font='https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff'
                    anchorX='center'
                    anchorY='middle'
                >
                    { label }
                    <meshStandardMaterial
                        color={ textColor }
                        emissive={ textColor }
                        emissiveIntensity={ 4 }
                        toneMapped={ false }
                    />
                </Text>
            </group>
        </group>
    );
};

export const SimpleBottle = ({ position, width, height, color }: {
    position: Position;
    width: number;
    height: number;
    color: string;
}) => {
    // Proportions
    const bodyHeight = height * 0.60;
    const shoulderHeight = height * 0.15; // The tapered part
    const neckHeight = height * 0.25;

    const bodyRadius = width / 2;
    const neckRadius = width / 5;

    // Calculate Y-offsets to center the entire bottle vertically around (0,0,0)
    // The total stack starts at -height/2 and goes to +height/2
    const startY = -height / 2;

    const bodyY = startY + (bodyHeight / 2);
    const shoulderY = startY + bodyHeight + (shoulderHeight / 2);
    const neckY = startY + bodyHeight + shoulderHeight + (neckHeight / 2);

    // Shared material for the glass parts
    const glassMaterial = (
        <meshStandardMaterial
            color={ color }
            transparent
            opacity={ 0.7 }
            roughness={ 0.1 }
            metalness={ 0.1 }
            side={ THREE.DoubleSide }
        />
    );

    return (
        <group position={ position }>
            {/* Base */}
            <mesh position={ [0, bodyY, 0] } castShadow receiveShadow>
                <cylinderGeometry args={ [bodyRadius, bodyRadius, bodyHeight, 16] } />
                { glassMaterial }
            </mesh>

            {/* Tapered to neck */}
            <mesh position={ [0, shoulderY, 0] } castShadow receiveShadow>
                {/* args: [radiusTop, radiusBottom, height, segments] */}
                <cylinderGeometry args={ [neckRadius, bodyRadius, shoulderHeight, 16] } />
                { glassMaterial }
            </mesh>

            {/* 3. Neck */}
            <mesh position={ [0, neckY, 0] } castShadow receiveShadow>
                <cylinderGeometry args={ [neckRadius, neckRadius, neckHeight, 16] } />
                { glassMaterial }
            </mesh>

            {/* Cap */}
            <mesh position={ [0, (height / 2) + 0.02, 0] }>
                <cylinderGeometry args={ [neckRadius + 0.02, neckRadius + 0.02, 0.05, 16] } />
                <meshStandardMaterial color="#4a3020" roughness={ 1 } />
            </mesh>
        </group>
    );
};

export const Dumpster = ({ position, rotation = [0, 0, 0] }: { position: Position; rotation?: Rotation }) => {
    const mainColor = useThemeColor('--brand-primary');
    const lidColor = useThemeColor('--game-metal');

    return (
        <group position={ position } rotation={ rotation }>
            <SoftBlock args={ [2.5, 1.5, 1.5] } color={ mainColor } position={ [0, 0.75, 0] }/>
            <SoftBlock args={ [2.6, 0.2, 1.6] } color={ lidColor } position={ [0, 1.6, 0] } rotation={ [0.1, 0, 0] }/>
        </group>
    );
};

export const CardboardBox = ({
                                 position,
                                 rotation = [0, 0, 0],
                                 size = 0.8
                             }: {
    position: Position;
    rotation?: Rotation;
    size?: number;
}) => {
    const boxColor = useThemeColor('--game-wood');
    return (
        <SoftBlock args={ [size, size, size] } color={ boxColor } position={ position } rotation={ rotation }/>
    );
};

export const Bench = ({ position, rotation = [0, 0, 0] }: { position: Position; rotation?: Rotation }) => {
    const woodColor = useThemeColor('--game-wood');
    const legColor = useThemeColor('--game-metal');

    return (
        <group position={ position } rotation={ rotation }>
            <SoftBlock args={ [2.5, 0.1, 0.8] } color={ woodColor } position={ [0, 0.5, 0] }/>
            <SoftBlock args={ [2.5, 0.6, 0.1] } color={ woodColor } position={ [0, 1.0, -0.35] }/>
            <SoftBlock args={ [0.15, 0.5, 0.8] } color={ legColor } position={ [-1.1, 0.25, 0] }/>
            <SoftBlock args={ [0.15, 0.5, 0.8] } color={ legColor } position={ [1.1, 0.25, 0] }/>
        </group>
    );
};

export const HangingLamp = ({ position, color, intensity = 40 }: {
    position: Position;
    color?: string;
    intensity?: number
}) => {
    const shadeColor = useThemeColor('--game-metal');
    const lightColor = color || useThemeColor('--game-light-warm');
    const cableColor = '#111';

    return (
        <group position={ position }>
            {/* Cable */ }
            <mesh position={ [0, 2, 0] }>
                <cylinderGeometry args={ [0.02, 0.02, 4, 4] }/>
                <meshStandardMaterial color={ cableColor }/>
            </mesh>

            {/* Shade Mesh - Must cast shadow to block the internal light */ }
            <mesh position={ [0, 0.2, 0] } castShadow>
                <coneGeometry args={ [0.4, 0.4, 16, 1, true] }/>
                <meshStandardMaterial color={ shadeColor } side={ THREE.DoubleSide }/>
            </mesh>

            {/* 1. INTERNAL LIGHT (Casts shadows from the shade rim) */ }
            <pointLight
                color={ lightColor }
                intensity={ intensity * 0.5 }
                distance={ 5 }
                decay={ 2 }
                position={ [0, 0, 0] }
                castShadow
                shadow-bias={ -0.0001 }
            />

            {/* 2. DOWNWARD FILL (The main functional light for the table/floor) */ }
            <pointLight
                color={ lightColor }
                intensity={ intensity }
                distance={ 25 }
                decay={ 2.5 }
                position={ [0, -0.6, 0] }
                castShadow={ true } // Diffuse fill, no shadows
            />

            {/* 3. UPWARD FILL (Lights the cable and ceiling slightly) */ }
            <pointLight
                color={ lightColor }
                intensity={ intensity * 0.1 }
                distance={ 3 }
                decay={ 1.5 }
                position={ [0, 0.5, 0] }
                castShadow={ false }
            />

            {/* Bulb Visual */ }
            <mesh position={ [0, -0.1, 0] }>
                <sphereGeometry args={ [0.12, 16, 16] }/>
                <meshStandardMaterial
                    color={ lightColor }
                    emissive={ lightColor }
                    emissiveIntensity={ intensity > 10 ? 10 : intensity }
                    toneMapped={ false }
                />
            </mesh>
        </group>
    );
};

export const StreetLight = ({ position, rotation = [0, 0, 0] }: { position: Position; rotation?: Rotation }) => {
    const metalColor = useThemeColor('--game-metal');
    const lightColor = useThemeColor('--game-light-cool');
    const targetRef = useRef<THREE.Object3D>(new THREE.Object3D());
    const targetPos: Position = [0, -5, 2];

    return (
        <group position={ position } rotation={ rotation }>
            <SoftBlock args={ [0.2, 5, 0.2] } color={ metalColor } position={ [0, 2.5, 0] }/>
            <SoftBlock args={ [0.2, 0.2, 1.5] } color={ metalColor } position={ [0, 4.8, 0.75] }/>
            <group position={ [0, 4.8, 1.5] }>
                <SoftBlock args={ [0.5, 0.2, 0.5] } color={ metalColor }/>
                <mesh position={ [0, -0.1, 0] } rotation={ [Math.PI / 2, 0, 0] }>
                    <planeGeometry args={ [0.4, 0.4] }/>
                    <meshBasicMaterial
                        color={ lightColor }
                        toneMapped={ false }
                    />
                </mesh>
                <spotLight
                    position={ [0, -0.2, 0] }
                    angle={ 0.9 }
                    penumbra={ 0.8 } // High penumbra for very soft edges
                    intensity={ 80 }
                    distance={ 50 }
                    color={ lightColor }
                    castShadow
                    target={ targetRef.current }
                />
                <primitive object={ targetRef.current } position={ targetPos }/>
            </group>
        </group>
    );
};

export const StandingLamp = ({ position, rotation = [0, 0, 0], intensity = 30 }: {
    position: Position;
    rotation?: Rotation;
    intensity?: number
}) => {
    const shadeColor = useThemeColor('--bg-surface-highlight');
    const poleColor = useThemeColor('--game-metal');
    const lightColor = useThemeColor('--game-light-warm');

    return (
        <group position={ position } rotation={ rotation }>
            <SoftBlock args={ [0.6, 0.1, 0.6] } color={ poleColor } position={ [0, 0.05, 0] }/>
            <SoftBlock args={ [0.1, 3.5, 0.1] } color={ poleColor } position={ [0, 1.8, 0] }/>

            {/* Shade Mesh */ }
            <mesh position={ [0, 3.5, 0] } castShadow>
                <cylinderGeometry args={ [0.35, 0.6, 0.8, 16, 1, true] }/>
                <meshStandardMaterial color={ shadeColor } side={ THREE.DoubleSide } roughness={ 0.2 }/>
            </mesh>

            {/* 1. INTERNAL LIGHT (Casts the hard shadows on walls) */ }
            <pointLight
                color={ lightColor }
                intensity={ intensity * 0.5 }
                distance={ 5 }
                decay={ 2 }
                position={ [0, 3.4, 0] }
                castShadow
                shadow-bias={ -0.0001 }
            />

            {/* 2. BOTTOM FILL (Lights the floor diffusely) */ }
            {/* Positioned just below the shade rim so it hits the floor directly */ }
            <pointLight
                color={ lightColor }
                intensity={ intensity }
                distance={ 8 }
                decay={ 2 }
                position={ [0, 2.2, 0] }
                castShadow={ false } // No shadow creates a soft, diffuse look on the floor
            />

            {/* 3. TOP FILL (Lights the ceiling) */ }
            {/* Positioned just above the shade rim */ }
            <pointLight
                color={ lightColor }
                intensity={ intensity * 0.3 }
                distance={ 4 }
                decay={ 2 }
                position={ [0, 3.8, 0] }
                castShadow={ false }
            />

            {/* Bulb Visual */ }
            <mesh position={ [0, 3, 0] }>
                <sphereGeometry args={ [0.15, 8, 8] }/>
                <meshStandardMaterial
                    color={ lightColor }
                    emissive={ lightColor }
                    emissiveIntensity={ intensity > 5 ? 5 : intensity }
                    toneMapped={ false }
                />
            </mesh>
        </group>
    );
};

export const NeonSign = ({
                             position,
                             rotation = [0, 0, 0],
                             text,
                             color
                         }: {
    position: Position;
    rotation?: Rotation;
    text: string;
    color?: string;
}) => {
    const frameColor = '#111';
    const neonColor = color || useThemeColor('--game-neon-main');

    return (
        <group position={ position } rotation={ rotation }>
            <SoftBlock args={ [2.5, 1, 0.1] } color={ frameColor }/>
            <Text
                position={ [0, 0, 0.06] }
                fontSize={ 0.5 }
                font='https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff'
                anchorX='center'
                anchorY='middle'
            >
                { text }
                <meshStandardMaterial
                    color={ neonColor }
                    emissive={ neonColor }
                    emissiveIntensity={ 5 }
                    toneMapped={ false }
                />
            </Text>
        </group>
    );
};

const WindowRainShaderMaterial = {
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
          
          // Reverted opacity to original softness (0.6)
          float alpha = 0.6 * (1.0 - (dist * 2.0));
          gl_FragColor = vec4(uColor, alpha);
        }
  `
};

const WindowRain = () => {
    const count = 400;
    const shaderRef = useRef<THREE.ShaderMaterial>(null);

    // Generate static initial data once
    const { positions, speeds } = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const spd = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 10;      // X
            pos[i * 3 + 1] = (Math.random() - 0.5) * 7;   // Y
            pos[i * 3 + 2] = (Math.random() - 0.5) * 2 - 1.5; // Z

            // Random fall speed for each drop
            spd[i] = 4.0 + Math.random() * 5.0;
        }
        return { positions: pos, speeds: spd };
    }, []);

    // CPU only updates one number per frame (Time)
    useFrame((state) => {
        if (shaderRef.current) {
            shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        }
    });

    return (
        <points rotation={ [0, 0, 0.25] }>
            <bufferGeometry>
                {/* FIX: Use 'args' to pass [array, itemSize] to the constructor */ }
                <bufferAttribute
                    attach="attributes-position"
                    args={ [positions, 3] }
                />
                <bufferAttribute
                    attach="attributes-aSpeed"
                    args={ [speeds, 1] }
                />
            </bufferGeometry>
            <shaderMaterial
                ref={ shaderRef }
                args={ [WindowRainShaderMaterial] }
                transparent
                depthWrite={ false }
            />
        </points>
    );
};

export const WindowUnit = ({ position, rotation = [0, 0, 0], isDay }: {
    position: [number, number, number];
    rotation?: [number, number, number];
    isDay: boolean
}) => {
    const frameColor = useThemeColor('--game-wood');
    const glassColor = useThemeColor('--game-window-glass');

    const emissiveIntensity = isDay ? 1.5 : 0.1;
    const opacity = isDay ? 0.6 : 0.2;

    return (
        <group position={ position } rotation={ rotation }>
            {/* Rain only plays at night */ }
            { !isDay && <WindowRain/> }

            {/* Frame - Top/Bottom */ }
            <SoftBlock args={ [4.2, 0.2, 0.2] } color={ frameColor } position={ [0, 1.1, 0] }/>
            <SoftBlock args={ [4.2, 0.2, 0.2] } color={ frameColor } position={ [0, -1.1, 0] }/>
            {/* Frame - Sides */ }
            <SoftBlock args={ [0.2, 2.2, 0.2] } color={ frameColor } position={ [-2.1, 0, 0] }/>
            <SoftBlock args={ [0.2, 2.2, 0.2] } color={ frameColor } position={ [2.1, 0, 0] }/>
            {/* Frame - Crossbars */ }
            <SoftBlock args={ [0.1, 2.0, 0.1] } color={ frameColor } position={ [0, 0, 0] }/>
            <SoftBlock args={ [4.0, 0.1, 0.1] } color={ frameColor } position={ [0, 0, 0] }/>

            {/* Glass Pane - Transparent */ }
            <mesh position={ [0, 0, -0.05] }>
                <planeGeometry args={ [3.8, 1.8] }/>
                <meshStandardMaterial
                    color={ glassColor }
                    emissive={ glassColor }
                    emissiveIntensity={ emissiveIntensity }
                    toneMapped={ false }
                    transparent
                    opacity={ opacity }
                />
            </mesh>
        </group>
    );
};

const SceneRainShaderMaterial = {
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
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;
          float alpha = 0.5 * (1.0 - (dist * 2.0));
          gl_FragColor = vec4(uColor, alpha);
        }
  `
};

export const SceneRain = () => {
    const count = 3000;
    const shaderRef = useRef<THREE.ShaderMaterial>(null);

    const { positions, speeds } = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const spd = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 60;      // X: Wide area
            pos[i * 3 + 1] = Math.random() * 25;          // Y: Random phase offset (0-25)
            pos[i * 3 + 2] = (Math.random() - 0.5) * 60;  // Z: Wide area

            // Faster fall speed for heavy rain feel
            spd[i] = 6.0 + Math.random() * 6.0;
        }
        return { positions: pos, speeds: spd };
    }, []);

    useFrame((state) => {
        if (shaderRef.current) {
            shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        }
    });

    return (
        <points rotation={ [0.2, 0, 0] }>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={ [positions, 3] }
                />
                <bufferAttribute
                    attach="attributes-aSpeed"
                    args={ [speeds, 1] }
                />
            </bufferGeometry>
            <shaderMaterial
                ref={ shaderRef }
                args={ [SceneRainShaderMaterial] }
                transparent
                depthWrite={ false }
            />
        </points>
    );
};

const FireShaderMaterial = {
    uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color('#ffaa00') }, // Core (Yellow/Orange)
        uColorB: { value: new THREE.Color('#ff2200') }, // Tips (Red)
    },
    vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Gentle sway for the whole fire volume
      // Reduced speed (uTime * 2.0 instead of 8.0)
      float sway = sin(pos.y * 2.0 - uTime * 2.0) * 0.05 * pos.y;
      pos.x += sway;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
    fragmentShader: `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uTime;
    varying vec2 vUv;
    
    // Simple pseudo-random noise
    float rand(vec2 n) { 
        return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
    }

    // Value noise for flame structure
    float noise(vec2 p){
        vec2 ip = floor(p);
        vec2 u = fract(p);
        u = u*u*(3.0-2.0*u);
        
        float res = mix(
            mix(rand(ip), rand(ip+vec2(1.0,0.0)), u.x),
            mix(rand(ip+vec2(0.0,1.0)), rand(ip+vec2(1.0,1.0)), u.x), u.y);
        return res*res;
    }

    void main() {
      vec2 uv = vUv;
      
      // 1. Vertical Movement:
      // We offset the UVs downwards over time to make the noise pattern move UP.
      // Slower speed (uTime * 1.5)
      vec2 noiseUV = vec2(uv.x * 2.5, uv.y - uTime * 1.5);
      
      // 2. Generate Noise Structure:
      // This creates the "tongues" of fire
      float n = noise(noiseUV * 3.0);
      
      // 3. Shape Masking:
      // Taper the flames at the top (uv.y) and sides (uv.x)
      float bottomWidth = 0.6; // How wide the base is
      float sideMask = 1.0 - smoothstep(bottomWidth - (uv.y * 0.4), bottomWidth, abs(uv.x - 0.5) * 2.0);
      float topMask = 1.0 - uv.y; // Fade out as we go up
      
      // Combine noise with the mask. 
      // We essentially "cut out" the flame shape using the noise.
      float shape = (n * 1.5) * sideMask * topMask;
      
      // 4. Thresholding for "Distinct" Look:
      // Instead of a soft fade, we use a sharper step to create distinct edges.
      float alpha = smoothstep(0.3, 0.45, shape);
      
      // Discard transparent pixels
      if (alpha < 0.1) discard;
      
      // 5. Color Gradient:
      // Mix based on height and noise density
      vec3 color = mix(uColorB, uColorA, shape + 0.2);
      
      // Add a hot white core at the very bottom center
      float core = 1.0 - distance(vec2(uv.x, uv.y * 2.0), vec2(0.5, 0.0));
      color += vec3(0.5) * smoothstep(0.8, 1.0, core);
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

export const TrashCanFire = ({ position, isOn }: { position: [number, number, number]; isOn: boolean }) => {
    const groupRef = useRef<THREE.Group>(null);
    const lightRef = useRef<THREE.PointLight>(null);
    const fireMeshRef = useRef<THREE.Mesh>(null);
    const canColor = useThemeColor('--game-metal');

    useFrame((state) => {
        const time = state.clock.elapsedTime;

        // 1. Flicker Logic (Slower and less erratic)
        if (isOn && lightRef.current) {
            // Slower sine waves (time * 5 instead of 20)
            const flicker = Math.sin(time * 5) * 1.5 + Math.cos(time * 12) * 0.5;
            lightRef.current.intensity = 10 + flicker;
            lightRef.current.position.y = 1.0 + Math.sin(time * 3) * 0.05;
        }

        // 2. Shader Time Update
        if (isOn && fireMeshRef.current) {
            (fireMeshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
            // Billboard effect: Always face camera
            fireMeshRef.current.lookAt(state.camera.position);
            fireMeshRef.current.rotation.x = 0;
            fireMeshRef.current.rotation.z = 0;
        }
    });

    return (
        <group position={ position } ref={ groupRef }>
            {/* The Trash Can */ }
            <SoftBlock args={ [0.8, 1.0, 0.8] } color={ canColor } position={ [0, 0.5, 0] }/>
            {/* Inner rim/trash fake */ }
            <mesh position={ [0, 1.0, 0] } rotation={ [-Math.PI / 2, 0, 0] }>
                <circleGeometry args={ [0.35, 16] }/>
                <meshStandardMaterial color="#111"/>
            </mesh>

            {/* The Fire */ }
            { isOn && (
                <>
                    <mesh position={ [0, 1.4, 0] } ref={ fireMeshRef }>
                        <planeGeometry args={ [0.9, 1.4] }/>
                        <shaderMaterial args={ [FireShaderMaterial] } transparent side={ THREE.DoubleSide }/>
                    </mesh>

                    {/* Shadow Casting Light */ }
                    <pointLight
                        ref={ lightRef }
                        position={ [0, 1.0, 0] }
                        color="#ff6600"
                        distance={ 8 }
                        decay={ 2 }
                        castShadow
                        shadow-bias={ -0.001 }
                    />
                </>
            ) }
        </group>
    );
};
