import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
    type Barrier,
    type PortalDef,
    type Interactable,
    type InteractionBehavior,
    type PlayerPose,
    type Card,
    type RemotePlayerState,
    MOVEMENT_SPEED,
    ROTATION_SPEED
} from './GameConfig';
import { PlayerAvatar } from './assets';

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type SeatedBehavior = Extract<InteractionBehavior, { type: 'seat' | 'station' }>;

type PlayerProps = {
    isPlaying: boolean;
    inputLocked?: boolean;
    isRemote?: boolean;
    peerId?: string;
    name?: string;
    initialPos: [number, number, number];
    initialRot: number;
    barriers: Barrier[];
    portals: PortalDef[];
    interactables?: Interactable[];
    seatData?: { seatIndex: number; hand: Card[] } | null;
    remoteData?: {
        pos: [number, number, number];
        rot: number;
        pose?: PlayerPose;
        isFading?: boolean;
        name?: string;
    };
    worldStateRef?: React.RefObject<Record<string, RemotePlayerState>>;
    playerRef?: React.RefObject<THREE.Group | null>;
    visualsRef?: React.RefObject<THREE.Group | null>;
    onPortalEnter: (target: PortalDef) => void;
    onInteractChange?: (label: string | null) => void;
    onPoseChange?: (pose: PlayerPose) => void;
    onSeatInteract?: (seatIndex: number) => void;
    onTriggerInteract?: (id: string) => void;

    // [FIXED] Types now allow null, which matches useRef() default behavior
    promptRef?: React.RefObject<HTMLDivElement | null>;
    interactionStateRef?: React.MutableRefObject<{ label: string | null }>;
};

/* -------------------------------------------------------------------------- */
/* LOGIC COMPONENT                                                            */
/* -------------------------------------------------------------------------- */

export const Player = ({
                           isPlaying,
                           inputLocked = false,
                           playerRef,
                           visualsRef: providedVisualsRef,
                           initialPos,
                           initialRot,
                           barriers,
                           portals,
                           interactables = [],
                           onPortalEnter,
                           onInteractChange,
                           onPoseChange,
                           onSeatInteract,
                           onTriggerInteract,
                           isRemote = false,
                           remoteData,
                           worldStateRef,
                           peerId,
                           seatData,
                           name,
                           promptRef,           // [NEW]
                           interactionStateRef, // [NEW]
                       }: PlayerProps) => {
    // -- 1. Scene Refs --
    const groupRef = useRef<THREE.Group>(null);
    const localVisualsRef = useRef<THREE.Group>(null);
    const visualsRef = providedVisualsRef || localVisualsRef;
    const leftLegRef = useRef<THREE.Group>(null);
    const rightLegRef = useRef<THREE.Group>(null);
    const leftArmRef = useRef<THREE.Group>(null);
    const rightArmRef = useRef<THREE.Group>(null);

    // -- 2. Logic Refs --
    const prevPos = useRef<THREE.Vector3>(new THREE.Vector3(...initialPos));
    const targetRotation = useRef(initialRot);
    const keys = useRef<{ [key: string]: boolean }>({});
    const potentialInteractionRef = useRef<Interactable | null>(null);

    // [OPTIMIZATION] Store last label locally to avoid DOM trashing
    const lastLabelRef = useRef<string | null>(null);

    const prevSeatConfig = useRef<SeatedBehavior | null>(null);
    const snappedSeatIndex = useRef<number | null>(null);
    const isInternalLockedRef = useRef(false);

    // -- 3. State --
    const [isInternalLocked, setIsInternalLocked] = useState(false);
    const [activeInteraction, setActiveInteraction] = useState<Interactable | null>(null);
    const [opacity, setOpacity] = useState(1);

    const displayName = isRemote
        ? (remoteData?.name || peerId?.substring(0, 4))
        : (name || peerId?.substring(0, 4));

    // -- 4. Initialization & Helpers --

    useLayoutEffect(() => {
        if (playerRef && groupRef.current) playerRef.current = groupRef.current;
    }, [playerRef]);

    useLayoutEffect(() => {
        if (groupRef.current && !isRemote && !seatData) {
            groupRef.current.position.set(...initialPos);
            prevPos.current.set(...initialPos);

            if (visualsRef.current) {
                visualsRef.current.rotation.y = initialRot;
                targetRotation.current = initialRot;
            }
        }
    }, [initialPos, initialRot, isRemote, seatData]);

    const getSeatConfig = (): SeatedBehavior | null => {
        if (seatData) {
            const item = interactables.find(
                i => i.behavior.type === 'seat' && i.behavior.seatIndex === seatData.seatIndex
            );
            return item ? (item.behavior as SeatedBehavior) : null;
        }
        if (activeInteraction?.behavior.type === 'station') {
            return activeInteraction.behavior as SeatedBehavior;
        }
        return null;
    };

    const seatConfig = getSeatConfig();

    // -- 5. Effects (Seating, Posing, Input) --

    useEffect(() => {
        if (isRemote) return;

        // 1. Determine Label
        let label: string | null = null;
        if (seatConfig) {
            if (seatConfig.type === 'station') label = seatConfig.exitLabel || 'Leave';
            else if (seatConfig.type === 'seat') label = 'LEAVE TABLE';
        }

        // 2. Direct DOM Update (because useFrame loop is paused for seating)
        if (promptRef?.current) {
            if (label) {
                const textSpan = promptRef.current.querySelector('#prompt-text');
                if (textSpan) textSpan.textContent = `[E] ${ label }`;
                promptRef.current.style.opacity = '1';
            } else {
                // Hide immediately when standing up; useFrame will re-show if needed next tick
                promptRef.current.style.opacity = '0';
            }
        }

        // 3. Update Shared State
        if (interactionStateRef) {
            interactionStateRef.current.label = label;
        }

        // 4. Update Legacy/Logic State
        if (lastLabelRef.current !== label) {
            lastLabelRef.current = label;
            onInteractChange?.(label);
        }
    }, [seatConfig, onInteractChange, isRemote, promptRef, interactionStateRef]);

    useEffect(() => {
        if (!groupRef.current) return;

        // Snap to seat
        if (seatConfig) {
            const currentIdx = seatData ? seatData.seatIndex : -1;
            const needsSnap = snappedSeatIndex.current !== currentIdx;

            groupRef.current.position.set(...seatConfig.anchorPosition);

            if (needsSnap && visualsRef.current) {
                visualsRef.current.rotation.y = seatConfig.anchorRotation;
                targetRotation.current = seatConfig.anchorRotation;
                snappedSeatIndex.current = currentIdx;
            }

            setActiveInteraction(activeInteraction);
            setIsInternalLocked(false);
            isInternalLockedRef.current = false;
            prevSeatConfig.current = seatConfig;
        }
        // Snap to exit
        else if (prevSeatConfig.current && !seatData && !activeInteraction) {
            const exitPos = new THREE.Vector3(...prevSeatConfig.current.exitPosition);
            groupRef.current.position.copy(exitPos);
            prevPos.current.copy(exitPos);
            prevSeatConfig.current = null;
            snappedSeatIndex.current = null;
        }
        // Fallback Respawn
        else if (!seatData && !activeInteraction) {
            snappedSeatIndex.current = null;
            const d = groupRef.current.position.distanceTo(new THREE.Vector3(...initialPos));
            if (d > 50) {
                groupRef.current.position.set(...initialPos);
                if (visualsRef.current) {
                    visualsRef.current.rotation.y = initialRot;
                    targetRotation.current = initialRot;
                }
                isInternalLockedRef.current = false;
                setIsInternalLocked(false);
                setActiveInteraction(null);
                setOpacity(1);
            }
        }
    }, [seatData, activeInteraction, initialPos, initialRot, seatConfig]);

    useEffect(() => {
        if (!isRemote && onPoseChange) {
            let pose: PlayerPose = 'idle';
            if (seatData) pose = 'sit';
            else if (activeInteraction?.behavior.type === 'station') pose = activeInteraction.behavior.pose;
            onPoseChange(pose);
        }
    }, [activeInteraction, isRemote, onPoseChange, seatData]);

    useEffect(() => {
        if (isRemote) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            keys.current[e.key.toLowerCase()] = true;
            if (e.key.toLowerCase() === 'e' && groupRef.current) {
                if (potentialInteractionRef.current && potentialInteractionRef.current.behavior.type === 'seat' && onSeatInteract) {
                    onSeatInteract(potentialInteractionRef.current.behavior.seatIndex);
                    return;
                } else if (potentialInteractionRef.current && potentialInteractionRef.current.behavior.type === 'trigger' && onTriggerInteract) {
                    onTriggerInteract(potentialInteractionRef.current.id);
                    return;
                }
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
                        targetRotation.current = target.behavior.anchorRotation;
                    }
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keys.current[e.key.toLowerCase()] = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isRemote, interactables, activeInteraction, onSeatInteract]);

    // -- 6. Animation Logic --

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

    // -- 7. Game Loop --

    useFrame((state, delta) => {
        if (!groupRef.current || !visualsRef.current || !isPlaying) return;

        // [OPTIMIZATION] Remote Player Logic (Ref-Based)
        if (isRemote && peerId) {
            let playerData = remoteData;
            if (worldStateRef && worldStateRef.current && worldStateRef.current[peerId]) {
                playerData = worldStateRef.current[peerId];
            }

            if (!playerData) return;

            if (playerData.isFading) setOpacity(prev => Math.max(0, prev - delta * 1.5));
            else setOpacity(1);

            const targetPos = new THREE.Vector3(...playerData.pos);
            const dist = groupRef.current.position.distanceTo(targetPos);

            if (dist > 5) groupRef.current.position.copy(targetPos);
            else {
                groupRef.current.position.lerp(targetPos, delta * 10);
            }

            let angleDiff = playerData.rot - visualsRef.current.rotation.y;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            visualsRef.current.rotation.y += angleDiff * ROTATION_SPEED * delta;

            const distanceMoved = groupRef.current.position.distanceTo(prevPos.current);
            prevPos.current.copy(groupRef.current.position);

            if (distanceMoved > 0.01) animateWalk(state.clock.elapsedTime);
            else if (playerData.pose && playerData.pose !== 'idle') animateStationPose(playerData.pose, delta);
            else resetPose();
            return;
        }

        // Local Movement
        let dx = 0, dz = 0;
        const isLocked = isInternalLocked || isInternalLockedRef.current;
        const isSeated = !!seatConfig;

        if (!isLocked && !inputLocked && !isSeated) {
            if (keys.current['w']) dz -= 1;
            if (keys.current['s']) dz += 1;
        }
        if (!isLocked && !inputLocked) {
            if (keys.current['a']) dx -= 1;
            if (keys.current['d']) dx += 1;
        }

        if (isSeated && seatConfig) {
            const seatPos = new THREE.Vector3(...seatConfig.anchorPosition);
            groupRef.current.position.lerp(seatPos, delta * 10);
            if (dx !== 0) targetRotation.current += (dx * -1) * 3 * delta;
            animateStationPose('sit', delta);
        } else {
            if (isInternalLocked) dz -= 1;
            const isMovingInput = dx !== 0 || dz !== 0;

            if (isMovingInput && !isSeated) targetRotation.current = Math.atan2(dx, dz);

            if (isMovingInput && (dz !== 0 || dx !== 0)) {
                const len = Math.sqrt(dx * dx + dz * dz);
                const nx = dx / len, nz = dz / len;
                const nextX = groupRef.current.position.x + nx * MOVEMENT_SPEED * delta;
                const nextZ = groupRef.current.position.z + nz * MOVEMENT_SPEED * delta;

                if (!checkCollision(nextX, groupRef.current.position.z)) groupRef.current.position.x = nextX;
                if (!checkCollision(groupRef.current.position.x, nextZ)) groupRef.current.position.z = nextZ;

                animateWalk(state.clock.elapsedTime);
            } else {
                resetPose();
            }
        }

        // Interaction Scanning
        if (!isSeated) {
            let label: string | null = null;
            const pPos = groupRef.current.position;
            const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), visualsRef.current.rotation.y);
            let found: Interactable | null = null;

            for (const item of interactables) {
                const target = new THREE.Vector3(...item.position);
                const isFacing = forward.dot(target.clone().sub(pPos).normalize()) > 0.4;
                if (pPos.distanceTo(target) <= item.interactionRadius && isFacing) {
                    found = item;
                    break;
                }
            }
            potentialInteractionRef.current = found;
            if (found) label = found.label;

            // [OPTIMIZATION] Direct DOM Update (Lag Removal)
            if (label !== lastLabelRef.current) {
                lastLabelRef.current = label;

                // 1. Update Network State (Ref only, no re-render)
                if (interactionStateRef) {
                    interactionStateRef.current.label = label;
                }

                // 2. Update UI (Direct DOM manipulation)
                if (promptRef?.current) {
                    if (label) {
                        const textSpan = promptRef.current.querySelector('#prompt-text');
                        if (textSpan) textSpan.textContent = `[E] ${ label }`;
                        promptRef.current.style.opacity = '1';
                    } else {
                        promptRef.current.style.opacity = '0';
                    }
                }

                // Keep callback for critical state if needed (e.g. tutorial checks)
                if (onInteractChange) onInteractChange(label);
            }

            if (!isInternalLocked) {
                for (const p of portals) {
                    if (groupRef.current.position.distanceTo(new THREE.Vector3(...p.position)) < 1.0) {
                        isInternalLockedRef.current = true;
                        setIsInternalLocked(true);
                        onPortalEnter(p);
                    }
                }
            }
        }

        // Smooth Rotation
        let aDiff = targetRotation.current - visualsRef.current.rotation.y;
        while (aDiff > Math.PI) aDiff -= Math.PI * 2;
        while (aDiff < -Math.PI) aDiff += Math.PI * 2;
        visualsRef.current.rotation.y += aDiff * ROTATION_SPEED * delta;
    });

    return (
        <group ref={ groupRef }>
            <PlayerAvatar
                visualsRef={ visualsRef as React.RefObject<THREE.Group> }
                leftLegRef={ leftLegRef as React.RefObject<THREE.Group> }
                rightLegRef={ rightLegRef as React.RefObject<THREE.Group> }
                leftArmRef={ leftArmRef as React.RefObject<THREE.Group> }
                rightArmRef={ rightArmRef as React.RefObject<THREE.Group> }
                opacity={ opacity }
                displayName={ displayName }
                hand={ seatData?.hand }
                isLocalPlayer={ !isRemote }
            />
        </group>
    );
};
