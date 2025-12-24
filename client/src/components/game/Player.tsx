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
import { PlayerAvatar, FishingRod, Bobber } from './assets';

const _vec = new THREE.Vector3();
const _target = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

type SeatedBehavior = Extract<InteractionBehavior, { type: 'seat' | 'station' }>;

const useLocalBobberWiggle = (isActive: boolean) => {
    const [offset, setOffset] = useState({ x: 0, z: 0 });

    useEffect(() => {
        if (!isActive) {
            setOffset(prev => (prev.x === 0 && prev.z === 0 ? prev : { x: 0, z: 0 }));
            return;
        }

        const keys = { w: false, a: false, s: false, d: false };

        const update = () => {
            let x = 0, z = 0;
            if (keys.w) z -= 0.5;
            if (keys.s) z += 0.5;
            if (keys.a) x -= 0.5;
            if (keys.d) x += 0.5;
            setOffset({ x, z });
        };

        const handler = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (k in keys) {
                keys[k as keyof typeof keys] = e.type === 'keydown';
                update();
            }
        };

        window.addEventListener('keydown', handler);
        window.addEventListener('keyup', handler);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };

        function handleKeyDown(e: KeyboardEvent) {
            handler(e);
        }

        function handleKeyUp(e: KeyboardEvent) {
            keys[e.key.toLowerCase() as keyof typeof keys] = false;
        }

    }, [isActive]);

    return offset;
};

interface PlayerProps {
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
    waterZones?: { x: number[]; z: number[] }[];
    seatData?: {
        seatIndex: number;
        hand: Card[];
        activityType?: string;
        phase?: string;
        biteStrength?: number;
    } | null;
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
    promptRef?: React.RefObject<HTMLDivElement | null>;
    interactionStateRef?: React.RefObject<{ label: string | null }>;
}

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
                           waterZones,
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
                           promptRef,
                           interactionStateRef
                       }: PlayerProps) => {

    const groupRef = useRef<THREE.Group>(null);
    const localVisualsRef = useRef<THREE.Group>(null);
    const visualsRef = providedVisualsRef || localVisualsRef;

    const leftLegRef = useRef<THREE.Group>(null);
    const rightLegRef = useRef<THREE.Group>(null);
    const leftArmRef = useRef<THREE.Group>(null);
    const rightArmRef = useRef<THREE.Group>(null);

    const prevPos = useRef<THREE.Vector3>(new THREE.Vector3(...initialPos));
    const targetRotation = useRef(initialRot);
    const keys = useRef<{ [key: string]: boolean }>({});
    const potentialInteractionRef = useRef<Interactable | null>(null);
    const lastLabelRef = useRef<string | null>(null);

    const prevSeatConfig = useRef<SeatedBehavior | null>(null);
    const snappedSeatIndex = useRef<number | null>(null);

    // --- State & Logic Refs ---

    // Logic flag only (no re-render needed for flag itself, used in frame loop)
    const isInternalLockedRef = useRef(false);

    // Active Interaction: State for React tree, Ref for Frame loop
    const [activeInteraction, _setActiveInteraction] = useState<Interactable | null>(null);
    const activeInteractionRef = useRef<Interactable | null>(null);

    const updateActiveInteraction = (val: Interactable | null) => {
        activeInteractionRef.current = val;
        _setActiveInteraction(val);
    };

    const [opacity, setOpacity] = useState(0);
    const [bobberPos, setBobberPos] = useState<[number, number, number] | null>(null);

    const displayName = isRemote
        ? (remoteData?.name || peerId?.substring(0, 4))
        : (name || peerId?.substring(0, 4));

    const hasInitialized = useRef(false);

    const isFishing = seatData?.activityType === 'fishing';
    const fishingPhase = seatData?.phase || 'idle';

    const wiggleOffset = useLocalBobberWiggle(!isRemote && isFishing && fishingPhase === 'waiting');

    // FIX 1: Bobber Reset Logic
    // Wrapped in setTimeout to prevent synchronous set-state-in-effect warning
    useEffect(() => {
        if (!isFishing || fishingPhase === 'idle' || fishingPhase === 'caught') {
            setTimeout(() => {
                setBobberPos(prev => prev ? null : prev);
            }, 0);
        }
    }, [isFishing, fishingPhase]);

    // Bobber Position Logic (Layout Effect for synchronous updates with frame)
    useLayoutEffect(() => {
        if (!isFishing || !groupRef.current || fishingPhase === 'idle' || fishingPhase === 'caught') {
            return;
        }

        const baseDist = 4;
        const rot = targetRotation.current;
        const x = (Math.sin(rot) * baseDist) + wiggleOffset.x;
        const z = (Math.cos(rot) * baseDist) + wiggleOffset.z;
        const y = 0.1 - groupRef.current.position.y;

        setBobberPos(prev => {
            if (prev && Math.abs(prev[0] - x) < 0.001 && Math.abs(prev[1] - y) < 0.001 && Math.abs(prev[2] - z) < 0.001) {
                return prev;
            }
            return [x, y, z];
        });
    }, [isFishing, fishingPhase, wiggleOffset, groupRef]);

    useLayoutEffect(() => {
        if (playerRef && groupRef.current) playerRef.current = groupRef.current;
    }, [playerRef]);

    useLayoutEffect(() => {
        if (hasInitialized.current) return;
        if (groupRef.current && !isRemote) {
            groupRef.current.position.set(...initialPos);
            prevPos.current.set(...initialPos);
            if (visualsRef.current) {
                visualsRef.current.rotation.y = initialRot;
                targetRotation.current = initialRot;
            }
            hasInitialized.current = true;
        }
    }, [initialPos, initialRot, isRemote, visualsRef]);

    const getSeatConfig = (): SeatedBehavior | null => {
        if (seatData) {
            const item = interactables.find(i => {
                const b = i.behavior;
                return b?.type === 'seat' && b.seatIndex === seatData.seatIndex;
            });
            return item ? (item.behavior as SeatedBehavior) : null;
        }
        const activeBehav = activeInteraction?.behavior;
        if (activeBehav?.type === 'station') {
            return activeBehav;
        }
        return null;
    };

    const seatConfig = getSeatConfig();

    const updatePromptUI = (label: string | null) => {
        if (!promptRef?.current) return;
        if (label) {
            const textSpan = promptRef.current.querySelector('#prompt-text');
            if (textSpan && textSpan.textContent !== `[E] ${ label }`) {
                textSpan.textContent = `[E] ${ label }`;
            }
            if (promptRef.current.style.opacity !== '1') {
                promptRef.current.style.opacity = '1';
            }
        } else {
            if (promptRef.current.style.opacity !== '0') {
                promptRef.current.style.opacity = '0';
            }
        }
    };

    // FIX 2: Seat Snapping Logic
    // Used requestAnimationFrame for the fallback state updates.
    // This breaks the synchronous render cycle detection by ESLint.
    useEffect(() => {
        if (!groupRef.current) return;

        // 1. Entering/Active Seat
        if (seatConfig) {
            const currentIdx = seatData ? seatData.seatIndex : -1;
            const needsSnap = snappedSeatIndex.current !== currentIdx;

            groupRef.current.position.set(...seatConfig.anchorPosition);

            if (needsSnap && visualsRef.current) {
                visualsRef.current.rotation.y = seatConfig.anchorRotation;
                targetRotation.current = seatConfig.anchorRotation;
                snappedSeatIndex.current = currentIdx;
            }

            // Sync interactions logic (Ref only needed here)
            if (activeInteractionRef.current && activeInteractionRef.current !== activeInteraction) {
                // Handled by updateActiveInteraction
            }

            isInternalLockedRef.current = false;
            prevSeatConfig.current = seatConfig;

            // 2. Exiting Seat
        } else if (prevSeatConfig.current && !seatData && !activeInteraction) {
            const exitPos = new THREE.Vector3(...prevSeatConfig.current.exitPosition);
            groupRef.current.position.copy(exitPos);
            prevPos.current.copy(exitPos);
            prevSeatConfig.current = null;
            snappedSeatIndex.current = null;

            // 3. Fallback Reset (Out of Bounds)
        } else if (!seatData && !activeInteraction) {
            snappedSeatIndex.current = null;
            const d = groupRef.current.position.distanceTo(new THREE.Vector3(...initialPos));

            if (d > 50) {
                groupRef.current.position.set(...initialPos);
                if (visualsRef.current) {
                    visualsRef.current.rotation.y = initialRot;
                    targetRotation.current = initialRot;
                }

                isInternalLockedRef.current = false;

                // Safe: Defer state updates to next frame
                if (activeInteractionRef.current || opacity !== 1) {
                    requestAnimationFrame(() => {
                        updateActiveInteraction(null);
                        setOpacity(1);
                    });
                }
            }
        }
    }, [
        seatConfig,
        seatData,
        activeInteraction,
        initialPos,
        initialRot,
        visualsRef,
        opacity
    ]);

    // Pose State
    useEffect(() => {
        if (!isRemote && onPoseChange) {
            let pose: PlayerPose = 'idle';
            const b = activeInteraction?.behavior;

            if (seatData?.activityType === 'fishing') pose = 'fishing';
            else if (seatData) pose = 'sit';
            else if (b?.type === 'station') pose = b.pose;

            onPoseChange(pose);
        }
    }, [activeInteraction, isRemote, onPoseChange, seatData]);

    // Input Handling
    useEffect(() => {
        if (isRemote) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            keys.current[e.key.toLowerCase()] = true;
            if (e.key.toLowerCase() === 'e' && groupRef.current) {
                if (inputLocked) return;
                const potential = potentialInteractionRef.current;
                const behavior = potential?.behavior;

                if (behavior?.type === 'seat' && onSeatInteract) {
                    onSeatInteract(behavior.seatIndex);
                    return;
                }

                if (potential && behavior?.type === 'trigger' && onTriggerInteract) {
                    onTriggerInteract(potential.id);
                    return;
                }

                if (activeInteractionRef.current) {
                    // Leaving interaction
                    const activeBehav = activeInteractionRef.current.behavior;
                    if (activeBehav?.type === 'station') {
                        const exitPos = new THREE.Vector3(...activeBehav.exitPosition);
                        groupRef.current.position.copy(exitPos);
                    }
                    updateActiveInteraction(null);
                } else if (potential && behavior?.type === 'station') {
                    // Entering interaction
                    updateActiveInteraction(potential);
                    targetRotation.current = behavior.anchorRotation;
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
    }, [isRemote, interactables, onSeatInteract, onTriggerInteract, inputLocked]);

    const checkCollision = (x: number, z: number) => {
        for (const b of barriers) {
            if (x >= b.x[0] && x <= b.x[1] && z >= b.z[0] && z <= b.z[1]) return true;
        }
        return false;
    };

    const animateWalk = (time: number) => {
        if (!visualsRef.current) return;
        const t = time * 15;
        visualsRef.current.rotation.z = Math.sin(t) * 0.05;
        visualsRef.current.position.y = (Math.sin(t * 2) + 1) * 0.05;
        if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(t) * 0.8;
        if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(t + Math.PI) * 0.8;
        if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(t + Math.PI) * 0.6;
        if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(t) * 0.6;
    };

    const animateStationPose = (pose: PlayerPose, delta: number) => {
        if (!visualsRef.current) return;
        visualsRef.current.position.y = THREE.MathUtils.lerp(visualsRef.current.position.y, 0, 0.1);

        let legAngle = 0;
        let rightArmAngle = 0;
        let leftArmAngle = 0;

        if (pose === 'sit') {
            legAngle = -Math.PI / 2;
        } else if (pose === 'fishing') {
            rightArmAngle = -0.5;
            leftArmAngle = -0.3;
        }

        const lerpLimb = (ref: React.RefObject<THREE.Group | null>, target: number) => {
            if (ref.current) ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, target, delta * 10);
        };
        lerpLimb(leftLegRef, legAngle);
        lerpLimb(rightLegRef, legAngle);
        lerpLimb(leftArmRef, leftArmAngle);
        lerpLimb(rightArmRef, rightArmAngle);
    };

    const resetPose = () => {
        if (!visualsRef.current) return;
        visualsRef.current.rotation.z = THREE.MathUtils.lerp(visualsRef.current.rotation.z, 0, 0.1);
        visualsRef.current.position.y = THREE.MathUtils.lerp(visualsRef.current.position.y, 0, 0.1);
        [leftLegRef, rightLegRef, leftArmRef, rightArmRef].forEach(ref => {
            if (ref.current) ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, 0, 0.1);
        });
    };

    //
    useFrame((state, delta) => {
        if (!groupRef.current || !visualsRef.current || !isPlaying) return;

        const currentData = isRemote ? (worldStateRef?.current?.[peerId!] || remoteData) : remoteData;
        const shouldFadeOut = currentData?.isFading || isInternalLockedRef.current;

        if (shouldFadeOut) {
            // Update opacity in animation loop, guard against redundant setStates
            if (opacity > 0) setOpacity(prev => Math.max(0, prev - delta * 2.5));
        } else if (opacity < 1) {
            setOpacity(prev => Math.min(1, prev + delta * 2.5));
        }

        if (isRemote && peerId) {
            let playerData = remoteData;
            if (worldStateRef && worldStateRef.current && worldStateRef.current[peerId]) {
                playerData = worldStateRef.current[peerId];
            }
            if (!playerData) return;

            _target.set(...playerData.pos);
            const dist = groupRef.current.position.distanceTo(_target);
            if (dist > 5) groupRef.current.position.copy(_target);
            else groupRef.current.position.lerp(_target, delta * 10);

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

        let dx = 0, dz = 0;
        const isLocked = isInternalLockedRef.current;
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
            _target.set(...seatConfig.anchorPosition);
            groupRef.current.position.lerp(_target, delta * 10);
            if (dx !== 0) targetRotation.current += (dx * -1) * 3 * delta;
            animateStationPose('sit', delta);

            if (promptRef?.current) {
                const label = seatConfig.type === 'station' ? (seatConfig.exitLabel || 'Leave') : 'LEAVE TABLE';
                updatePromptUI(label);
            }

        } else {
            if (isLocked) dz -= 1;
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

        if (!isSeated) {
            let label: string | null = null;
            const pPos = groupRef.current.position;
            _forward.set(0, 0, 1).applyAxisAngle(_up, visualsRef.current.rotation.y);
            let found: Interactable | null = null;
            for (const item of interactables) {
                _target.set(...item.position);
                const isFacing = _forward.dot(_vec.copy(_target).sub(pPos).normalize()) > 0.4;
                if (pPos.distanceTo(_target) <= item.interactionRadius && isFacing) {
                    found = item;
                    break;
                }
            }
            if (!found && waterZones && waterZones.length > 0) {
                let canFish = false;
                for (const zone of waterZones) {
                    const inRange = pPos.x >= zone.x[0] - 1.5 && pPos.x <= zone.x[1] + 1.5 && pPos.z >= zone.z[0] - 1.5 && pPos.z <= zone.z[1] + 1.5;
                    if (inRange) {
                        const lookAtPointX = pPos.x + _forward.x * 2.0;
                        const lookAtPointZ = pPos.z + _forward.z * 2.0;
                        const isLookingAtWater = lookAtPointX >= zone.x[0] && lookAtPointX <= zone.x[1] && lookAtPointZ >= zone.z[0] && lookAtPointZ <= zone.z[1];
                        if (isLookingAtWater) {
                            canFish = true;
                            break;
                        }
                    }
                }
                if (canFish) {
                    found = {
                        id: 'start-fishing',
                        type: 'fishing',
                        label: 'Fish',
                        position: [pPos.x, 0, pPos.z],
                        interactionRadius: 999,
                        behavior: { type: 'trigger' }
                    };
                }
            }
            potentialInteractionRef.current = found;
            if (found) label = found.label;

            if (label) updatePromptUI(label);
            else if (lastLabelRef.current) updatePromptUI(null);

            if (label !== lastLabelRef.current) {
                lastLabelRef.current = label;
                if (interactionStateRef && interactionStateRef.current) {
                    interactionStateRef.current.label = label;
                }
                if (onInteractChange) onInteractChange(label);
            }

            if (!isInternalLockedRef.current) {
                for (const p of portals) {
                    _target.set(...p.position);
                    if (groupRef.current.position.distanceTo(_target) < 1.0) {
                        isInternalLockedRef.current = true;
                        onPortalEnter(p);
                    }
                }
            }
        }

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
                waterZones={ waterZones }
            />
            { isFishing && (
                <>
                    <FishingRod
                        active={ isPlaying && isFishing }
                        phase={ seatData?.phase || 'idle' }
                        bobberPosition={ bobberPos }
                    />
                    { bobberPos && (
                        <Bobber
                            position={ bobberPos }
                            phase={ seatData?.phase || 'idle' }
                            biteStrength={ seatData?.biteStrength || 0 }
                        />
                    ) }
                </>
            ) }
        </group>
    );
};
