import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { SoftBlock } from './Primitives';
import { useFabricMaterial, useSkinMaterial, useLeatherMaterial } from './Materials';
import { HandVisuals } from './CardsAssets.tsx';
import type { Card } from '../GameConfig';

// Types

type Position = [number, number, number];
type Rotation = [number, number, number];

export interface BaseProps {
    position: Position;
    rotation?: Rotation;
}

interface DealerProps extends BaseProps {
    hand?: Card[];
}

interface PlayerAvatarProps {
    visualsRef: React.RefObject<THREE.Group>;
    leftLegRef: React.RefObject<THREE.Group>;
    rightLegRef: React.RefObject<THREE.Group>;
    leftArmRef: React.RefObject<THREE.Group>;
    rightArmRef: React.RefObject<THREE.Group>;
    opacity: number;
    displayName?: string;
    hand?: Card[];
    isLocalPlayer: boolean;
    waterZones?: { x: number[], z: number[] }[];
}

// Optimization Helpers
const _worldQuat = new THREE.Quaternion();
const _invWorldQuat = new THREE.Quaternion();
const _scratchVec = new THREE.Vector3();
const _scratchUp = new THREE.Vector3();
const _worldPos = new THREE.Vector3();

// Main Player Avatar

export const PlayerAvatar = ({
                                 visualsRef,
                                 leftLegRef,
                                 rightLegRef,
                                 leftArmRef,
                                 rightArmRef,
                                 opacity,
                                 displayName,
                                 hand,
                                 isLocalPlayer,
                                 waterZones
                             }: PlayerAvatarProps) => {
    const primaryColor = useThemeColor('--brand-primary') || '#2563eb';
    const shirtColor = useThemeColor('--player-torso') || '#f4f4f5';
    const headColor = useThemeColor('--player-head') || '#e0ac69';
    const pantsColor = useThemeColor('--player-legs') || '#1f2937';
    const textColor = useThemeColor('white');

    const isTrans = opacity < 1;
    const useTexture = opacity >= 0.99;

    const skinMat = useSkinMaterial(headColor);
    const shirtMat = useFabricMaterial(shirtColor);
    const pantsMat = useFabricMaterial(pantsColor);
    const bootMat = useLeatherMaterial(primaryColor);

    return (
        <>
            {/* Nameplate */ }
            { displayName && opacity > 0.1 && (
                <group position={ [0, 2.1, 0] }>
                    <Html center distanceFactor={ 10 } style={ { pointerEvents: 'none' } }>
                        <div style={ {
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            color: textColor,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontSize: '1.1em',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            border: `1px solid ${ primaryColor }`,
                            opacity: opacity,
                            textShadow: '1px 1px 1px #000'
                        } }>
                            { displayName.toUpperCase() }
                        </div>
                    </Html>
                </group>
            ) }

            {/* Hand Visuals */ }
            { hand && hand.length > 0 && (
                <HandVisuals hand={ hand } isLocal={ isLocalPlayer }/>
            ) }

            {/* Splashes: Only visible if feet are in water zone (approx Z > 0 in Alley) */ }
            <FootSplashes parentRef={ visualsRef } zones={ waterZones }/>

            {/* Blob Shadow: Positioned at y=0.01 to prevent z-fighting with floor */ }
            <mesh position={ [0, 0.01, 0] } rotation={ [-Math.PI / 2, 0, 0] }>
                <planeGeometry args={ [1.2, 1.2] }/>
                <meshBasicMaterial
                    transparent
                    opacity={ opacity }
                    depthWrite={ false }
                    color='black'
                >
                    <canvasTexture
                        attach='map'
                        image={ (function () {
                            const canvas = document.createElement('canvas');
                            canvas.width = 64;
                            canvas.height = 64;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
                                gradient.addColorStop(0, 'rgba(0,0,0,1)');
                                gradient.addColorStop(1, 'rgba(0,0,0,0)');
                                ctx.fillStyle = gradient;
                                ctx.fillRect(0, 0, 64, 64);
                            }
                            return canvas;
                        })() }
                    />
                </meshBasicMaterial>
            </mesh>

            <group ref={ visualsRef }>
                {/* Head */ }
                <group position={ [0, 1.45, 0] }>
                    <SoftBlock args={ [0.45, 0.45, 0.45] } color={ headColor } opacity={ opacity }
                               transparent={ isTrans } material={ useTexture ? skinMat : undefined }/>
                    <SoftBlock args={ [0.48, 0.18, 0.2] } color={ primaryColor } position={ [0, 0, 0.15] }
                               opacity={ opacity } transparent={ isTrans }/>
                    <mesh position={ [0, 0, 0.26] }>
                        <planeGeometry args={ [0.35, 0.08] }/>
                        <meshStandardMaterial color={ primaryColor } emissive={ primaryColor } emissiveIntensity={ 2 }
                                              opacity={ opacity } transparent={ isTrans } toneMapped={ false }/>
                    </mesh>
                </group>

                {/* Torso */ }
                <group position={ [0, 0.85, 0] }>
                    <SoftBlock args={ [0.4, 0.7, 0.3] } color={ headColor } opacity={ opacity } transparent={ isTrans }
                               material={ useTexture ? skinMat : undefined }/>
                    <SoftBlock args={ [0.6, 0.65, 0.4] } color={ shirtColor } position={ [0, 0, 0] } opacity={ opacity }
                               transparent={ isTrans } material={ useTexture ? shirtMat : undefined }/>
                    <SoftBlock args={ [0.35, 0.15, 0.35] } color={ shirtColor } position={ [0, 0.35, 0] }
                               opacity={ opacity } transparent={ isTrans }
                               material={ useTexture ? shirtMat : undefined }/>
                </group>

                {/* Left Arm */ }
                <group position={ [-0.38, 1.15, 0] } ref={ leftArmRef }>
                    <SoftBlock args={ [0.22, 0.2, 0.22] } color={ shirtColor } position={ [0, 0, 0] }
                               opacity={ opacity } transparent={ isTrans }
                               material={ useTexture ? shirtMat : undefined }/>
                    <SoftBlock args={ [0.16, 0.4, 0.16] } color={ shirtColor } position={ [0, -0.25, 0] }
                               opacity={ opacity } transparent={ isTrans }
                               material={ useTexture ? shirtMat : undefined }/>
                    <SoftBlock args={ [0.12, 0.12, 0.12] } color={ headColor } position={ [0, -0.5, 0] }
                               opacity={ opacity } transparent={ isTrans }
                               material={ useTexture ? skinMat : undefined }/>
                </group>

                {/* Right Arm */ }
                <group position={ [0.38, 1.15, 0] } ref={ rightArmRef }>
                    <SoftBlock args={ [0.22, 0.2, 0.22] } color={ shirtColor } position={ [0, 0, 0] }
                               opacity={ opacity } transparent={ isTrans }
                               material={ useTexture ? shirtMat : undefined }/>
                    <SoftBlock args={ [0.16, 0.4, 0.16] } color={ shirtColor } position={ [0, -0.25, 0] }
                               opacity={ opacity } transparent={ isTrans }
                               material={ useTexture ? shirtMat : undefined }/>
                    <SoftBlock args={ [0.12, 0.12, 0.12] } color={ headColor } position={ [0, -0.5, 0] }
                               opacity={ opacity } transparent={ isTrans }
                               material={ useTexture ? skinMat : undefined }/>
                </group>

                {/* Left Leg */ }
                <group position={ [-0.15, 0.5, 0] } ref={ leftLegRef }>
                    <SoftBlock args={ [0.2, 0.3, 0.2] } color={ pantsColor } position={ [0, -0.1, 0] }
                               opacity={ opacity } transparent={ isTrans }
                               material={ useTexture ? pantsMat : undefined }/>
                    <SoftBlock args={ [0.18, 0.25, 0.18] } color={ pantsColor } position={ [0, -0.3, 0] }
                               opacity={ opacity } transparent={ isTrans }
                               material={ useTexture ? pantsMat : undefined }/>
                    <SoftBlock args={ [0.22, 0.1, 0.3] } color={ primaryColor } position={ [0, -0.45, 0.05] }
                               opacity={ opacity } transparent={ isTrans }
                               material={ useTexture ? bootMat : undefined }/>
                </group>

                {/* Right Leg */ }
                <group position={ [0.15, 0.5, 0] } ref={ rightLegRef }>
                    <SoftBlock args={ [0.2, 0.3, 0.2] } color={ pantsColor } position={ [0, -0.1, 0] }
                               opacity={ opacity } transparent={ isTrans }
                               material={ useTexture ? pantsMat : undefined }/>
                    <SoftBlock args={ [0.18, 0.25, 0.18] } color={ pantsColor } position={ [0, -0.3, 0] }
                               opacity={ opacity } transparent={ isTrans }
                               material={ useTexture ? pantsMat : undefined }/>
                    <SoftBlock args={ [0.22, 0.1, 0.3] } color={ primaryColor } position={ [0, -0.45, 0.05] }
                               opacity={ opacity } transparent={ isTrans }
                               material={ useTexture ? bootMat : undefined }/>
                </group>
            </group>
        </>
    );
};

// NPCs

export const DealerNPC = ({ position, rotation = [0, 0, 0], hand }: DealerProps) => {
    const vestColor = useThemeColor('--npc-vest') || '#1f2937';
    const skinColor = useThemeColor('--player-head') || '#e0ac69';
    const shirtColor = useThemeColor('--bg-surface') || '#ffffff';

    return (
        <group position={ position } rotation={ rotation }>
            <group>
                <group position={ [0, 1.45, 0] }>
                    <SoftBlock args={ [0.45, 0.45, 0.45] } color={ skinColor }/>
                    <group position={ [0, 0.1, 0.15] }>
                        <mesh rotation={ [0.2, 0, 0] }>
                            <boxGeometry args={ [0.52, 0.05, 0.25] }/>
                            <meshStandardMaterial color='#00ff44' transparent opacity={ 0.4 } emissive='#00ff44'
                                                  emissiveIntensity={ 0.5 }/>
                        </mesh>
                    </group>
                </group>
                <group position={ [0, 0.85, 0] }>
                    <SoftBlock args={ [0.4, 0.7, 0.3] } color={ shirtColor }/>
                    <SoftBlock args={ [0.6, 0.65, 0.4] } color={ vestColor }/>
                    <SoftBlock args={ [0.35, 0.15, 0.35] } color={ vestColor } position={ [0, 0.35, 0] }/>
                    <SoftBlock args={ [0.12, 0.3, 0.02] } color='#b91c1c' position={ [0, 0.15, 0.21] }/>
                </group>
                <group position={ [0.4, 1.15, 0] } rotation={ [0.5, 0, -0.2] }>
                    <SoftBlock args={ [0.2, 0.2, 0.2] } color={ vestColor } position={ [0, 0, 0] }/>
                    <SoftBlock args={ [0.16, 0.4, 0.16] } color={ shirtColor } position={ [0, -0.25, 0] }/>
                    <SoftBlock args={ [0.12, 0.12, 0.12] } color={ skinColor } position={ [0, -0.5, 0] }/>
                </group>
                <group position={ [-0.4, 1.15, 0] } rotation={ [0.5, 0, 0.2] }>
                    <SoftBlock args={ [0.2, 0.2, 0.2] } color={ vestColor } position={ [0, 0, 0] }/>
                    <SoftBlock args={ [0.16, 0.4, 0.16] } color={ shirtColor } position={ [0, -0.25, 0] }/>
                    <SoftBlock args={ [0.12, 0.12, 0.12] } color={ skinColor } position={ [0, -0.5, 0] }/>
                </group>
            </group>
            <HandVisuals hand={ hand } isLocal={ false }/>
        </group>
    );
};

export const Bartender = ({ position, rotation = [0, 0, 0] }: BaseProps) => {
    const groupRef = useRef<THREE.Group>(null);
    const skinColor = useThemeColor('--player-head') || '#e0ac69';
    const shirtColor = useThemeColor('--player-torso') || '#f4f4f5';
    const apronColor = useThemeColor('--npc-apron') || '#2563eb';
    const pantsColor = useThemeColor('--player-legs') || '#1f2937';

    useFrame((state) => {
        if (groupRef.current) {
            const time = state.clock.elapsedTime;
            groupRef.current.position.y = position[1] + Math.sin(time * 2) * 0.015;
            groupRef.current.rotation.y = rotation[1] + Math.sin(time * 0.7) * 0.15;
        }
    });

    return (
        <group position={ position } rotation={ rotation } ref={ groupRef }>
            <group position={ [0, 1.45, 0] }>
                <SoftBlock args={ [0.45, 0.45, 0.45] } color={ skinColor }/>
                <SoftBlock args={ [0.48, 0.1, 0.2] } color={ pantsColor } position={ [0, 0.12, -0.2] }/>
            </group>
            <group position={ [0, 0.85, 0] }>
                <SoftBlock args={ [0.6, 0.65, 0.4] } color={ shirtColor }/>
                <SoftBlock args={ [0.35, 0.15, 0.35] } color={ shirtColor } position={ [0, 0.35, 0] }/>
                <SoftBlock args={ [0.62, 0.5, 0.1] } color={ apronColor } position={ [0, -0.15, 0.18] }/>
                <SoftBlock args={ [0.3, 0.25, 0.05] } color={ apronColor } position={ [0, 0.2, 0.18] }/>
            </group>
            <group position={ [-0.38, 1.15, 0] }>
                <SoftBlock args={ [0.2, 0.2, 0.2] } color={ shirtColor } position={ [0, 0, 0] }/>
                <SoftBlock args={ [0.16, 0.4, 0.16] } color={ shirtColor } position={ [0, -0.25, 0] }/>
                <SoftBlock args={ [0.12, 0.12, 0.12] } color={ skinColor } position={ [0, -0.5, 0] }/>
            </group>
            <group position={ [0.38, 1.15, 0] }>
                <SoftBlock args={ [0.2, 0.2, 0.2] } color={ shirtColor } position={ [0, 0, 0] }/>
                <SoftBlock args={ [0.16, 0.4, 0.16] } color={ shirtColor } position={ [0, -0.25, 0] }/>
                <SoftBlock args={ [0.12, 0.12, 0.12] } color={ skinColor } position={ [0, -0.5, 0] }/>
            </group>
            <group position={ [-0.15, 0.5, 0] }>
                <SoftBlock args={ [0.2, 0.3, 0.2] } color={ pantsColor } position={ [0, -0.1, 0] }/>
                <SoftBlock args={ [0.18, 0.25, 0.18] } color={ pantsColor } position={ [0, -0.3, 0] }/>
                <SoftBlock args={ [0.22, 0.1, 0.3] } color='#000000' position={ [0, -0.45, 0.05] }/>
            </group>
            <group position={ [0.15, 0.5, 0] }>
                <SoftBlock args={ [0.2, 0.3, 0.2] } color={ pantsColor } position={ [0, -0.1, 0] }/>
                <SoftBlock args={ [0.18, 0.25, 0.18] } color={ pantsColor } position={ [0, -0.3, 0] }/>
                <SoftBlock args={ [0.22, 0.1, 0.3] } color='#000000' position={ [0, -0.45, 0.05] }/>
            </group>
        </group>
    );
};

export const AlleySmoker = ({ position, rotation = [0, 0, 0] }: BaseProps) => {
    const groupRef = useRef<THREE.Group>(null);
    const skinColor = useThemeColor('--player-head') || '#e0ac69';
    const shirtColor = useThemeColor('--npc-shirt-smoker') || '#4b5563';
    const pantsColor = useThemeColor('--player-legs') || '#1f2937';
    const accentColor = useThemeColor('--game-danger') || '#ef4444';

    useFrame((state) => {
        if (groupRef.current) {
            const time = state.clock.elapsedTime;
            groupRef.current.position.y = position[1] + Math.sin(time * 1.5) * 0.005;
        }
    });

    return (
        <group position={ position } rotation={ rotation } ref={ groupRef }>
            <group position={ [0, -0.1, 0] }>
                <group position={ [0, 1.4, 0] }>
                    <SoftBlock args={ [0.45, 0.45, 0.45] } color={ skinColor }/>
                    <SoftBlock args={ [0.45, 0.15, 0.2] } color={ pantsColor } position={ [0, -0.1, 0.15] }/>
                </group>
                <group position={ [0, 0.85, 0] }>
                    <SoftBlock args={ [0.6, 0.65, 0.4] } color={ shirtColor }/>
                    <SoftBlock args={ [0.35, 0.15, 0.35] } color={ shirtColor } position={ [0, 0.35, 0] }/>
                </group>
                <group position={ [-0.38, 1.1, 0.1] } rotation={ [-0.4, 0.2, 0] }>
                    <SoftBlock args={ [0.18, 0.4, 0.18] } color={ shirtColor } position={ [0, -0.2, 0] }/>
                    <SoftBlock args={ [0.12, 0.12, 0.12] } color={ skinColor } position={ [0, -0.45, 0] }/>
                </group>
                <group position={ [0.38, 1.3, 0.25] } rotation={ [0, 5, 1] }>
                    <SoftBlock args={ [0.18, 0.4, 0.18] } color={ shirtColor } position={ [0, -0.2, 0] }/>
                    <SoftBlock args={ [0.12, 0.12, 0.12] } color={ skinColor } position={ [0, -0.45, 0] }/>
                    <group position={ [0, -0.55, 0] } rotation={ [0, 0, 0] }>
                        <mesh position={ [0, 0.06, 0] }>
                            <boxGeometry args={ [0.03, 0.12, 0.03] }/>
                            <meshStandardMaterial color='#dddddd'/>
                        </mesh>
                        {/* Cigarette */ }
                        <group position={ [0.2, 0.05, 0] }>
                            <mesh>
                                <boxGeometry args={ [0.2, 0.02, 0.02] }/>
                                <meshStandardMaterial color='#ff5500' emissive='#ff3300' emissiveIntensity={ 6 }
                                                      toneMapped={ false }/>
                            </mesh>
                            <SmokeParticles/>
                        </group>
                    </group>
                </group>
                <group position={ [-0.2, 0.5, 0] } rotation={ [-Math.PI / 2, 0, 0.1] }>
                    <SoftBlock args={ [0.22, 0.4, 0.22] } color={ pantsColor } position={ [0, -0.2, 0] }/>
                    <SoftBlock args={ [0.18, 0.35, 0.18] } color={ pantsColor } position={ [0, -0.5, 0] }
                               rotation={ [0.4, 0, 0] }/>
                    <SoftBlock args={ [0.22, 0.1, 0.32] } color={ accentColor } position={ [0, -0.7, 0.1] }
                               rotation={ [0.4, 0, 0] }/>
                </group>
                <group position={ [0.25, 0.5, 0] } rotation={ [-Math.PI / 2, 0, -0.1] }>
                    <SoftBlock args={ [0.22, 0.4, 0.22] } color={ pantsColor } position={ [0, -0.2, 0] }/>
                    <SoftBlock args={ [0.18, 0.35, 0.18] } color={ pantsColor } position={ [0, -0.5, 0] }
                               rotation={ [0.4, 0, 0] }/>
                    <SoftBlock args={ [0.22, 0.1, 0.32] } color={ accentColor } position={ [0, -0.7, 0.1] }
                               rotation={ [0.4, 0, 0] }/>
                </group>
            </group>
        </group>
    );
};

const SmokeParticles = () => {
    const groupRef = useRef<THREE.Group>(null);
    const particles = useRef<(THREE.Mesh | null)[]>([]);
    const count = 6;

    useFrame((state) => {
        if (!groupRef.current) return;
        const time = state.clock.elapsedTime;

        groupRef.current.getWorldQuaternion(_worldQuat);
        _invWorldQuat.copy(_worldQuat).invert();

        particles.current.forEach((p, i) => {
            if (!p) return;

            const duration = 5.0;
            const offset = i * (duration / count);
            const t = (time + offset) % duration;
            const pct = t / duration;

            _scratchUp.set(0.05, pct * 0.7, 0);
            const wobbleX = Math.sin(time * 3 + i) * 0.04 * pct;
            const wobbleZ = Math.cos(time * 2 + i) * 0.02 * pct;

            _scratchVec.set(wobbleX, 0, wobbleZ).add(_scratchUp);
            const targetLocalPos = _scratchVec.applyQuaternion(_invWorldQuat);

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
                <mesh key={ i } ref={ (el) => {
                    particles.current[i] = el;
                } }>
                    <dodecahedronGeometry args={ [1, 0] }/>
                    <meshStandardMaterial color='#cccccc' transparent depthWrite={ false } roughness={ 1 }/>
                </mesh>
            )) }
        </group>
    );
};

const FootSplashes = ({ parentRef, zones }: {
    parentRef: React.RefObject<THREE.Group>;
    zones?: { x: number[], z: number[] }[]
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const particles = useRef<(THREE.Mesh | null)[]>([]);
    const count = 3;
    const lastPosRef = useRef(new THREE.Vector3());

    useFrame((state) => {
        if (!groupRef.current || !parentRef.current) return;

        parentRef.current.getWorldPosition(_worldPos);
        const { x, y, z } = _worldPos;

        // 1. Dynamic Check: Is player inside ANY provided water zone?
        let inWater = false;
        if (zones && y < 0.5) { // Only splash if on ground level
            for (const zone of zones) {
                if (x >= zone.x[0] && x <= zone.x[1] && z >= zone.z[0] && z <= zone.z[1]) {
                    inWater = true;
                    break;
                }
            }
        }

        // 2. Velocity Check
        const velocity = _worldPos.distanceTo(lastPosRef.current);
        const isMoving = velocity > 0.001;
        lastPosRef.current.copy(_worldPos);

        if (!inWater || !isMoving) {
            groupRef.current.visible = false;
            return;
        }

        groupRef.current.visible = true;
        groupRef.current.position.set(0, 0.05, 0);

        const time = state.clock.elapsedTime;

        particles.current.forEach((p, i) => {
            if (!p) return;
            const duration = 0.6;
            const offset = i * (duration / count);
            const t = (time + offset) % duration;
            const pct = t / duration;

            p.scale.setScalar(pct * 1.5);

            if (p.material instanceof THREE.MeshBasicMaterial) {
                p.material.opacity = (1.0 - pct) * 0.6;
            }

            const angle = (i / count) * Math.PI * 2 + time * 5;
            p.position.set(Math.cos(angle) * 0.3, 0.02, Math.sin(angle) * 0.3);
        });
    });

    return (
        <group ref={ groupRef }>
            { Array.from({ length: count }).map((_, i) => (
                <mesh key={ i } ref={ (el) => {
                    particles.current[i] = el;
                } } rotation={ [-Math.PI / 2, 0, 0] }>
                    <ringGeometry args={ [0.2, 0.3, 16] }/>
                    <meshBasicMaterial color='#ffffff' transparent opacity={ 0.5 } depthWrite={ false }/>
                </mesh>
            )) }
        </group>
    );
};
