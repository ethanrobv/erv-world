import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useThemeColor } from '../../hooks/useThemeColor';

/* -------------------------------------------------------------------------- */
/* BASE COMPONENTS                                                            */
/* -------------------------------------------------------------------------- */

export const SoftBlock = ({
                              args,
                              color,
                              position,
                              rotation,
                              opacity = 1,
                              transparent = false
                          }: {
    args: [number, number, number],
    color: string,
    position?: [number, number, number],
    rotation?: [number, number, number],
    opacity?: number,
    transparent?: boolean
}) => (
    <RoundedBox
        args={ args }
        radius={ 0.05 }
        smoothness={ 4 }
        position={ position }
        rotation={ rotation }
        castShadow
        receiveShadow
    >
        <meshStandardMaterial
            color={ color }
            opacity={ opacity }
            transparent={ transparent }
            roughness={ 0.4 }
            metalness={ 0.1 }
        />
    </RoundedBox>
);

/* -------------------------------------------------------------------------- */
/* ENVIRONMENT & ARCHITECTURE                                                 */
/* -------------------------------------------------------------------------- */

export const Floor = ({ colorOverride }: { colorOverride?: string }) => {
    const defaultColor = useThemeColor('--bg-surface');
    return (
        <group position={ [0, -0.01, 0] }>
            <mesh rotation={ [-Math.PI / 2, 0, 0] } receiveShadow>
                <planeGeometry args={ [100, 100] }/>
                <meshStandardMaterial color={ colorOverride || defaultColor } roughness={ 1 }/>
            </mesh>
        </group>
    );
};

export const PortalDoor = ({ position, rotation = [0, 0, 0], label, isOpen }: {
    position: [number, number, number],
    rotation?: [number, number, number],
    label: string,
    isOpen: boolean
}) => {
    const frameColor = useThemeColor('--text-muted');
    const doorColor = useThemeColor('--bg-surface');
    const textColor = useThemeColor('--brand-primary');
    const signBg = useThemeColor('--bg-surface-highlight');
    const doorGroupRef = useRef<THREE.Group>(null);

    useFrame((_, delta) => {
        if (doorGroupRef.current) {
            const targetY = isOpen ? -Math.PI / 2.5 : 0;
            doorGroupRef.current.rotation.y = THREE.MathUtils.lerp(doorGroupRef.current.rotation.y, targetY, delta * 5);
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

/* -------------------------------------------------------------------------- */
/* PROPS & FURNITURE                                                          */
/* -------------------------------------------------------------------------- */

export const SimpleBottle = ({ position, width, height, color }: any) => (
    <mesh position={ position } castShadow>
        <boxGeometry args={ [width, height, width] }/>
        <meshStandardMaterial color={ color } transparent opacity={ 0.8 } roughness={ 0.2 } metalness={ 0.1 }/>
    </mesh>
);

export const Dumpster = ({ position, rotation = [0, 0, 0] }: {
    position: [number, number, number],
    rotation?: [number, number, number]
}) => {
    const mainColor = useThemeColor('--brand-primary');
    const lidColor = useThemeColor('--game-metal');

    return (
        <group position={ position } rotation={ rotation }>
            <SoftBlock args={ [2.5, 1.5, 1.5] } color={ mainColor } position={ [0, 0.75, 0] }/>
            <SoftBlock args={ [2.6, 0.2, 1.6] } color={ lidColor } position={ [0, 1.6, 0] } rotation={ [0.1, 0, 0] }/>
        </group>
    );
};

export const CardboardBox = ({ position, rotation = [0, 0, 0], size = 0.8 }: {
    position: [number, number, number],
    rotation?: [number, number, number],
    size?: number
}) => {
    const boxColor = useThemeColor('--game-wood');
    return (
        <SoftBlock args={ [size, size, size] } color={ boxColor } position={ position } rotation={ rotation }/>
    );
};

export const Bench = ({ position, rotation = [0, 0, 0] }: {
    position: [number, number, number],
    rotation?: [number, number, number]
}) => {
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

/* -------------------------------------------------------------------------- */
/* CHARACTERS                                                                 */
/* -------------------------------------------------------------------------- */

export const Bartender = ({ position, rotation = [0, 0, 0] }: {
    position: [number, number, number],
    rotation?: [number, number, number]
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const skinColor = useThemeColor('--border-base');
    const shirtColor = '#e0e0e0';
    const apronColor = useThemeColor('--brand-primary');
    const pantsColor = '#333';

    useFrame((state) => {
        if (groupRef.current) {
            const time = state.clock.elapsedTime;
            groupRef.current.position.y = position[1] + Math.sin(time * 2) * 0.015;
            groupRef.current.rotation.y = rotation[1] + Math.sin(time * 0.7) * 0.15;
        }
    });

    return (
        <group position={ position } rotation={ rotation } ref={ groupRef }>
            <SoftBlock args={ [0.5, 0.5, 0.5] } color={ skinColor } position={ [0, 1.45, 0] }/>
            <SoftBlock args={ [0.6, 0.7, 0.4] } color={ shirtColor } position={ [0, 0.85, 0] }/>

            <SoftBlock args={ [0.62, 0.5, 0.05] } color={ apronColor } position={ [0, 0.7, 0.21] }/>
            <SoftBlock args={ [0.4, 0.3, 0.05] } color={ apronColor } position={ [0, 1.05, 0.21] }/>

            <group position={ [-0.38, 1.15, 0] }>
                <SoftBlock args={ [0.18, 0.5, 0.18] } color={ shirtColor } position={ [0, -0.2, 0] }/>
            </group>
            <group position={ [0.38, 1.15, 0] }>
                <SoftBlock args={ [0.18, 0.5, 0.18] } color={ shirtColor } position={ [0, -0.2, 0] }/>
            </group>

            <group position={ [-0.15, 0.5, 0] }>
                <SoftBlock args={ [0.2, 0.5, 0.2] } color={ pantsColor } position={ [0, -0.25, 0] }/>
            </group>
            <group position={ [0.15, 0.5, 0] }>
                <SoftBlock args={ [0.2, 0.5, 0.2] } color={ pantsColor } position={ [0, -0.25, 0] }/>
            </group>
        </group>
    );
};

export const AlleySmoker = ({ position, rotation = [0, 0, 0] }: {
    position: [number, number, number],
    rotation?: [number, number, number]
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const skinColor = useThemeColor('--border-base');
    const shirtColor = useThemeColor('--game-shirt-smoker');
    const pantsColor = useThemeColor('--game-pants');

    useFrame((state) => {
        if (groupRef.current) {
            const time = state.clock.elapsedTime;
            groupRef.current.position.y = position[1] + Math.sin(time * 1.5) * 0.005;
        }
    });

    return (
        <group position={ position } rotation={ rotation } ref={ groupRef }>
            <group position={ [0, -0.1, 0] }>
                {/* Body Parts */ }
                <SoftBlock args={ [0.5, 0.5, 0.5] } color={ skinColor } position={ [0, 1.3, 0] }/>
                <SoftBlock args={ [0.6, 0.7, 0.4] } color={ shirtColor } position={ [0, 0.7, 0] }/>

                {/* Left Arm */ }
                <group position={ [-0.38, 1, 0] } rotation={ [0, 0, 0] }>
                    <SoftBlock args={ [0.18, 0.5, 0.18] } color={ shirtColor } position={ [0, -0.2, 0] }/>
                </group>

                {/* Right Arm & Cigarette */ }
                <group position={ [0.38, 1., 0] } rotation={ [-1.2, -0.2, -0.2] }>
                    <SoftBlock args={ [0.18, 0.5, 0.18] } color={ shirtColor } position={ [0, -0.2, 0] }/>
                    <group position={ [0, -0.5, 0] } rotation={ [1.4, 0, 0] }>
                        <mesh position={ [0, 0.06, 0] }>
                            <boxGeometry args={ [0.03, 0.12, 0.03] }/>
                            <meshStandardMaterial color='#ddd'/>
                        </mesh>
                        <group position={ [0, 0.13, 0] }>
                            <mesh>
                                <boxGeometry args={ [0.035, 0.03, 0.035] }/>
                                <meshStandardMaterial
                                    color='#ff5500'
                                    emissive='#ff3300'
                                    emissiveIntensity={ 6 }
                                    toneMapped={ false }
                                />
                            </mesh>
                            <SmokeParticles/>
                        </group>
                    </group>
                </group>

                {/* Legs */ }
                <group position={ [-0.15, 0.45, 0] } rotation={ [-Math.PI / 2, 0, 0] }>
                    <SoftBlock args={ [0.2, 0.8, 0.2] } color={ pantsColor } position={ [0, -0.25, 0] }/>
                </group>
                <group position={ [0.15, 0.45, 0] } rotation={ [-Math.PI / 2, 0, 0] }>
                    <SoftBlock args={ [0.2, 0.8, 0.2] } color={ pantsColor } position={ [0, -0.25, 0] }/>
                </group>
            </group>
        </group>
    );
};

/* -------------------------------------------------------------------------- */
/* EFFECTS & PARTICLES                                                        */
/* -------------------------------------------------------------------------- */

const SmokeParticles = () => {
    const groupRef = useRef<THREE.Group>(null);
    const particles = useRef<(THREE.Mesh | null)[]>([]);
    const count = 5;

    useFrame((state) => {
        if (!groupRef.current) return;
        const time = state.clock.elapsedTime;

        // world-to-local transform for up-drift
        const worldQuaternion = new THREE.Quaternion();
        groupRef.current.getWorldQuaternion(worldQuaternion);
        const invWorldQuaternion = worldQuaternion.clone().invert();

        particles.current.forEach((p, i) => {
            if (!p) return;

            const duration = 2.0;
            const offset = i * (duration / count);
            const t = (time + offset) % duration;
            const pct = t / duration;

            const rise = pct * 0.5;
            const worldY = new THREE.Vector3(0, rise, 0);

            const wobbleX = Math.sin(time * 3 + i) * 0.02 * pct;
            const wobbleZ = Math.cos(time * 2 + i) * 0.02 * pct;
            const worldWobble = new THREE.Vector3(wobbleX, 0, wobbleZ);

            const targetWorldPos = worldY.add(worldWobble);
            const targetLocalPos = targetWorldPos.applyQuaternion(invWorldQuaternion);

            p.position.copy(targetLocalPos);

            const s = 0.01 + (pct * 0.05);
            p.scale.setScalar(s);

            if (p.material instanceof THREE.MeshStandardMaterial) {
                p.material.opacity = (pct < 0.2 ? pct * 5 : 1 - pct) * 0.4;
            }
        });
    });

    return (
        <group ref={ groupRef }>
            { Array.from({ length: count }).map((_, i) => (
                <mesh key={ i } ref={ (el) => (particles.current[i] = el) }>
                    <dodecahedronGeometry args={ [1, 0] }/>
                    <meshStandardMaterial
                        color='#ccc'
                        transparent
                        depthWrite={ false }
                        roughness={ 1 }
                    />
                </mesh>
            )) }
        </group>
    );
};
