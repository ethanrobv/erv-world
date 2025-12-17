// Player.tsx
import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import * as React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useThemeColor } from '../../hooks/useThemeColor';
import { type Barrier, type PortalDef, type Interactable, MOVEMENT_SPEED, ROTATION_SPEED } from './GameConfig';
import { SoftBlock } from './GameAssets';

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
};

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
                           onInteractChange
                       }: PlayerProps) => {
    const groupRef = useRef<THREE.Group>(null);
    const visualsRef = useRef<THREE.Group>(null);
    const leftLegRef = useRef<THREE.Group>(null);
    const rightLegRef = useRef<THREE.Group>(null);
    const leftArmRef = useRef<THREE.Group>(null);
    const rightArmRef = useRef<THREE.Group>(null);

    // Sync external ref
    useLayoutEffect(() => {
        if (playerRef && groupRef.current) {
            playerRef.current = groupRef.current;
        }
    }, [playerRef]);

    const [isInternalLocked, setIsInternalLocked] = useState(false);

    // VISUAL STATE: Controls animations (React render cycle)
    const [sittingTarget, setSittingTarget] = useState<Interactable | null>(null);

    // LOGIC STATE: Controls physics/interaction loop (Instant access)
    const isSittingRef = useRef<boolean>(false);
    const potentialInteractionRef = useRef<Interactable | null>(null);
    const currentInteractionTargetRef = useRef<Interactable | null>(null); // The object we are currently sitting on
    const lastSentLabelRef = useRef<string | null>(undefined); // Track last UI update to prevent flashing

    const keys = useRef<{ [key: string]: boolean }>({});
    const targetRotation = useRef(initialRot);

    const primaryColor = useThemeColor('--brand-primary');
    const shirtColor = useThemeColor('--bg-surface-highlight');
    const headColor = useThemeColor('--border-base');
    const pantsColor = useThemeColor('--text-muted');

    useEffect(() => {
        if (groupRef.current) groupRef.current.position.set(...initialPos);
        if (visualsRef.current) {
            visualsRef.current.rotation.y = initialRot;
            targetRotation.current = initialRot;
        }
        setIsInternalLocked(false);

        // Reset all states on scene change
        setSittingTarget(null);
        isSittingRef.current = false;
        currentInteractionTargetRef.current = null;
        potentialInteractionRef.current = null;
        lastSentLabelRef.current = null;

        if (onInteractChange) onInteractChange(null);
    }, [initialPos, initialRot]);

    // Reset rotation target when sitting down so we don't snap to previous walking angle
    useEffect(() => {
        if (sittingTarget) {
            targetRotation.current = sittingTarget.inRotation;
        }
    }, [sittingTarget]);

    // Handle Input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keys.current[e.key.toLowerCase()] = true;

            if (e.key.toLowerCase() === 'e' && groupRef.current) {
                if (isSittingRef.current && currentInteractionTargetRef.current) {
                    // STAND UP
                    const target = currentInteractionTargetRef.current;
                    const standPos = new THREE.Vector3(...target.offPosition);
                    groupRef.current.position.copy(standPos);

                    // Instant logic update
                    isSittingRef.current = false;
                    currentInteractionTargetRef.current = null;

                    // Visual update
                    setSittingTarget(null);

                } else if (potentialInteractionRef.current) {
                    // SIT DOWN
                    const target = potentialInteractionRef.current;

                    // Instant logic update
                    isSittingRef.current = true;
                    currentInteractionTargetRef.current = target;

                    // Visual update
                    setSittingTarget(target);
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
    }, [interactables]);

    const checkCollision = (x: number, z: number) => {
        for (const b of barriers) {
            if (x >= b.x[0] && x <= b.x[1] && z >= b.z[0] && z <= b.z[1]) return true;
        }
        return false;
    };

    useFrame((state, delta) => {
        if (!groupRef.current || !visualsRef.current) return;
        if (!isPlaying) return;

        // INTERACTION DETECTION LOGIC
        let calculatedLabel: string | null = null;

        if (isSittingRef.current) {
            calculatedLabel = 'Stand Up';
        } else {
            const playerPos = groupRef.current.position;
            const playerForward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), visualsRef.current.rotation.y);

            let found: Interactable | null = null;

            for (const item of interactables) {
                const targetPos = new THREE.Vector3(...item.position);
                const distance = playerPos.distanceTo(targetPos);

                const toTarget = targetPos.clone().sub(playerPos).normalize();
                const isFacing = playerForward.dot(toTarget) > 0.4;

                if (distance <= item.interactionRadius && isFacing) {
                    found = item;
                    break;
                }
            }

            potentialInteractionRef.current = found;
            if (found) calculatedLabel = found.label;
        }

        // UI UPDATE
        if (calculatedLabel !== lastSentLabelRef.current) {
            lastSentLabelRef.current = calculatedLabel;
            if (onInteractChange) onInteractChange(calculatedLabel);
        }

        // MOVEMENT & ANIMATION

        // 1. Calculate Input Vector (Used for both Walking and Sitting-Spin)
        let dx = 0;
        let dz = 0;

        if (!isInternalLocked && !inputLocked) {
            if (keys.current['w']) dz -= 1;
            if (keys.current['s']) dz += 1;
            if (keys.current['a']) dx -= 1;
            if (keys.current['d']) dx += 1;
        } else if (isInternalLocked) {
            // Auto-walk for portals
            dz -= 1;
        }

        const isMovingInput = dx !== 0 || dz !== 0;

        // 2. Update Target Rotation based on Input (Allow spin while sitting)
        if (isMovingInput) {
            targetRotation.current = Math.atan2(dx, dz);
        }

        if (sittingTarget) {
            // SITTING PHYSICS (Snap position to seat, ignore WASD position)
            const tPos = new THREE.Vector3(...sittingTarget.inPosition);
            groupRef.current.position.lerp(tPos, delta * 10);

            // SITTING ANIMATION
            visualsRef.current.rotation.z = THREE.MathUtils.lerp(visualsRef.current.rotation.z, 0, 0.1);
            visualsRef.current.position.y = THREE.MathUtils.lerp(visualsRef.current.position.y, 0, 0.1);

            if (leftLegRef.current && rightLegRef.current) {
                const sitAngle = -Math.PI / 2;
                leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, sitAngle, delta * 10);
                rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, sitAngle, delta * 10);
            }
            if (leftArmRef.current && rightArmRef.current) {
                leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0, delta * 10);
                rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0, delta * 10);
            }
        } else {
            // WALKING PHYSICS
            if (isMovingInput) {
                const length = Math.sqrt(dx * dx + dz * dz);
                const nx = length > 0 ? dx / length : 0;
                const nz = length > 0 ? dz / length : 0;

                const nextX = groupRef.current.position.x + nx * MOVEMENT_SPEED * delta;
                const nextZ = groupRef.current.position.z + nz * MOVEMENT_SPEED * delta;

                if (!checkCollision(nextX, groupRef.current.position.z)) groupRef.current.position.x = nextX;
                if (!checkCollision(groupRef.current.position.x, nextZ)) groupRef.current.position.z = nextZ;

                if (!isInternalLocked) {
                    for (const portal of portals) {
                        if (groupRef.current.position.distanceTo(new THREE.Vector3(...portal.position)) < 1.0) {
                            setIsInternalLocked(true);
                            onPortalEnter(portal);
                        }
                    }
                }
            }

            // WALKING ANIMATION
            if (isMovingInput) {
                const time = state.clock.elapsedTime * 15;
                visualsRef.current.rotation.z = Math.sin(time) * 0.05;
                visualsRef.current.position.y = (Math.sin(time * 2) + 1) * 0.05;

                if (leftLegRef.current && rightLegRef.current) {
                    leftLegRef.current.rotation.x = Math.sin(time) * 0.8;
                    rightLegRef.current.rotation.x = Math.sin(time + Math.PI) * 0.8;
                }
                if (leftArmRef.current && rightArmRef.current) {
                    rightArmRef.current.rotation.x = Math.sin(time) * 0.6;
                    leftArmRef.current.rotation.x = Math.sin(time + Math.PI) * 0.6;
                }
            } else {
                visualsRef.current.rotation.z = THREE.MathUtils.lerp(visualsRef.current.rotation.z, 0, 0.1);
                visualsRef.current.position.y = THREE.MathUtils.lerp(visualsRef.current.position.y, 0, 0.1);

                const lerpReset = (ref: React.RefObject<THREE.Group | null>) => {
                    if (ref.current) ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, 0, 0.1);
                };
                lerpReset(leftLegRef);
                lerpReset(rightLegRef);
                lerpReset(leftArmRef);
                lerpReset(rightArmRef);
            }
        }

        // COMMON ROTATION LERP (Applies to both Sitting and Walking)
        let angleDiff = targetRotation.current - visualsRef.current.rotation.y;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        visualsRef.current.rotation.y += angleDiff * ROTATION_SPEED * delta;
    });

    return (
        <group ref={ groupRef }>
            <group ref={ visualsRef }>
                <SoftBlock args={ [0.5, 0.5, 0.5] } color={ headColor } position={ [0, 1.45, 0] }/>
                <mesh position={ [0, 1.45, 0.26] } castShadow>
                    <planeGeometry args={ [0.4, 0.1] }/>
                    <meshStandardMaterial color={ primaryColor } emissive={ primaryColor } emissiveIntensity={ 0.5 }/>
                </mesh>
                <SoftBlock args={ [0.6, 0.7, 0.4] } color={ shirtColor } position={ [0, 0.85, 0] }/>
                <group position={ [-0.38, 1.15, 0] } ref={ leftArmRef }>
                    <SoftBlock args={ [0.18, 0.5, 0.18] } color={ shirtColor } position={ [0, -0.2, 0] }/>
                </group>
                <group position={ [0.38, 1.15, 0] } ref={ rightArmRef }>
                    <SoftBlock args={ [0.18, 0.5, 0.18] } color={ shirtColor } position={ [0, -0.2, 0] }/>
                </group>
                <group position={ [-0.15, 0.5, 0] } ref={ leftLegRef }>
                    <SoftBlock args={ [0.2, 0.5, 0.2] } color={ pantsColor } position={ [0, -0.25, 0] }/>
                </group>
                <group position={ [0.15, 0.5, 0] } ref={ rightLegRef }>
                    <SoftBlock args={ [0.2, 0.5, 0.2] } color={ pantsColor } position={ [0, -0.25, 0] }/>
                </group>
            </group>
        </group>
    );
};
