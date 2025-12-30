import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, RapierRigidBody, RigidBody, useRapier } from '@react-three/rapier';
import { Group } from 'three';
import { useKeyboard } from '../hooks/useKeyboard';
import { MovementController } from '../mechanics/MovementSystem';
import { useCharacterOrientation } from '../hooks/useCharacterOrientation';
import { CharacterModel } from './CharacterModel';
import { networkManager } from '../../network/NetworkManager';
import { PacketType } from '../../network/Protocol';

interface PlayerProps {
    physicsRef?: React.RefObject<RapierRigidBody | null>;
    cameraRotationRef?: React.RefObject<number>;
}

export const Player = ({ physicsRef, cameraRotationRef }: PlayerProps) => {
    // --- REFS ---
    const internalRef = useRef<RapierRigidBody>(null);
    const rigidBody = physicsRef || internalRef;
    const visuals = useRef<Group>(null);

    // Store current gravity to avoid redundant calls to the physics engine
    const currentGravityScale = useRef(2.5);
    // Throttle for network broadcasts (ms)
    const lastBroadcast = useRef(0);

    const animationState = useRef({
        speed: 0,
        isGrounded: true,
        isJumping: false,
        isFalling: false
    });

    // --- SYSTEMS ---
    const input = useKeyboard();
    const movement = useRef(new MovementController());
    const orientation = useCharacterOrientation(12);
    const { world, rapier } = useRapier();

    useFrame((_state, delta) => {
        if (!rigidBody.current) return;

        const inputs = input.current;
        const currentVel = rigidBody.current.linvel();
        const currentPos = rigidBody.current.translation();

        // 1. Raycast Ground Check (Visuals Only)
        const groundRay = new rapier.Ray(currentPos, { x: 0, y: -1, z: 0 });
        const groundHit = world.castRay(groundRay, 1.55, true, undefined, undefined, undefined, rigidBody.current);
        const isVisualGrounded = !!groundHit;

        // 2. Movement Update
        const movementBasis = -(cameraRotationRef?.current ?? 0);
        const {
            velocity: desiredVel,
            shouldLaunch,
            isJumping,
            isFalling,
            jumpForce
        } = movement.current.update(inputs, currentVel, movementBasis, delta);

        // 3. Wall Sliding (Deflection)
        let moveX = desiredVel[0];
        let moveZ = desiredVel[2];

        if (Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01) {
            const horizLen = Math.sqrt(moveX * moveX + moveZ * moveZ);
            const wallRayOrigin = { x: currentPos.x, y: currentPos.y + 0.5, z: currentPos.z };
            const wallRay = new rapier.Ray(wallRayOrigin, { x: moveX / horizLen, y: 0, z: moveZ / horizLen });
            const wallHit = world.castRayAndGetNormal(wallRay, 0.6, true, undefined, undefined, undefined, rigidBody.current);
            if (wallHit && wallHit.normal) {
                const dot = (moveX * wallHit.normal.x) + (moveZ * wallHit.normal.z);
                if (dot < 0) {
                    moveX -= wallHit.normal.x * dot;
                    moveZ -= wallHit.normal.z * dot;
                }
            }
        }

        // 4. DYNAMIC GRAVITY
        // Rising = 2.5 (Heavy but jumpable), Falling = 5.0 (Snappy descent)
        const newGravity = currentVel.y < 0 ? 5.0 : 2.5;

        if (currentGravityScale.current !== newGravity) {
            currentGravityScale.current = newGravity;
            rigidBody.current.setGravityScale(newGravity, true);
        }

        // 5. Apply Physics
        rigidBody.current.setLinvel({ x: moveX, y: desiredVel[1], z: moveZ }, true);

        if (shouldLaunch) {
            rigidBody.current.applyImpulse({ x: 0, y: jumpForce, z: 0 }, true);
        }

        // 6. Visuals & Animation Sync
        const isMoving = Math.abs(moveX) > 0.1 || Math.abs(moveZ) > 0.1;
        if (isMoving && visuals.current) {
            const targetAngle = Math.atan2(moveX, moveZ);
            visuals.current.quaternion.copy(orientation.update(targetAngle, delta));
        }

        animationState.current.speed = Math.sqrt(moveX * moveX + moveZ * moveZ);
        animationState.current.isGrounded = isVisualGrounded;
        animationState.current.isJumping = isJumping;
        animationState.current.isFalling = isFalling;

        // 7. NETWORK BROADCAST (15Hz)
        // We broadcast at a lower frequency than physics (60Hz) to save bandwidth.
        const now = Date.now();
        if (now - lastBroadcast.current > 60) {
            const localId = networkManager.getSocketId();
            if (localId && visuals.current) {
                // Encode Animation State for efficient network transfer
                // 0: Idle, 1: Run, 2: Jump, 3: Fall
                let animId = 0;
                if (isJumping) animId = 2;
                else if (isFalling) animId = 3;
                else if (animationState.current.speed > 0.5) animId = 1;

                networkManager.broadcast({
                    t: PacketType.PLAYER_UPDATE,
                    d: {
                        id: localId,
                        p: [currentPos.x, currentPos.y, currentPos.z],
                        q: [
                            visuals.current.quaternion.x,
                            visuals.current.quaternion.y,
                            visuals.current.quaternion.z,
                            visuals.current.quaternion.w
                        ],
                        v: [moveX, desiredVel[1], moveZ],
                        a: animId
                    }
                });
                lastBroadcast.current = now;
            }
        }
    });

    return (
        <RigidBody
            ref={ rigidBody }
            colliders={ false }
            enabledRotations={ [false, false, false] }
            position={ [0, 5, 0] }
            linearDamping={ 0 }
            friction={ 0 }
            gravityScale={ 2.5 }
        >
            <CapsuleCollider args={ [1, 0.3] } friction={ 0 } restitution={ 0 }/>
            <group ref={ visuals }>
                <CharacterModel animationState={ animationState } scale={ 0.25 }/>
            </group>
        </RigidBody>
    );
};
