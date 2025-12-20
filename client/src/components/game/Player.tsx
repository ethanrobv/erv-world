import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import * as React from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useThemeColor } from '../../hooks/useThemeColor';
import {
    type Barrier,
    type PortalDef,
    type Interactable,
    type InteractionBehavior,
    type PlayerPose,
    type Card,
    MOVEMENT_SPEED,
    ROTATION_SPEED,
    SCENE_DATA
} from './GameConfig';
import { SoftBlock, HandVisuals } from './GameAssets';

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
    onPoseChange?: (pose: PlayerPose) => void;
    onSeatInteract?: (seatIndex: number) => void;
    isRemote?: boolean;
    remoteData?: { pos: [number, number, number]; rot: number; pose?: PlayerPose; isFading?: boolean; name?: string }; // [!code change] Added name type
    peerId?: string;
    seatData?: { seatIndex: number; hand: Card[] } | null;
    name?: string; // [!code change] Added name prop
};

type SeatedBehavior = Exclude<InteractionBehavior, { type: 'trigger' }>;

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
                           onPoseChange,
                           onSeatInteract,
                           isRemote = false,
                           remoteData,
                           peerId,
                           seatData,
                           name // [!code change] Destructure name
                       }: PlayerProps) => {
    // Scene Refs
    const groupRef = useRef<THREE.Group>(null);
    const visualsRef = useRef<THREE.Group>(null);

    // Limb Refs
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

    // Track previous seat to handle exit snapping
    const prevSeatConfig = useRef<SeatedBehavior | null>(null);
    // Track which seat we are snapped to, to prevent infinite re-snapping loop
    const snappedSeatIndex = useRef<number | null>(null);

    // Portal Lock Ref
    const isInternalLockedRef = useRef(false);

    // State
    const [isInternalLocked, setIsInternalLocked] = useState(false);
    const [activeInteraction, setActiveInteraction] = useState<Interactable | null>(null);
    const [opacity, setOpacity] = useState(1);

    // Theme
    const primaryColor = useThemeColor('--brand-primary');
    // Use brand color for shirt to stand out against background
    const shirtColor = useThemeColor('--player-torso');
    const headColor = useThemeColor('--player-head');
    const pantsColor = useThemeColor('--player-legs');

    // [!code change] Determine displayed name
    const displayName = isRemote ? (remoteData?.name || peerId?.substring(0, 4)) : (name || peerId?.substring(0, 4));

    /* -------------------------------------------------------------------------- */
    /* LIFECYCLE & SEATING HELPER                                                 */
    /* -------------------------------------------------------------------------- */

    useLayoutEffect(() => {
        if (playerRef && groupRef.current) playerRef.current = groupRef.current;
    }, [playerRef]);

    // Helper to resolve seat position
    const getSeatConfig = (): SeatedBehavior | null => {
        if (seatData) {
            const items = SCENE_DATA['bar'].interactables;
            const item = items?.find(i => i.behavior.type === 'seat' && i.behavior.seatIndex === seatData.seatIndex);
            return item ? (item.behavior as SeatedBehavior) : null;
        }
        if (activeInteraction?.behavior.type === 'station') {
            return activeInteraction.behavior as SeatedBehavior;
        }
        return null;
    };

    const seatConfig = getSeatConfig();

    /* -------------------------------------------------------------------------- */
    /* POSITION RESET & SEAT SNAPPING                                             */
    /* -------------------------------------------------------------------------- */

    // Handle Interaction Label while Seated
    useEffect(() => {
        if (isRemote) return;

        let label: string | null = null;

        if (seatConfig) {
            if (seatConfig.type === 'station') {
                label = seatConfig.exitLabel || 'Leave';
            } else if (seatConfig.type === 'seat') {
                label = 'LEAVE TABLE';
            }
        }

        if (lastSentLabelRef.current !== label) {
            lastSentLabelRef.current = label;
            onInteractChange?.(label);
        }
    }, [seatConfig, onInteractChange, isRemote]);

    useEffect(() => {
        if (!groupRef.current) return;

        // 1. Handle Seating Snap
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

            // Store this seat config so we know where to exit to later
            prevSeatConfig.current = seatConfig;
        }

        // 2. Handle Exit Snap (When standing up from a Blackjack seat)
        else if (prevSeatConfig.current && !seatData && !activeInteraction) {
            const exitPos = new THREE.Vector3(...prevSeatConfig.current.exitPosition);
            groupRef.current.position.copy(exitPos);
            prevSeatConfig.current = null;
            snappedSeatIndex.current = null; // Reset snap tracker
        }

        // 3. Handle Spawn Reset (Only if NOT seated and not exiting)
        else if (!seatData && !activeInteraction) {
            snappedSeatIndex.current = null; // Reset snap tracker
            const d = groupRef.current.position.distanceTo(new THREE.Vector3(...initialPos));
            if (d > 20) {
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

    // Sync Pose Change
    useEffect(() => {
        if (!isRemote && onPoseChange) {
            let pose: PlayerPose = 'idle';
            if (seatData) pose = 'sit';
            else if (activeInteraction?.behavior.type === 'station') pose = activeInteraction.behavior.pose;
            onPoseChange(pose);
        }
    }, [activeInteraction, isRemote, onPoseChange, seatData]);

    /* -------------------------------------------------------------------------- */
    /* INPUT HANDLERS                                                             */
    /* -------------------------------------------------------------------------- */

    useEffect(() => {
        if (isRemote) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            keys.current[e.key.toLowerCase()] = true;

            if (e.key.toLowerCase() === 'e' && groupRef.current) {
                // 1. Join Seat (Priority)
                if (potentialInteractionRef.current && potentialInteractionRef.current.behavior.type === 'seat' && onSeatInteract) {
                    onSeatInteract(potentialInteractionRef.current.behavior.seatIndex);
                    return;
                }

                // 2. Leave Station (Stools)
                if (activeInteraction) {
                    if (activeInteraction.behavior.type === 'station') {
                        const exitPos = new THREE.Vector3(...activeInteraction.behavior.exitPosition);
                        groupRef.current.position.copy(exitPos);
                    }
                    setActiveInteraction(null);
                }
                // 3. Enter Station
                else if (potentialInteractionRef.current) {
                    const target = potentialInteractionRef.current;
                    if (target.behavior.type === 'station') {
                        setActiveInteraction(target);
                        targetRotation.current = target.behavior.anchorRotation;
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
    }, [isRemote, interactables, activeInteraction, onSeatInteract]);

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

        // 1. REMOTE PLAYER INTERPOLATION
        if (isRemote && remoteData) {
            if (remoteData.isFading) {
                setOpacity(prev => Math.max(0, prev - delta * 1.5));
            }

            const targetPos = new THREE.Vector3(...remoteData.pos);
            const dist = groupRef.current.position.distanceTo(targetPos);

            if (dist > 5) groupRef.current.position.copy(targetPos);
            else groupRef.current.position.lerp(targetPos, delta * 15);

            let angleDiff = remoteData.rot - visualsRef.current.rotation.y;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            visualsRef.current.rotation.y += angleDiff * ROTATION_SPEED * delta;

            const distanceMoved = groupRef.current.position.distanceTo(prevPos.current);
            prevPos.current.copy(groupRef.current.position);

            if (distanceMoved > 0.01) animateWalk(state.clock.elapsedTime);
            else if (remoteData.pose && remoteData.pose !== 'idle') animateStationPose(remoteData.pose, delta);
            else resetPose();

            return;
        }

        // 2. LOCAL MOVEMENT & PHYSICS
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

            if (dx !== 0) {
                targetRotation.current += (dx * -1) * 3 * delta;
            }

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

        // Interaction Scanning (Only if not seated)
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

            if (label !== lastSentLabelRef.current) {
                lastSentLabelRef.current = label;
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

        // 3. Smooth Rotation (Local)
        let aDiff = targetRotation.current - visualsRef.current.rotation.y;
        while (aDiff > Math.PI) aDiff -= Math.PI * 2;
        while (aDiff < -Math.PI) aDiff += Math.PI * 2;
        visualsRef.current.rotation.y += aDiff * ROTATION_SPEED * delta;
    });

    const isTrans = opacity < 1;

    return (
        <group ref={ groupRef }>
            {/* NAME TAG */ }
            { displayName && opacity > 0.1 && (
                <Text
                    position={ [0, 2.4, 0] } // [!code change] Raised Name Tag to 2.4 to be under cards (at 3.4)
                    fontSize={ 0.2 }
                    color={ primaryColor }
                    anchorX='center'
                    anchorY='middle'
                    fillOpacity={ opacity }
                    font='https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff'
                >
                    { displayName.toUpperCase() }
                </Text>
            ) }

            {/* HAND VISUALS (For Card Game) */ }
            { seatData && seatData.hand.length > 0 && (
                <HandVisuals hand={ seatData.hand } isLocal={ !isRemote }/>
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
                <group position={ [-0.15, 0.5, 0] } ref={ leftLegRef }>
                    <SoftBlock args={ [0.2, 0.5, 0.2] } color={ pantsColor } position={ [0, -0.25, 0] }
                               opacity={ opacity } transparent={ isTrans }/>
                </group>
                <group position={ [0.15, 0.5, 0] } ref={ rightLegRef }>
                    <SoftBlock args={ [0.2, 0.5, 0.2] } color={ pantsColor } position={ [0, -0.25, 0] }
                               opacity={ opacity } transparent={ isTrans }/>
                </group>
                <group position={ [-0.38, 1.15, 0] } ref={ leftArmRef }>
                    <SoftBlock args={ [0.18, 0.5, 0.18] } color={ shirtColor } position={ [0, -0.2, 0] }
                               opacity={ opacity } transparent={ isTrans }/>
                </group>
                <group position={ [0.38, 1.15, 0] } ref={ rightArmRef }>
                    <SoftBlock args={ [0.18, 0.5, 0.18] } color={ shirtColor } position={ [0, -0.2, 0] }
                               opacity={ opacity } transparent={ isTrans }/>
                </group>
            </group>
        </group>
    );
}
