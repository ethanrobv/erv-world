import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { QuadraticBezierLine } from '@react-three/drei';
import * as THREE from 'three';
import { Line2 } from 'three-stdlib';
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

type BezierLine2 = Line2 & {
    setPoints: (
        start: THREE.Vector3 | [number, number, number],
        end: THREE.Vector3 | [number, number, number],
        mid: THREE.Vector3 | [number, number, number]
    ) => void;
};

export const FishingRod = ({ active, phase, bobberPosition }: FishingRodProps) => {
    const groupRef = useRef<THREE.Group>(null);
    const rodColor = useThemeColor('--game-fishing-rod') || '#78350f';

    const rodTipRef = useRef<THREE.Object3D>(null);
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
        localImpulse.current = THREE.MathUtils.lerp(localImpulse.current, 0, delta * 8);

        const targetRotX = active ? -0.2 : 0.5;
        const wiggle = phase === 'waiting' ? Math.sin(t * 2) * 0.01 : 0;
        const biteShake = phase === 'bitten' ? Math.sin(t * 40) * 0.15 : 0;
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
                <mesh position={ [0, -0.2, 0] } rotation={ [0.2, 0, 0] }>
                    <cylinderGeometry args={ [0.03, 0.04, 0.5] }/>
                    <meshStandardMaterial color='#111'/>
                </mesh>
                <mesh position={ [0, 0.8, 0.2] } rotation={ [0.2, 0, 0] }>
                    <cylinderGeometry args={ [0.02, 0.03, 2.0] }/>
                    <meshStandardMaterial color={ rodColor }/>
                </mesh>
                <mesh position={ [0, 1.7, 0.38] } rotation={ [1.7, 0, 0] }>
                    <torusGeometry args={ [0.04, 0.005, 8, 16] }/>
                    <meshStandardMaterial color='#888'/>
                </mesh>
                <mesh position={ [0, 1.2, 0.28] } rotation={ [1.7, 0, 0] }>
                    <torusGeometry args={ [0.05, 0.005, 8, 16] }/>
                    <meshStandardMaterial color='#888'/>
                </mesh>
                <group position={ [0, 1.8, 0.4] } ref={ rodTipRef }/>
                <mesh position={ [0, 0, 0.05] } rotation={ [0, 0, Math.PI / 2] }>
                    <cylinderGeometry args={ [0.05, 0.05, 0.05] }/>
                    <meshStandardMaterial color='#555'/>
                </mesh>
            </group>

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

const LineRenderer = ({ rodTipRef, bobberPos, phase, localImpulse }: LineRendererProps) => {
    const lineRef = useRef<BezierLine2>(null);

    const start = useRef(new THREE.Vector3());
    const end = useRef(new THREE.Vector3());
    const mid = useRef(new THREE.Vector3());

    useFrame((state) => {
        if (!rodTipRef.current || !lineRef.current) return;

        rodTipRef.current.getWorldPosition(start.current);
        end.current.set(bobberPos[0], bobberPos[1], bobberPos[2]);

        const t = state.clock.elapsedTime;
        let yOffset = Math.sin(t * 3) * 0.02;
        let xOffset = 0;

        const impulse = localImpulse.current || 0;

        if (phase === 'waiting' && impulse > 0.01) {
            xOffset = Math.sin(t * 25) * (0.1 * impulse);
            yOffset -= (0.05 * impulse);
        }
        if (phase === 'bitten') {
            yOffset = -0.2 + Math.sin(t * 25) * 0.08;
        }

        end.current.y += yOffset;
        end.current.x += xOffset;

        if (lineRef.current.parent) {
            lineRef.current.parent.worldToLocal(start.current);
        }

        mid.current.lerpVectors(start.current, end.current, 0.5);
        const tautness = (phase === 'bitten' || phase === 'reeling') ? 0 : 0.5;
        mid.current.y -= tautness * 0.2;

        lineRef.current.setPoints(start.current, end.current, mid.current);
    });

    return (
        <group position={ [0, 0, 0] } rotation={ [0, 0, 0] } scale={ [1, 1, 1] } matrixAutoUpdate={ false }>
            <WorldSpaceLine ref={ lineRef } color='white' lineWidth={ 1 }/>
        </group>
    );
};

type QLineProps = React.ComponentProps<typeof QuadraticBezierLine>;

interface WorldLineProps extends Omit<QLineProps, 'start' | 'end' | 'ref'> {
    start?: QLineProps['start'];
    end?: QLineProps['end'];
}

const WorldSpaceLine = React.forwardRef<BezierLine2, WorldLineProps>((props, ref) => {
    const { start = [0, 0, 0], end = [0, 0, 0], ...rest } = props;

    return (
        <QuadraticBezierLine
            ref={ ref }
            start={ start }
            end={ end }
            { ...rest }
        />
    );
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
