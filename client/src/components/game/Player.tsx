import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import * as React from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useThemeColor } from '../../hooks/useThemeColor';
import { type Barrier, type PortalDef, type Interactable, MOVEMENT_SPEED, ROTATION_SPEED } from './GameConfig';
import { SoftBlock } from './GameAssets';

/* -------------------------------------------------------------------------- */
/* TYPES & INTERFACES                                                         */
/* -------------------------------------------------------------------------- */

type PlayerProps = {
    isPlaying: boolean;
    inputLocked?: boolean;
    playerRef?: React.RefObject<THREE.Group | null>;
    initialPos: [number, number, number];
    initialRot: number;
    barriers: Barrier[];
    portals: PortalDef[];
    interactables?: Interactable[];
    onPortalEnter: (target: PortalDef) => void;
    onInteractChange?: (label: string | null) => void;
    isRemote?: boolean;
    remoteData?: { pos: [number, number, number]; rot: number; isFading?: boolean };
    peerId?: string;
};

/* -------------------------------------------------------------------------- */
/* PLAYER COMPONENT                                                           */
/* -------------------------------------------------------------------------- */

export const Player = ({
                           isPlaying,
                           inputLocked = false,
                           playerRef,
                           initialPos,
                           initialRot,
                           barriers,
                           portals,
                           interactables = [],
                           onPortalEnter,
                           onInteractChange,
                           isRemote = false,
                           remoteData,
                           peerId
                       }: PlayerProps) => {
    // Scene Refs
    const groupRef = useRef<THREE.Group>(null);
    const visualsRef = useRef<THREE.Group>(null);

    // Limb Refs for Animation
    const leftLegRef = useRef<THREE.Group>(null);
    const rightLegRef = useRef<THREE.Group>(null);
    const leftArmRef = useRef<THREE.Group>(null);
    const rightArmRef = useRef<THREE.Group>(null);

    // Logic Refs
    const prevPos = useRef<THREE.Vector3>(new THREE.Vector3(...initialPos));
    const targetRotation = useRef(initialRot);
    const keys = useRef<{ [key: string]: boolean }>({});
    const potentialInteractionRef = useRef<Interactable | null>(null);
    const lastSentLabelRef = useRef<string | null>(undefined);

    // State
    const [isInternalLocked, setIsInternalLocked] = useState(false);
    const [activeInteraction, setActiveInteraction] = useState<Interactable | null>(null);
    const [opacity, setOpacity] = useState(1);

    // Theme
    const primaryColor = useThemeColor('--brand-primary');
    const shirtColor = useThemeColor('--bg-surface-highlight');
    const headColor = useThemeColor('--border-base');
    const pantsColor = useThemeColor('--text-muted');

    /* -------------------------------------------------------------------------- */
    /* INITIALIZATION & LIFECYCLE                                                 */
    /* -------------------------------------------------------------------------- */

    useLayoutEffect(() => {
        if (playerRef && groupRef.current) playerRef.current = groupRef.current;
    }, [playerRef]);

    useEffect(() => {
        if (groupRef.current) groupRef.current.position.set(...initialPos);
        if (visualsRef.current) {
            visualsRef.current.rotation.y = initialRot;
            targetRotation.current = initialRot;
        }
        setIsInternalLocked(false);
        setActiveInteraction(null);
        setOpacity(1);
        if (onInteractChange) onInteractChange(null);
    }, [initialPos, initialRot, onInteractChange]);

    /* -------------------------------------------------------------------------- */
    /* INPUT HANDLERS                                                             */
    /* -------------------------------------------------------------------------- */

    useEffect(() => {
        if (isRemote) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            keys.current[e.key.toLowerCase()] = true;

            // Interaction Toggle (E)
            if (e.key.toLowerCase() === 'e' && groupRef.current) {
                if (activeInteraction) {
                    if (activeInteraction.behavior.type === 'station') {
                        const exitPos = new THREE.Vector3(...activeInteraction.behavior.exitPosition);
                        groupRef.current.position.copy(exitPos);
                    }
                    setActiveInteraction(null);
                } else if (potentialInteractionRef.current) {
                    const target = potentialInteractionRef.current;
                    if (target.behavior.type === 'station') {
                        setActiveInteraction(target);
                    }
                }
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = false;

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isRemote, interactables, activeInteraction]);

    /* -------------------------------------------------------------------------- */
    /* ANIMATION HELPERS                                                          */
    /* -------------------------------------------------------------------------- */

    const checkCollision = (x: number, z: number) => {
        for (const b of barriers) {
            if (x >= b.x[0] && x <= b.x[1] && z >= b.z[0] && z <= b.z[1]) return true;
        }
        return false;
    };

    const animateWalk = (time: number, speedMultiplier = 1) => {
        if (!visualsRef.current) return;
        const t = time * 15 * speedMultiplier;
        visualsRef.current.rotation.z = Math.sin(t) * 0.05;
        visualsRef.current.position.y = (Math.sin(t * 2) + 1) * 0.05;
        if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(t) * 0.8;
        if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(t + Math.PI) * 0.8;
        if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(t + Math.PI) * 0.6;
        if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(t) * 0.6;
    };

    const animateStationPose = (pose: 'sit' | 'idle' | 'type', delta: number) => {
        if (!visualsRef.current) return;

        visualsRef.current.rotation.z = THREE.MathUtils.lerp(visualsRef.current.rotation.z, 0, 0.1);
        visualsRef.current.position.y = THREE.MathUtils.lerp(visualsRef.current.position.y, 0, 0.1);

        let legAngle = 0;
        if (pose === 'sit') legAngle = -Math.PI / 2;

        const lerpLimb = (ref: React.RefObject<THREE.Group | null>, target: number) => {
            if (ref.current) ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, target, delta * 10);
        };
        lerpLimb(leftLegRef, legAngle);
        lerpLimb(rightLegRef, legAngle);
        lerpLimb(leftArmRef, 0);
        lerpLimb(rightArmRef, 0);
    };

    const resetPose = () => {
        if (!visualsRef.current) return;
        visualsRef.current.rotation.z = THREE.MathUtils.lerp(visualsRef.current.rotation.z, 0, 0.1);
        visualsRef.current.position.y = THREE.MathUtils.lerp(visualsRef.current.position.y, 0, 0.1);
        const lerpRot = (ref: React.RefObject<THREE.Group | null>) => {
            if (ref.current) ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, 0, 0.1);
        };
        [leftLegRef, rightLegRef, leftArmRef, rightArmRef].forEach(lerpRot);
    };

    /* -------------------------------------------------------------------------- */
    /* GAME LOOP                                                                  */
    /* -------------------------------------------------------------------------- */

    useFrame((state, delta) => {
        if (!groupRef.current || !visualsRef.current || !isPlaying) return;

        // 1. Remote Player Sync
        if (isRemote && remoteData) {
            // Disconnect Fade Effect
            if (remoteData.isFading) {
                setOpacity(prev => Math.max(0, prev - delta * 1.5));
            }

            // Position Sync
            const currentPos = groupRef.current.position;
            const targetPos = new THREE.Vector3(...remoteData.pos);
            const dist = currentPos.distanceTo(targetPos);

            if (dist > 5) groupRef.current.position.copy(targetPos);
            else groupRef.current.position.lerp(targetPos, delta * 15);

            // Rotation Sync
            let angleDiff = remoteData.rot - visualsRef.current.rotation.y;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            visualsRef.current.rotation.y += angleDiff * ROTATION_SPEED * delta;

            // Animation Sync
            const distanceMoved = currentPos.distanceTo(prevPos.current);
            const isMoving = distanceMoved > 0.01;
            prevPos.current.copy(currentPos);

            if (isMoving) animateWalk(state.clock.elapsedTime);
            else resetPose();
            return;
        }

        // 2. Local Interaction Scanning
        let label: string | null = null;
        if (activeInteraction && activeInteraction.behavior.type === 'station') {
            label = activeInteraction.behavior.exitLabel || 'Leave';
        } else {
            const playerPos = groupRef.current.position;
            const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), visualsRef.current.rotation.y);
            let found: Interactable | null = null;
            for (const item of interactables) {
                const target = new THREE.Vector3(...item.position);
                const isFacing = forward.dot(target.clone().sub(playerPos).normalize()) > 0.4;
                if (playerPos.distanceTo(target) <= item.interactionRadius && isFacing) {
                    found = item;
                    break;
                }
            }
            potentialInteractionRef.current = found;
            if (found) label = found.label;
        }

        if (label !== lastSentLabelRef.current) {
            lastSentLabelRef.current = label;
            if (onInteractChange) onInteractChange(label);
        }

        // 3. Local Movement & Physics
        if (activeInteraction && activeInteraction.behavior.type === 'station') {
            const b = activeInteraction.behavior;
            groupRef.current.position.lerp(new THREE.Vector3(...b.anchorPosition), delta * 10);
            targetRotation.current = b.anchorRotation;
            animateStationPose(b.pose, delta);
        } else {
            let dx = 0, dz = 0;
            if (!isInternalLocked && !inputLocked) {
                if (keys.current['w']) dz -= 1;
                if (keys.current['s']) dz += 1;
                if (keys.current['a']) dx -= 1;
                if (keys.current['d']) dx += 1;
            } else if (isInternalLocked) dz -= 1;

            const isMovingInput = dx !== 0 || dz !== 0;
            if (isMovingInput) targetRotation.current = Math.atan2(dx, dz);

            if (isMovingInput) {
                const len = Math.sqrt(dx * dx + dz * dz);
                const nx = dx / len, nz = dz / len;
                const nextX = groupRef.current.position.x + nx * MOVEMENT_SPEED * delta;
                const nextZ = groupRef.current.position.z + nz * MOVEMENT_SPEED * delta;

                if (!checkCollision(nextX, groupRef.current.position.z)) groupRef.current.position.x = nextX;
                if (!checkCollision(groupRef.current.position.x, nextZ)) groupRef.current.position.z = nextZ;

                if (!isInternalLocked) {
                    for (const p of portals) {
                        if (groupRef.current.position.distanceTo(new THREE.Vector3(...p.position)) < 1.0) {
                            setIsInternalLocked(true);
                            onPortalEnter(p);
                        }
                    }
                }
                animateWalk(state.clock.elapsedTime);
            } else {
                resetPose();
            }
        }

        // 4. Smooth Rotation
        let aDiff = targetRotation.current - visualsRef.current.rotation.y;
        while (aDiff > Math.PI) aDiff -= Math.PI * 2;
        while (aDiff < -Math.PI) aDiff += Math.PI * 2;
        visualsRef.current.rotation.y += aDiff * ROTATION_SPEED * delta;
    });

    const isTrans = opacity < 1;

    return (
        <group ref={ groupRef }>
            { peerId && opacity > 0.1 && (
                <Text
                    position={ [0, 2.2, 0] }
                    fontSize={ 0.2 }
                    color={ primaryColor }
                    anchorX='center'
                    anchorY='middle'
                    fillOpacity={ opacity }
                    font='https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff'
                >
                    { peerId.substring(0, 6).toUpperCase() }
                </Text>
            ) }

            <group ref={ visualsRef }>
                <SoftBlock
                    args={ [0.5, 0.5, 0.5] }
                    color={ headColor }
                    position={ [0, 1.45, 0] }
                    opacity={ opacity }
                    transparent={ isTrans }
                />
                <mesh position={ [0, 1.45, 0.26] } castShadow>
                    <planeGeometry args={ [0.4, 0.1] }/>
                    <meshStandardMaterial
                        color={ primaryColor }
                        emissive={ primaryColor }
                        emissiveIntensity={ 0.5 }
                        opacity={ opacity }
                        transparent={ isTrans }
                    />
                </mesh>
                <SoftBlock
                    args={ [0.6, 0.7, 0.4] }
                    color={ shirtColor }
                    position={ [0, 0.85, 0] }
                    opacity={ opacity }
                    transparent={ isTrans }
                />

                {/* Limbs */ }
                <group position={ [-0.38, 1.15, 0] } ref={ leftArmRef }>
                    <SoftBlock args={ [0.18, 0.5, 0.18] } color={ shirtColor } position={ [0, -0.2, 0] }
                               opacity={ opacity } transparent={ isTrans }/>
                </group>
                <group position={ [0.38, 1.15, 0] } ref={ rightArmRef }>
                    <SoftBlock args={ [0.18, 0.5, 0.18] } color={ shirtColor } position={ [0, -0.2, 0] }
                               opacity={ opacity } transparent={ isTrans }/>
                </group>
                <group position={ [-0.15, 0.5, 0] } ref={ leftLegRef }>
                    <SoftBlock args={ [0.2, 0.5, 0.2] } color={ pantsColor } position={ [0, -0.25, 0] }
                               opacity={ opacity } transparent={ isTrans }/>
                </group>
                <group position={ [0.15, 0.5, 0] } ref={ rightLegRef }>
                    <SoftBlock args={ [0.2, 0.5, 0.2] } color={ pantsColor } position={ [0, -0.25, 0] }
                               opacity={ opacity } transparent={ isTrans }/>
                </group>
            </group>
        </group>
    );
};
