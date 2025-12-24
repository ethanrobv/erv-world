import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { QuadraticBezierLine } from '@react-three/drei';
import * as THREE from 'three';
import { useThemeColor } from '../../../hooks/useThemeColor';

interface FishingRodProps {
    active: boolean;
    phase: string;
    bobberPosition?: [number, number, number] | null;
}

interface LineRendererProps {
    rodTipRef: React.RefObject<THREE.Object3D | null>;
    bobberPos: [number, number, number];
    phase: string;
    localImpulse: React.RefObject<number>;
}

export const FishingRod = ({ active, phase, bobberPosition }: FishingRodProps) => {
    const groupRef = useRef<THREE.Group>(null);
    const rodColor = useThemeColor('--game-fishing-rod') || '#78350f';

    // Line Refs
    const rodTipRef = useRef<THREE.Object3D>(null);

    // Local Wiggle State
    const localImpulse = useRef(0);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (phase !== 'waiting') return;
            if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
                localImpulse.current += 0.2;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [phase]);

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        const t = state.clock.elapsedTime;

        // Decay impulse
        localImpulse.current = THREE.MathUtils.lerp(localImpulse.current, 0, delta * 8);

        // Rod Animation
        const targetRotX = active ? -0.2 : 0.5;
        const wiggle = phase === 'waiting' ? Math.sin(t * 2) * 0.01 : 0;
        const biteShake = phase === 'bitten' ? Math.sin(t * 40) * 0.15 : 0;

        // Add local impulse to rod rotation for "feedback"
        const impulseShake = Math.sin(t * 30) * localImpulse.current * 0.1;

        groupRef.current.rotation.x = THREE.MathUtils.lerp(
            groupRef.current.rotation.x,
            targetRotX + wiggle + biteShake + impulseShake,
            0.1
        );
    });

    if (!active) return null;

    return (
        <>
            <group ref={ groupRef } position={ [0.3, 0.8, 0.4] }>
                {/* Handle */ }
                <mesh position={ [0, -0.2, 0] } rotation={ [0.2, 0, 0] }>
                    <cylinderGeometry args={ [0.03, 0.04, 0.5] }/>
                    <meshStandardMaterial color='#111'/>
                </mesh>
                {/* Rod Body */ }
                <mesh position={ [0, 0.8, 0.2] } rotation={ [0.2, 0, 0] }>
                    <cylinderGeometry args={ [0.02, 0.03, 2.0] }/>
                    <meshStandardMaterial color={ rodColor }/>
                </mesh>
                {/* Rod Guides/Rings */ }
                <mesh position={ [0, 1.7, 0.38] } rotation={ [1.7, 0, 0] }>
                    <torusGeometry args={ [0.04, 0.005, 8, 16] }/>
                    <meshStandardMaterial color='#888'/>
                </mesh>
                <mesh position={ [0, 1.2, 0.28] } rotation={ [1.7, 0, 0] }>
                    <torusGeometry args={ [0.05, 0.005, 8, 16] }/>
                    <meshStandardMaterial color='#888'/>
                </mesh>

                {/* Tip Marker */ }
                <group position={ [0, 1.8, 0.4] } ref={ rodTipRef }/>

                {/* Reel */ }
                <mesh position={ [0, 0, 0.05] } rotation={ [0, 0, Math.PI / 2] }>
                    <cylinderGeometry args={ [0.05, 0.05, 0.05] }/>
                    <meshStandardMaterial color='#555'/>
                </mesh>
            </group>

            {/* Line Renderer */ }
            { bobberPosition && phase !== 'idle' && (
                <LineRenderer
                    rodTipRef={ rodTipRef }
                    bobberPos={ bobberPosition }
                    phase={ phase }
                    localImpulse={ localImpulse }
                />
            ) }
        </>
    );
};

// Helper to render line in World Space to avoid coordinate hell
const LineRenderer = ({ rodTipRef, bobberPos, phase, localImpulse }: LineRendererProps) => {
    const lineRef = useRef<any>(null); // QuadraticBezierLine uses a custom ref type, allow any for now or specific drie type
    const start = useRef(new THREE.Vector3());
    const end = useRef(new THREE.Vector3());
    const mid = useRef(new THREE.Vector3());

    useFrame((state) => {
        if (!rodTipRef.current || !lineRef.current) return;

        // 1. Get Rod Tip World Position
        rodTipRef.current.getWorldPosition(start.current);

        // 2. Set End to Bobber Position
        // bobberPos is already in LOCAL space (relative to Player).
        end.current.set(bobberPos[0], bobberPos[1], bobberPos[2]);

        // Apply physics offsets (Visual Wiggle)
        const t = state.clock.elapsedTime;
        let yOffset = Math.sin(t * 3) * 0.02;
        let xOffset = 0;

        if (phase === 'waiting' && localImpulse.current > 0.01) {
            xOffset = Math.sin(t * 25) * (0.1 * localImpulse.current);
            yOffset -= (0.05 * localImpulse.current);
        }
        if (phase === 'bitten') {
            yOffset = -0.2 + Math.sin(t * 25) * 0.08;
        }

        end.current.y += yOffset;
        end.current.x += xOffset;

        // 3. Convert World coords to Local coords
        if (lineRef.current.parent) {
            // Convert Rod Tip (World) -> Local
            lineRef.current.parent.worldToLocal(start.current);
        }

        // 4. Calculate Midpoint with Droop
        mid.current.lerpVectors(start.current, end.current, 0.5);

        // Droop logic: If waiting/idle, line droops. If reeling/bitten, line gets taut.
        const tautness = (phase === 'bitten' || phase === 'reeling') ? 0 : 0.5; // 0 = straight
        mid.current.y -= tautness * 0.2; // Slight gravity droop

        lineRef.current.setPoints(start.current, end.current, mid.current);
    });

    return (
        <group position={ [0, 0, 0] } rotation={ [0, 0, 0] } scale={ [1, 1, 1] } matrixAutoUpdate={ false }>
            <WorldSpaceLine ref={ lineRef } color='white' lineWidth={ 1 }/>
        </group>
    );
};

// Simplified Wrapper
const WorldSpaceLine = React.forwardRef((props: any, ref) => {
    return <QuadraticBezierLine ref={ ref } { ...props } />;
});

export const Bobber = ({ position, phase, biteStrength = 0 }: {
    position: [number, number, number];
    phase: string;
    biteStrength?: number;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const topColor = useThemeColor('--game-fishing-bobber-top') || '#dc2626';
    const bottomColor = useThemeColor('--game-fishing-bobber-bottom') || '#ffffff';

    const syncedIntensity = useRef(0);
    const localImpulse = useRef(0);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (phase !== 'waiting') return;
            if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
                localImpulse.current = 0.5;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [phase]);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        const t = state.clock.elapsedTime;

        syncedIntensity.current = THREE.MathUtils.lerp(syncedIntensity.current, biteStrength, delta * 5);
        localImpulse.current = THREE.MathUtils.lerp(localImpulse.current, 0, delta * 10);

        const totalWiggle = Math.max(syncedIntensity.current, localImpulse.current);

        let yOffset = Math.sin(t * 3) * 0.02;
        let xOffset = 0;

        if (phase === 'waiting' && totalWiggle > 0.01) {
            xOffset = Math.sin(t * 25) * (0.1 * totalWiggle);
            yOffset -= (0.05 * totalWiggle);
        }

        if (phase === 'bitten') {
            yOffset = -0.2 + Math.sin(t * 25) * 0.08;
        }

        meshRef.current.position.set(
            position[0] + xOffset,
            position[1] + yOffset,
            position[2]
        );
    });

    return (
        <group>
            <mesh ref={ meshRef } position={ position }>
                <sphereGeometry args={ [0.08] }/>
                <meshStandardMaterial color={ topColor }/>
                <mesh position={ [0, -0.08, 0] }>
                    <sphereGeometry args={ [0.08] }/>
                    <meshStandardMaterial color={ bottomColor }/>
                </mesh>
            </mesh>
        </group>
    );
};
