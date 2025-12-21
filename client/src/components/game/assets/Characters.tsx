import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { PlayingCardVisual } from './Cards';
import { SoftBlock as BaseBlock } from './CoreAssets';
import type { Card } from '../GameConfig';

type Position = [number, number, number];
type Rotation = [number, number, number];

export const DealerNPC = ({
                              position,
                              rotation = [0, 0, 0],
                              hand
                          }: {
    position: Position;
    rotation?: Rotation;
    hand: Card[];
}) => {
    const vestColor = '#111';
    const skinColor = useThemeColor('--player-head');
    const shirtColor = '#fff';

    const handGroupRef = useRef<THREE.Group>(null);
    const { camera } = useThree();

    useFrame(() => {
        if (handGroupRef.current) {
            handGroupRef.current.quaternion.copy(camera.quaternion);
        }
    });

    return (
        <group position={ position } rotation={ rotation }>
            <group>
                <BaseBlock args={ [0.5, 0.5, 0.5] } color={ skinColor } position={ [0, 1.45, 0] }/>
                <group position={ [0, 1.6, 0.26] }>
                    <mesh rotation={ [0.2, 0, 0] }>
                        <boxGeometry args={ [0.52, 0.05, 0.25] }/>
                        <meshStandardMaterial color='#00aa00' transparent opacity={ 0.6 }/>
                    </mesh>
                </group>
                <BaseBlock args={ [0.6, 0.7, 0.4] } color={ vestColor } position={ [0, 0.85, 0] }/>
                <BaseBlock args={ [0.2, 0.1, 0.05] } color='#d32f2f' position={ [0, 1.15, 0.21] }/>
                <group position={ [0.4, 1.15, 0] } rotation={ [0.5, 0, -0.2] }>
                    <BaseBlock args={ [0.18, 0.5, 0.18] } color={ shirtColor }/>
                </group>
                <group position={ [-0.4, 1.15, 0] } rotation={ [0.5, 0, 0.2] }>
                    <BaseBlock args={ [0.18, 0.5, 0.18] } color={ shirtColor }/>
                </group>
            </group>

            <group ref={ handGroupRef } position={ [0, 3.4, 0] }>
                { hand.map((c, i) => {
                    const offset = (i - (hand.length - 1) / 2) * 0.85;
                    return (
                        <PlayingCardVisual
                            key={ i }
                            card={ c }
                            position={ [offset, 0, 0] }
                            isVisible={ !c.isHidden }
                        />
                    );
                }) }
            </group>
        </group>
    );
};

export const Bartender = ({ position, rotation = [0, 0, 0] }: { position: Position; rotation?: Rotation }) => {
    const groupRef = useRef<THREE.Group>(null);
    const skinColor = useThemeColor('--player-head');
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
            <BaseBlock args={ [0.5, 0.5, 0.5] } color={ skinColor } position={ [0, 1.45, 0] }/>
            <BaseBlock args={ [0.6, 0.7, 0.4] } color={ shirtColor } position={ [0, 0.85, 0] }/>
            <BaseBlock args={ [0.62, 0.5, 0.05] } color={ apronColor } position={ [0, 0.7, 0.21] }/>
            <BaseBlock args={ [0.4, 0.3, 0.05] } color={ apronColor } position={ [0, 1.05, 0.21] }/>
            <group position={ [-0.38, 1.15, 0] }>
                <BaseBlock args={ [0.18, 0.5, 0.18] } color={ shirtColor } position={ [0, -0.2, 0] }/>
            </group>
            <group position={ [0.38, 1.15, 0] }>
                <BaseBlock args={ [0.18, 0.5, 0.18] } color={ shirtColor } position={ [0, -0.2, 0] }/>
            </group>
            <group position={ [-0.15, 0.5, 0] }>
                <BaseBlock args={ [0.2, 0.5, 0.2] } color={ pantsColor } position={ [0, -0.25, 0] }/>
            </group>
            <group position={ [0.15, 0.5, 0] }>
                <BaseBlock args={ [0.2, 0.5, 0.2] } color={ pantsColor } position={ [0, -0.25, 0] }/>
            </group>
        </group>
    );
};

export const AlleySmoker = ({ position, rotation = [0, 0, 0] }: { position: Position; rotation?: Rotation }) => {
    const groupRef = useRef<THREE.Group>(null);
    const skinColor = useThemeColor('--player-head');
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
                <BaseBlock args={ [0.5, 0.5, 0.5] } color={ skinColor } position={ [0, 1.3, 0] }/>
                <BaseBlock args={ [0.6, 0.7, 0.4] } color={ shirtColor } position={ [0, 0.7, 0] }/>
                <group position={ [-0.38, 1, 0] } rotation={ [0, 0, 0] }>
                    <BaseBlock args={ [0.18, 0.5, 0.18] } color={ shirtColor } position={ [0, -0.2, 0] }/>
                </group>
                <group position={ [0.38, 1, 0] } rotation={ [-1.2, -0.2, -0.2] }>
                    <BaseBlock args={ [0.18, 0.5, 0.18] } color={ shirtColor } position={ [0, -0.2, 0] }/>
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
                <group position={ [-0.18, 0.45, 0] } rotation={ [-Math.PI / 2, 0, 0] }>
                    <BaseBlock args={ [0.2, 0.8, 0.2] } color={ pantsColor } position={ [0, -0.25, 0] }/>
                </group>
                <group position={ [0.18, 0.45, 0] } rotation={ [-Math.PI / 2, 0, 0] }>
                    <BaseBlock args={ [0.2, 0.8, 0.2] } color={ pantsColor } position={ [0, -0.25, 0] }/>
                </group>
            </group>
        </group>
    );
};

const SmokeParticles = () => {
    const groupRef = useRef<THREE.Group>(null);
    const particles = useRef<(THREE.Mesh | null)[]>([]);
    const count = 5;

    useFrame((state) => {
        if (!groupRef.current) return;
        const time = state.clock.elapsedTime;
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
            const targetWorldPos = worldY.add(new THREE.Vector3(wobbleX, 0, wobbleZ));
            const targetLocalPos = targetWorldPos.applyQuaternion(invWorldQuaternion);
            p.position.copy(targetLocalPos);
            p.scale.setScalar(0.01 + pct * 0.05);
            if (p.material instanceof THREE.MeshStandardMaterial) {
                p.material.opacity = (pct < 0.2 ? pct * 5 : 1 - pct) * 0.4;
            }
        });
    });

    return (
        <group ref={ groupRef }>
            { Array.from({ length: count }).map((_, i) => (
                <mesh key={ i } ref={ el => {
                    particles.current[i] = el;
                } }>
                    <dodecahedronGeometry args={ [1, 0] }/>
                    <meshStandardMaterial color='#ccc' transparent depthWrite={ false } roughness={ 1 }/>
                </mesh>
            )) }
        </group>
    );
};
