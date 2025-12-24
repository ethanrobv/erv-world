import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { SoftBlock } from './Primitives';
import {
    useWoodFloorMaterial,
    useBrickMaterial,
    useNoiseMaterial,
    useGrassMaterial,
    useLakeBedMaterial,
    useAsphaltMaterial,
    useWoodFurnitureMaterial,
    useFeltMaterial,
    WindowRainShader,
    SceneRainShader,
    FireShader,
    LakeWaterShader
} from './Materials';

// Constants
const FONT_URL = 'https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff';

// Types
type Position = [number, number, number];
type Rotation = [number, number, number];

interface BaseProps {
    position: Position;
    rotation?: Rotation;
}

interface DimensionsProps extends BaseProps {
    width: number;
    length: number;
}

// Furniture

export const BlackjackTable = ({ position, rotation = [0, 0, 0] }: BaseProps) => {
    const feltColor = useThemeColor('--brand-primary') || '#2563eb';
    const woodColor = useThemeColor('--game-wood') || '#78350f';
    const legColor = useThemeColor('--game-object-metal') || '#52525b';
    const cardColor = useThemeColor('--brand-primary') || '#2563eb';

    const woodMat = useWoodFurnitureMaterial(woodColor);
    const feltMat = useFeltMaterial(feltColor);
    const metalMat = useNoiseMaterial(legColor, 3.0, 0.1);

    const decorativeCards = useMemo(() => [0, 1, 2].map((i) => ({
        key: i,
        rotation: [-Math.PI / 2, 0, (i - 1) * 0.2] as [number, number, number],
        position: [(i - 1) * 0.4, 0, 0] as [number, number, number]
    })), []);

    return (
        <group position={ position } rotation={ rotation }>
            <SoftBlock args={ [6.0, 0.1, 3.0] } color={ feltColor } position={ [0, 1.2, 0] } material={ feltMat }
                       castShadow={ true }/>
            <SoftBlock args={ [6.2, 0.15, 3.2] } color={ woodColor } position={ [0, 1.1, 0] } material={ woodMat }
                       castShadow={ true }/>
            <SoftBlock args={ [0.4, 1.1, 0.4] } color={ legColor } position={ [-2.5, 0.55, 1.2] }
                       material={ metalMat }/>
            <SoftBlock args={ [0.4, 1.1, 0.4] } color={ legColor } position={ [2.5, 0.55, 1.2] } material={ metalMat }
                       castShadow={ true }/>
            <SoftBlock args={ [0.4, 1.1, 0.4] } color={ legColor } position={ [-2.5, 0.55, -1.2] } material={ metalMat }
                       castShadow={ true }/>
            <SoftBlock args={ [0.4, 1.1, 0.4] } color={ legColor } position={ [2.5, 0.55, -1.2] }
                       material={ metalMat }/>
            <SoftBlock args={ [1.5, 0.05, 0.5] } color='#111111' position={ [0, 1.25, -1.0] }/>
            <SoftBlock args={ [0.3, 0.15, 0.4] } color='#bb0000' position={ [2.0, 1.25, -0.8] }/>

            <group position={ [0, 1.26, 0] }>
                { decorativeCards.map((props) => (
                    <mesh key={ props.key } rotation={ props.rotation } position={ props.position }>
                        <planeGeometry args={ [0.35, 0.5] }/>
                        <meshStandardMaterial color='#ffffff'/>
                        <mesh position={ [0, 0, -0.001] }>
                            <planeGeometry args={ [0.3, 0.45] }/>
                            <meshStandardMaterial color={ cardColor }/>
                        </mesh>
                    </mesh>
                )) }
                <SoftBlock args={ [0.35, 0.15, 0.5] } color={ cardColor } position={ [-1.5, 0.075, -0.5] }
                           rotation={ [0, 0.2, 0] }/>
                <SoftBlock args={ [0.35, 0.1, 0.5] } color='#ffffff' position={ [1.5, 0.05, -0.5] }
                           rotation={ [0, -0.1, 0] }/>
            </group>
        </group>
    );
};

export const BlackjackChair = ({ position, rotation = [0, 0, 0] }: BaseProps) => {
    const woodColor = useThemeColor('--game-object-wood') || '#b45309';
    const cushionColor = useThemeColor('--text-muted') || '#71717a';
    const legColor = useThemeColor('--game-object-metal') || '#52525b';
    const woodMat = useWoodFurnitureMaterial(woodColor);
    const metalMat = useNoiseMaterial(legColor, 5.0, 0.05);

    return (
        <group position={ position } rotation={ rotation }>
            <SoftBlock args={ [0.6, 0.1, 0.6] } color={ cushionColor } position={ [0, 0.5, 0] }/>
            <SoftBlock args={ [0.6, 0.6, 0.1] } color={ woodColor } position={ [0, 0.8, -0.25] } material={ woodMat }/>
            <SoftBlock args={ [0.08, 0.5, 0.08] } color={ legColor } position={ [-0.25, 0.25, -0.25] }
                       material={ metalMat }/>
            <SoftBlock args={ [0.08, 0.5, 0.08] } color={ legColor } position={ [0.25, 0.25, -0.25] }
                       material={ metalMat }/>
            <SoftBlock args={ [0.08, 0.5, 0.08] } color={ legColor } position={ [-0.25, 0.25, 0.25] }
                       material={ metalMat }/>
            <SoftBlock args={ [0.08, 0.5, 0.08] } color={ legColor } position={ [0.25, 0.25, 0.25] }
                       material={ metalMat }/>
        </group>
    );
};

// Structural Primitives

export const WoodFloor = React.memo(() => {
    const color = useThemeColor('--game-floor-wood');
    const material = useWoodFloorMaterial(color);
    return (
        <group position={ [0, -0.05, 0] }>
            <mesh rotation={ [-Math.PI / 2, 0, 0] } receiveShadow material={ material }>
                <planeGeometry args={ [100, 100] }/>
            </mesh>
        </group>
    );
});

export const GrassFloor = React.memo(() => {
    const material = useGrassMaterial();
    return (
        <group position={ [0, -0.2, 0] }>
            <mesh rotation={ [-Math.PI / 2, 0, 0] } receiveShadow material={ material }>
                <planeGeometry args={ [100, 100] }/>
            </mesh>
        </group>
    );
});

export const LakeFloor = ({ position, width, length }: DimensionsProps) => {
    const material = useLakeBedMaterial();
    // Water surface is usually y=0.1, Grass is y=-0.2
    // We place this at y=-0.15 to sit nicely between them
    const floorY = position[1] - 0.25;

    return (
        <mesh
            position={ [position[0], floorY, position[2]] }
            rotation={ [-Math.PI / 2, 0, 0] }
            receiveShadow
            material={ material }
        >
            <planeGeometry args={ [width, length] }/>
        </mesh>
    );
};

/**
 * Procedural water shader component.
 * Handles dynamic uniform updates for time, color, and rain state.
 */
export const LakeWater = ({ position, width, length, isRaining = false }: DimensionsProps & {
    isRaining?: boolean
}) => {
    const waterColor = useThemeColor('--game-water');
    const mudColor = '#3f2e18';
    const shaderRef = useRef<THREE.ShaderMaterial>(null);

    // Use useState for initialization to ensure stability and avoid dependency warnings.
    // Dynamic updates are handled in useFrame.
    const [shaderArgs] = useState(() => ({
        uniforms: {
            uColor: { value: new THREE.Color(waterColor) },
            uTime: { value: 0 },
            uRaining: { value: isRaining ? 1.0 : 0.0 }
        },
        vertexShader: LakeWaterShader.vertexShader,
        fragmentShader: LakeWaterShader.fragmentShader
    }));

    useFrame((state) => {
        if (shaderRef.current) {
            shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
            shaderRef.current.uniforms.uColor.value.set(waterColor);
            shaderRef.current.uniforms.uRaining.value = isRaining ? 1.0 : 0.0;
        }
    });

    return (
        <group position={ position }>
            <mesh rotation={ [-Math.PI / 2, 0, 0] } receiveShadow>
                <planeGeometry args={ [width, length] }/>
                <shaderMaterial
                    ref={ shaderRef }
                    args={ [shaderArgs] }
                    transparent={ true }
                    depthWrite={ false }
                />
            </mesh>

            {/* Shore Bank */ }
            <mesh position={ [0, -0.05, -length / 2 + 0.5] } rotation={ [-Math.PI / 2, 0, 0] }>
                <planeGeometry args={ [width, 1.5] }/>
                <meshStandardMaterial color={ mudColor } roughness={ 1 }/>
            </mesh>
        </group>
    );
};

export const BrickWall = ({ args, position, rotation, color }: {
    args: [number, number, number];
    position: Position;
    rotation?: Rotation;
    color?: string;
}) => {
    const themeBrick = useThemeColor('--game-wall-brick');
    const material = useBrickMaterial(color || themeBrick);
    return (
        <mesh position={ position } rotation={ rotation } receiveShadow material={ material }>
            <boxGeometry args={ args }/>
        </mesh>
    );
};

export const RoadSurface = ({ position, width, length }: DimensionsProps) => {
    const roadColor = useThemeColor('--game-floor-road');
    const material = useAsphaltMaterial(roadColor);
    return (
        <mesh position={ [position[0], 0.01, position[2]] } rotation={ [-Math.PI / 2, 0, 0] } receiveShadow
              material={ material }>
            <planeGeometry args={ [width, length] }/>
        </mesh>
    );
};

export const Sidewalk = ({ position, width, length }: DimensionsProps) => {
    const concreteColor = useThemeColor('--game-floor-road') || '#999999';
    const material = useNoiseMaterial(concreteColor, 5.0, 0.05);
    return (
        <group position={ position }>
            <mesh position={ [0, 0.1, 0] } material={ material }>
                <boxGeometry args={ [width, 0.2, length] }/>
            </mesh>
            <mesh position={ [0, 0.201, 0] } rotation={ [-Math.PI / 2, 0, 0] } material={ material }>
                <planeGeometry args={ [width, length] }/>
            </mesh>
        </group>
    );
};

// Props & Decor

export const PortalDoor = ({ position, rotation = [0, 0, 0], label, isOpen }: {
    position: Position;
    rotation?: Rotation;
    label: string;
    isOpen: boolean;
}) => {
    const frameColor = useThemeColor('--game-accent') || '#3f3f46';
    const doorColor = useThemeColor('--game-object-wood') || '#18181b';
    const textColor = useThemeColor('--brand-primary') || '#ffffff';
    const signBg = useThemeColor('--bg-surface-highlight') || '#27272a';

    const doorGroupRef = useRef<THREE.Group>(null);
    const woodMat = useWoodFurnitureMaterial(doorColor);
    const frameMat = useWoodFurnitureMaterial(frameColor);

    useFrame((_, delta) => {
        if (doorGroupRef.current) {
            const targetY = isOpen ? -Math.PI / 2.5 : 0;
            doorGroupRef.current.rotation.y = THREE.MathUtils.lerp(doorGroupRef.current.rotation.y, targetY, delta * 5);
        }
    });

    return (
        <group position={ position } rotation={ rotation }>
            <SoftBlock args={ [2, 2.4, 0.1] } color={ frameColor } position={ [0, 1.6, 0] } material={ frameMat }/>
            <group position={ [-1, 1.55, 0.1] } ref={ doorGroupRef }>
                <SoftBlock args={ [1.5, 2, 0.1] } color={ doorColor } position={ [1, 0, 0] } material={ woodMat }/>
                <SoftBlock args={ [0.1, 0.4, 0.2] } color={ textColor } position={ [1.5, -0.2, 0.1] }/>
            </group>
            <group position={ [0, 3.4, 0.2] }>
                <SoftBlock args={ [1.6, 0.6, 0.1] } color={ signBg }/>
                <Text position={ [0, 0, 0.06] } fontSize={ 0.35 } font={ FONT_URL } anchorX='center' anchorY='middle'>
                    { label }
                    <meshStandardMaterial color={ textColor } emissive={ textColor } emissiveIntensity={ 4 }
                                          toneMapped={ false }/>
                </Text>
            </group>
        </group>
    );
};

export const Dumpster = ({ position, rotation = [0, 0, 0] }: BaseProps) => {
    const mainColor = useThemeColor('--game-object-metal');
    const lidColor = useThemeColor('--game-object-wood');
    const bodyMat = useNoiseMaterial(mainColor, 2.0, 0.05);
    const lidMat = useNoiseMaterial(lidColor, 2.0, 0.05);

    return (
        <group position={ position } rotation={ rotation }>
            <SoftBlock args={ [2.5, 1.5, 1.5] } color={ mainColor } position={ [0, 0.75, 0] } material={ bodyMat }/>
            <SoftBlock args={ [2.6, 0.2, 1.6] } color={ lidColor } position={ [0, 1.6, 0] } rotation={ [0.1, 0, 0] }
                       material={ lidMat }/>
        </group>
    );
};

export const Bench = ({ position, rotation = [0, 0, 0] }: BaseProps) => {
    const metalColor = useThemeColor('--game-object-metal') || '#52525b';
    const metalMat = useNoiseMaterial(metalColor, 5.0, 0.05);

    return (
        <group position={ position } rotation={ rotation }>
            <SoftBlock args={ [2.5, 0.1, 0.8] } color={ metalColor } position={ [0, 0.5, 0] } material={ metalMat }/>
            <SoftBlock args={ [2.5, 0.6, 0.1] } color={ metalColor } position={ [0, 1.0, -0.35] }
                       material={ metalMat }/>
            <SoftBlock args={ [0.15, 0.5, 0.8] } color={ metalColor } position={ [-1.1, 0.25, 0] }
                       material={ metalMat }/>
            <SoftBlock args={ [0.15, 0.5, 0.8] } color={ metalColor } position={ [1.1, 0.25, 0] }
                       material={ metalMat }/>
        </group>
    );
};

export const BarStool = ({ position, rotation = [0, 0, 0] }: BaseProps) => {
    const woodColor = useThemeColor('--game-object-wood') || '#b45309';
    const legColor = useThemeColor('--game-object-metal') || '#52525b';
    const woodMat = useWoodFurnitureMaterial(woodColor);
    const metalMat = useNoiseMaterial(legColor, 5.0, 0.05);

    return (
        <group position={ position } rotation={ rotation }>
            <SoftBlock args={ [0.45, 0.1, 0.45] } color={ woodColor } position={ [0, 0.8, 0] } material={ woodMat }/>
            <SoftBlock args={ [0.08, 0.8, 0.08] } color={ legColor } position={ [0, 0.4, 0] } material={ metalMat }/>
            <SoftBlock args={ [0.4, 0.05, 0.4] } color={ legColor } position={ [0, 0.025, 0] } material={ metalMat }/>
        </group>
    );
};

export const CardboardBox = ({ position, rotation = [0, 0, 0], size = 0.8 }: {
    position: Position;
    rotation?: Rotation;
    size?: number;
}) => {
    const boxColor = '#eab308';
    const boxMat = useNoiseMaterial(boxColor, 3.0, 0.05);
    return (
        <SoftBlock args={ [size, size, size] } color={ boxColor } position={ position } rotation={ rotation }
                   material={ boxMat }/>
    );
};

export const HangingLamp = ({ position, color, intensity = 40 }: {
    position: Position;
    color?: string;
    intensity?: number;
}) => {
    const shadeColor = useThemeColor('--game-object-metal') || '#52525b';
    const themeLightColor = useThemeColor('--game-light-warm');
    const lightColor = color || themeLightColor || '#ffaa00';

    const metalMat = useNoiseMaterial(shadeColor, 2.0, 0.05);

    return (
        <group position={ position }>
            <mesh position={ [0, 2, 0] }>
                <cylinderGeometry args={ [0.02, 0.02, 4, 4] }/>
                <meshStandardMaterial color='#111111'/>
            </mesh>
            <mesh position={ [0, 0.2, 0] } material={ metalMat }>
                <coneGeometry args={ [0.4, 0.4, 16, 1, true] }/>
            </mesh>
            <pointLight color={ lightColor } intensity={ intensity * 0.5 } distance={ 5 } decay={ 2 }
                        position={ [0, 0, 0] }/>
            <pointLight color={ lightColor } intensity={ intensity } distance={ 25 } decay={ 2.5 }
                        position={ [0, -0.6, 0] }/>
            <mesh position={ [0, -0.1, 0] }>
                <sphereGeometry args={ [0.12, 16, 16] }/>
                <meshStandardMaterial color={ lightColor } emissive={ lightColor }
                                      emissiveIntensity={ intensity > 10 ? 10 : intensity } toneMapped={ false }/>
            </mesh>
        </group>
    );
};

export const StreetLight = ({ position, rotation = [0, 0, 0] }: BaseProps) => {
    const metalColor = useThemeColor('--game-object-metal') || '#52525b';
    const lightColor = useThemeColor('--game-light-cool') || '#e0f2fe';
    const metalMat = useNoiseMaterial(metalColor, 2.0, 0.05);

    // Lazy initialize the target object once to avoid recreation on every render
    const [targetObj] = useState(() => new THREE.Object3D());

    return (
        <group position={ position } rotation={ rotation }>
            <SoftBlock args={ [0.2, 5, 0.2] } color={ metalColor } position={ [0, 2.5, 0] } material={ metalMat }/>
            <SoftBlock args={ [0.2, 0.2, 1.5] } color={ metalColor } position={ [0, 4.8, 0.75] } material={ metalMat }/>
            <group position={ [0, 4.8, 1.5] }>
                <SoftBlock args={ [0.5, 0.2, 0.5] } color={ metalColor } material={ metalMat }/>
                <mesh position={ [0, -0.1, 0] } rotation={ [Math.PI / 2, 0, 0] }>
                    <planeGeometry args={ [0.4, 0.4] }/>
                    <meshBasicMaterial color={ lightColor } toneMapped={ false }/>
                </mesh>
                <spotLight
                    position={ [0, -0.2, 0] }
                    angle={ 0.9 }
                    penumbra={ 0.8 }
                    intensity={ 80 }
                    distance={ 50 }
                    color={ lightColor }
                    target={ targetObj }
                />
                <primitive object={ targetObj } position={ [0, -5, 2] }/>
            </group>
        </group>
    );
};

export const StandingLamp = ({ position, rotation = [0, 0, 0], intensity = 30 }: {
    position: Position;
    rotation?: Rotation;
    intensity?: number;
}) => {
    const shadeColor = useThemeColor('--bg-surface-highlight') || '#27272a';
    const poleColor = useThemeColor('--game-object-metal') || '#52525b';
    const lightColor = useThemeColor('--game-light-warm') || '#ffaa00';
    const metalMat = useNoiseMaterial(poleColor, 2.0, 0.05);

    return (
        <group position={ position } rotation={ rotation }>
            <SoftBlock args={ [0.6, 0.1, 0.6] } color={ poleColor } position={ [0, 0.05, 0] } material={ metalMat }/>
            <SoftBlock args={ [0.1, 3.5, 0.1] } color={ poleColor } position={ [0, 1.8, 0] } material={ metalMat }/>
            <mesh position={ [0, 3.5, 0] } castShadow>
                <cylinderGeometry args={ [0.35, 0.6, 0.8, 16, 1, true] }/>
                <meshStandardMaterial color={ shadeColor } side={ THREE.DoubleSide } roughness={ 0.2 }/>
            </mesh>
            <pointLight color={ lightColor } intensity={ intensity * 0.5 } distance={ 5 } decay={ 2 }
                        position={ [0, 3.4, 0] } castShadow/>
            <pointLight color={ lightColor } intensity={ intensity } distance={ 8 } decay={ 2 }
                        position={ [0, 2.2, 0] }/>
            <mesh position={ [0, 3, 0] }>
                <sphereGeometry args={ [0.15, 8, 8] }/>
                <meshStandardMaterial color={ lightColor } emissive={ lightColor }
                                      emissiveIntensity={ intensity > 5 ? 5 : intensity } toneMapped={ false }/>
            </mesh>
        </group>
    );
};

export const NeonSign = ({ position, rotation = [0, 0, 0], text, color }: {
    position: Position;
    rotation?: Rotation;
    text: string;
    color?: string;
}) => {
    const frameColor = '#111111';

    // FIX: Call hook unconditionally
    const themeNeonColor = useThemeColor('--game-neon-main');
    const neonColor = color || themeNeonColor || '#db2777';

    return (
        <group position={ position } rotation={ rotation }>
            <SoftBlock args={ [2.5, 1, 0.1] } color={ frameColor }/>
            <Text position={ [0, 0, 0.06] } fontSize={ 0.5 } font={ FONT_URL } anchorX='center' anchorY='middle'>
                { text }
                <meshStandardMaterial color={ neonColor } emissive={ neonColor } emissiveIntensity={ 5 }
                                      toneMapped={ false }/>
            </Text>
        </group>
    );
};

export const Bottle = React.memo(({ position, width, height, color }: {
    position: Position;
    width: number;
    height: number;
    color: string;
}) => {
    const bodyHeight = height * 0.60;
    const shoulderHeight = height * 0.15;
    const neckHeight = height * 0.25;
    const bodyRadius = width / 2;
    const neckRadius = width / 5;

    const glassMaterial = (
        <meshStandardMaterial color={ color } transparent opacity={ 0.7 } roughness={ 0.1 } metalness={ 0.1 }
                              side={ THREE.DoubleSide }/>
    );

    return (
        <group position={ position }>
            <mesh position={ [0, -height / 2 + bodyHeight / 2, 0] }>
                <cylinderGeometry args={ [bodyRadius, bodyRadius, bodyHeight, 16] }/>
                { glassMaterial }
            </mesh>
            <mesh position={ [0, -height / 2 + bodyHeight + shoulderHeight / 2, 0] }>
                <cylinderGeometry args={ [neckRadius, bodyRadius, shoulderHeight, 16] }/>
                { glassMaterial }
            </mesh>
            <mesh position={ [0, -height / 2 + bodyHeight + shoulderHeight + neckHeight / 2, 0] }>
                <cylinderGeometry args={ [neckRadius, neckRadius, neckHeight, 16] }/>
                { glassMaterial }
            </mesh>
            <mesh position={ [0, (height / 2) + 0.02, 0] }>
                <cylinderGeometry args={ [neckRadius + 0.02, neckRadius + 0.02, 0.05, 16] }/>
                <meshStandardMaterial color='#4a3020'/>
            </mesh>
        </group>
    );
});

// Composite Scene Objects

export const BarCounter = React.memo(({ position }: { position: Position }) => {
    const surfaceColor = useThemeColor('--game-floor-wood') || '#3f3f46';
    const woodColor = useThemeColor('--game-object-wood') || '#78350f';
    const woodMat = useWoodFurnitureMaterial(woodColor);
    const surfaceMat = useWoodFloorMaterial(surfaceColor);

    const barHeight = 1.3;
    const barThickness = 0.6;

    return (
        <group position={ position }>
            <group position={ [0, 0, -1.5] }>
                <SoftBlock args={ [6, barHeight, barThickness] } color={ woodColor } position={ [0, barHeight / 2, 0] }
                           material={ surfaceMat }/>
                <SoftBlock args={ [6.2, 0.15, barThickness + 0.2] } color={ woodColor }
                           position={ [0, barHeight + 0.075, 0] } material={ woodMat }/>
            </group>
            <group position={ [-2.7, 0, -2.8] }>
                <SoftBlock args={ [barThickness, barHeight, 2.5] } color={ woodColor }
                           position={ [0, barHeight / 2, 0] } material={ surfaceMat }/>
                <SoftBlock args={ [barThickness + 0.2, 0.15, 2.7] } color={ surfaceColor }
                           position={ [0, barHeight + 0.075, -0.1] } material={ woodMat }/>
            </group>
            <group position={ [2.7, 0, -2.125] }>
                <SoftBlock args={ [barThickness, barHeight, 1.25] } color={ woodColor }
                           position={ [0, barHeight / 2, 0] } material={ surfaceMat }/>
                <SoftBlock args={ [barThickness + 0.2, 0.15, 1.25] } color={ woodColor }
                           position={ [0, barHeight + 0.075, 0] } material={ woodMat }/>
            </group>
        </group>
    );
});

export const BarBackWall = React.memo(({ position, isDay }: { position: Position; isDay: boolean }) => {
    const shelfColor = useThemeColor('--bg-surface-highlight') || '#3f3f46';

    // Fix: Move useThemeColor calls outside the array literal to satisfy strict hook rules.
    const c1 = useThemeColor('--game-accent') || '#f59e0b';
    const c2 = useThemeColor('--brand-primary') || '#2563eb';
    const c3 = useThemeColor('--text-main') || '#ffffff';
    const palette = useMemo(() => [c1, c2, c3], [c1, c2, c3]);

    // Fix: Use useState for pure initialization of random data instead of useMemo.
    const [{ bottomRow, topRow }] = useState(() => {
        const generateRow = (count: number, widthSpread: number) =>
            new Array(count).fill(0).map((_, i) => ({
                id: Math.random(),
                x: -(widthSpread / 2) + (widthSpread / count) / 2 + i * (widthSpread / count),
                colorIndex: Math.floor(Math.random() * 3),
                height: 0.3 + Math.random() * 0.4,
                width: 0.15 + Math.random() * 0.1
            }));
        return { bottomRow: generateRow(6, 2.4), topRow: generateRow(4, 1.5) };
    });

    return (
        <group position={ position }>
            <BrickWall args={ [80, 2.4, 1] } position={ [0, 1.2, -0.6] }/>
            <BrickWall args={ [80, 3.4, 1] } position={ [0, 6.3, -0.6] }/>
            <BrickWall args={ [37.9, 2.2, 1] } position={ [-21.05, 3.5, -0.6] }/>
            <BrickWall args={ [37.9, 2.2, 1] } position={ [21.05, 3.5, -0.6] }/>

            <WindowUnit position={ [0, 3.5, -0.05] } isDay={ isDay }/>

            <group position={ [-4, 0, 0] }>
                <SoftBlock args={ [2.5, 0.1, 0.25] } color={ shelfColor } position={ [0, 2.2, 0] }/>
                { bottomRow.map((b) => (
                    <Bottle key={ b.id } width={ b.width } height={ b.height }
                            color={ palette[b.colorIndex] || '#ffffff' } position={ [b.x, 2.25 + b.height / 2, 0] }/>
                )) }
                <SoftBlock args={ [2.5, 0.1, 0.25] } color={ shelfColor } position={ [0, 3.2, 0] }/>
                { topRow.map((b) => (
                    <Bottle key={ b.id } width={ b.width } height={ b.height }
                            color={ palette[b.colorIndex] || '#ffffff' } position={ [b.x, 3.25 + b.height / 2, 0] }/>
                )) }
            </group>
        </group>
    );
});

export const AlleyArchitecture = React.memo(({ position }: { position: Position }) => {
    return (
        <group position={ position }>
            <BrickWall args={ [45.3, 12, 1] } position={ [-17.55, 6, -0.6] }/>
            <BrickWall args={ [32.7, 12, 1] } position={ [23.6, 6, -0.6] }/>
            <BrickWall args={ [2.6, 8.5, 1] } position={ [6, 6.5, -0.6] }/>
        </group>
    );
});

// Effects

const WindowRain = () => {
    const count = 400;
    const shaderRef = useRef<THREE.ShaderMaterial>(null);

    // Fix: Use useState for pure initialization of random arrays
    const [{ positions, speeds }] = useState(() => {
        const pos = new Float32Array(count * 3);
        const spd = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 10;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 7;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 2 - 1.5;
            spd[i] = 4.0 + Math.random() * 5.0;
        }
        return { positions: pos, speeds: spd };
    });

    useFrame((state) => {
        if (shaderRef.current) shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    });

    return (
        <points rotation={ [0, 0, 0.25] }>
            <bufferGeometry>
                <bufferAttribute attach='attributes-position' args={ [positions, 3] }/>
                <bufferAttribute attach='attributes-aSpeed' args={ [speeds, 2] }/>
            </bufferGeometry>
            <shaderMaterial ref={ shaderRef } args={ [WindowRainShader] } transparent depthWrite={ false }/>
        </points>
    );
};

export const WindowUnit = ({ position, rotation = [0, 0, 0], isDay }: {
    position: Position;
    rotation?: Rotation;
    isDay: boolean
}) => {
    const frameColor = useThemeColor('--game-object-wood') || '#b45309';
    const glassColor = useThemeColor('--game-window-glass') || '#dbeafe';
    const frameMat = useWoodFurnitureMaterial(frameColor);

    const glassRoughness = 0.2;
    const glassMetalness = 0.1;

    // Physical glass settings
    const emissiveIntensity = isDay ? 0.5 : 0.1;
    const opacity = isDay ? 0.6 : 0.2;

    return (
        <group position={ position } rotation={ rotation }>
            <group visible={ !isDay }>
                <WindowRain/>
            </group>
            <SoftBlock args={ [4.2, 0.2, 0.2] } color={ frameColor } position={ [0, 1.1, 0] } material={ frameMat }/>
            <SoftBlock args={ [4.2, 0.2, 0.2] } color={ frameColor } position={ [0, -1.1, 0] } material={ frameMat }/>
            <SoftBlock args={ [0.2, 2.2, 0.2] } color={ frameColor } position={ [-2.1, 0, 0] } material={ frameMat }/>
            <SoftBlock args={ [0.2, 2.2, 0.2] } color={ frameColor } position={ [2.1, 0, 0] } material={ frameMat }/>
            <SoftBlock args={ [0.1, 2.0, 0.1] } color={ frameColor } position={ [0, 0, 0] } material={ frameMat }/>
            <SoftBlock args={ [4.0, 0.1, 0.1] } color={ frameColor } position={ [0, 0, 0] } material={ frameMat }/>

            <mesh position={ [0, 0, -0.05] }>
                <planeGeometry args={ [3.8, 1.8] }/>
                <meshPhysicalMaterial
                    color={ glassColor }
                    emissive={ glassColor }
                    emissiveIntensity={ emissiveIntensity }
                    toneMapped={ false }
                    transparent
                    opacity={ opacity }
                    roughness={ glassRoughness }
                    metalness={ glassMetalness }
                    reflectivity={ 0.5 }
                />
            </mesh>
        </group>
    );
};

export const SceneRain = () => {
    const count = 3000;
    const shaderRef = useRef<THREE.ShaderMaterial>(null);

    // Fix: Use useState for pure initialization
    const [{ positions, speeds }] = useState(() => {
        const pos = new Float32Array(count * 3);
        const spd = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 60;
            pos[i * 3 + 1] = Math.random() * 25;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
            spd[i] = 6.0 + Math.random() * 6.0;
        }
        return { positions: pos, speeds: spd };
    });

    useFrame((state) => {
        if (shaderRef.current) shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    });

    return (
        <points rotation={ [0.2, 0, 0] }>
            <bufferGeometry>
                <bufferAttribute attach='attributes-position' args={ [positions, 3] }/>
                <bufferAttribute attach='attributes-aSpeed' args={ [speeds, 1] }/>
            </bufferGeometry>
            <shaderMaterial ref={ shaderRef } args={ [SceneRainShader] } transparent depthWrite={ false }/>
        </points>
    );
};

const circleGeo = new THREE.CircleGeometry(0.35, 16);
const firePlaneGeo = new THREE.PlaneGeometry(0.9, 1.4);
const darknessMat = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.9 });

export const TrashCanFire = React.memo(({ position, isOn }: { position: Position; isOn?: boolean }) => {
    const groupRef = useRef<THREE.Group>(null);
    const lightRef = useRef<THREE.PointLight>(null);
    const fireMeshRef = useRef<THREE.Mesh>(null);

    const canColor = useThemeColor('--game-object-metal') || '#52525b';
    const noiseMat = useNoiseMaterial(canColor, 4.0, 0.05);

    // Fix: Use useState for pure initialization
    const [timeOffset] = useState(() => Math.random() * 100);

    useFrame((state) => {
        if (!isOn) return;

        const time = state.clock.elapsedTime + timeOffset;

        if (lightRef.current) {
            lightRef.current.intensity = 10 + (Math.sin(time * 5) * 1.5 + Math.cos(time * 12) * 0.5);
            lightRef.current.position.y = 1.0 + Math.sin(time * 3) * 0.05;
        }
        if (fireMeshRef.current) {
            const material = fireMeshRef.current.material as THREE.ShaderMaterial;
            if (material.uniforms?.uTime) {
                material.uniforms.uTime.value = time;
            }
            fireMeshRef.current.lookAt(state.camera.position);
            fireMeshRef.current.rotation.x = 0;
            fireMeshRef.current.rotation.z = 0;
        }
    });

    return (
        <group position={ position } ref={ groupRef }>
            <SoftBlock args={ [0.8, 1.0, 0.8] } color={ canColor } position={ [0, 0.43, 0] } material={ noiseMat }/>

            <mesh
                position={ [0, 1.0, 0] }
                rotation={ [-Math.PI / 2, 0, 0] }
                geometry={ circleGeo }
                material={ darknessMat }
            />

            { isOn && (
                <group>
                    <mesh
                        ref={ fireMeshRef }
                        position={ [0, 1.5, 0] }
                        geometry={ firePlaneGeo }
                    >
                        <shaderMaterial
                            args={ [FireShader] }
                            transparent
                            side={ THREE.DoubleSide }
                            toneMapped={ false }
                        />
                    </mesh>

                    <pointLight
                        ref={ lightRef }
                        position={ [0, 1.3, 0] }
                        color='#ff6600'
                        distance={ 8 }
                        decay={ 2 }
                        castShadow
                    />
                </group>
            ) }
        </group>
    );
});

export const ReedPlant = ({ position, rotation = [0, 0, 0] }: BaseProps) => {
    const stemColor = '#4d7c0f';
    const headColor = '#5c4033';
    return (
        <group position={ position } rotation={ rotation }>
            {/* Stems */ }
            { [0, 1, 2, 3, 4].map((i) => (
                <mesh key={ `stem-${ i }` } position={ [
                    (Math.sin(i * 2) * 0.15),
                    0.6 + (i % 2) * 0.1,
                    (Math.cos(i * 2) * 0.15)
                ] } rotation={ [Math.sin(i) * 0.1, 0, Math.cos(i) * 0.1] }>
                    <cylinderGeometry args={ [0.015, 0.02, 1.2, 4] }/>
                    <meshStandardMaterial color={ stemColor }/>
                </mesh>
            )) }
            {/* Tails/Heads */ }
            { [0, 2, 4].map((i) => (
                <mesh key={ `head-${ i }` } position={ [
                    (Math.sin(i * 2) * 0.15) + Math.sin(i) * 0.06,
                    1.1 + (i % 2) * 0.1,
                    (Math.cos(i * 2) * 0.15) + Math.cos(i) * 0.06
                ] } rotation={ [Math.sin(i) * 0.1, 0, Math.cos(i) * 0.1] }>
                    <capsuleGeometry args={ [0.035, 0.2, 4, 8] }/>
                    <meshStandardMaterial color={ headColor }/>
                </mesh>
            )) }
        </group>
    );
};
