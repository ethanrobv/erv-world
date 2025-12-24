import React, { useEffect, useRef, useState, useLayoutEffect, useMemo } from 'react';
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
            if (offset.x !== 0 || offset.z !== 0) setOffset({ x: 0, z: 0 });
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
            window.removeEventListener('keydown', handler);
            window.removeEventListener('keyup', handler);
        };
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
    const isInternalLockedRef = useRef(false);

    const [isInternalLocked, setIsInternalLocked] = useState(false);
    const [activeInteraction, setActiveInteraction] = useState<Interactable | null>(null);
    const [opacity, setOpacity] = useState(0);

    const displayName = isRemote
        ? (remoteData?.name || peerId?.substring(0, 4))
        : (name || peerId?.substring(0, 4));

    const hasInitialized = useRef(false);

    const isFishing = seatData?.activityType === 'fishing';
    const fishingPhase = seatData?.phase || 'idle';

    // Local-only hook, returns 0 for remote
    const wiggleOffset = useLocalBobberWiggle(!isRemote && isFishing && fishingPhase === 'waiting');

    // FIX: Calculate Bobber Position in LOCAL space
    const bobberPosition = useMemo(() => {
        if (!isFishing || !groupRef.current || !visualsRef.current) return null;
        if (fishingPhase === 'idle' || fishingPhase === 'caught') return null;

        const baseDist = 4;

        // We use visuals rotation, but we do NOT add group position.
        // The bobber is a child of the group, so it inherits the position automatically.
        const rot = visualsRef.current.rotation.y;

        // Local X/Z offsets based on rotation
        const x = (Math.sin(rot) * baseDist) + wiggleOffset.x;
        const z = (Math.cos(rot) * baseDist) + wiggleOffset.z;

        // Local Y calculation:
        // We want the bobber at absolute world height 0.1 (water level).
        // Since the group might be at y=0, y=5, etc., we subtract group Y.
        const y = 0.1 - groupRef.current.position.y;

        return [x, y, z] as [number, number, number];
    }, [isFishing, fishingPhase, wiggleOffset, groupRef.current?.position, visualsRef.current?.rotation.y]);

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
    }, [initialPos, initialRot, isRemote]);

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

    // Seat Snapping
    useEffect(() => {
        if (!groupRef.current) return;
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
        } else if (prevSeatConfig.current && !seatData && !activeInteraction) {
            const exitPos = new THREE.Vector3(...prevSeatConfig.current.exitPosition);
            groupRef.current.position.copy(exitPos);
            prevPos.current.copy(exitPos);
            prevSeatConfig.current = null;
            snappedSeatIndex.current = null;
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
                setIsInternalLocked(false);
                setActiveInteraction(null);
                setOpacity(1);
            }
        }
    }, [seatData, activeInteraction, initialPos, initialRot, seatConfig]);

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
                } else if (potential && behavior?.type === 'trigger' && onTriggerInteract) {
                    onTriggerInteract(potential.id);
                    return;
                }
                if (activeInteraction) {
                    const activeBehav = activeInteraction.behavior;
                    if (activeBehav?.type === 'station') {
                        const exitPos = new THREE.Vector3(...activeBehav.exitPosition);
                        groupRef.current.position.copy(exitPos);
                    }
                    setActiveInteraction(null);
                } else if (potential && behavior?.type === 'station') {
                    setActiveInteraction(potential);
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
    }, [isRemote, interactables, activeInteraction, onSeatInteract, onTriggerInteract, inputLocked]);

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

    useFrame((state, delta) => {
        if (!groupRef.current || !visualsRef.current || !isPlaying) return;

        const currentData = isRemote ? (worldStateRef?.current?.[peerId!] || remoteData) : remoteData;
        const shouldFadeOut = currentData?.isFading || isInternalLocked;
        if (shouldFadeOut) setOpacity(prev => Math.max(0, prev - delta * 2.5));
        else if (opacity < 1) setOpacity(prev => Math.min(1, prev + delta * 2.5));

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
            _target.set(...seatConfig.anchorPosition);
            groupRef.current.position.lerp(_target, delta * 10);
            if (dx !== 0) targetRotation.current += (dx * -1) * 3 * delta;
            animateStationPose('sit', delta);

            if (promptRef?.current) {
                const label = seatConfig.type === 'station' ? (seatConfig.exitLabel || 'Leave') : 'LEAVE TABLE';
                updatePromptUI(label);
            }

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
                if (interactionStateRef) interactionStateRef.current.label = label;
                if (onInteractChange) onInteractChange(label);
            }
            if (!isInternalLocked) {
                for (const p of portals) {
                    _target.set(...p.position);
                    if (groupRef.current.position.distanceTo(_target) < 1.0) {
                        isInternalLockedRef.current = true;
                        setIsInternalLocked(true);
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
                        bobberPosition={ bobberPosition }
                    />
                    {/* Render bobber if we have a position */ }
                    { bobberPosition && (
                        <Bobber
                            position={ bobberPosition }
                            phase={ seatData?.phase || 'idle' }
                            biteStrength={ seatData?.biteStrength || 0 }
                        />
                    ) }
                </>
            ) }
        </group>
    );
};
