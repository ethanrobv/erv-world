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

    // Spawn Point Configuration
    const SPAWN_POINT = { x: 0, y: 10, z: 0 };
    const WATER_LEVEL = -1.0;

    useFrame((_state, delta) => {
        if (!rigidBody.current) return;

        const inputs = input.current;
        const currentVel = rigidBody.current.linvel();
        const currentPos = rigidBody.current.translation();

        // 0. WATER CHECK / RESPAWN SYSTEM
        // If player touches water or falls off map, reset immediately.
        if (currentPos.y < WATER_LEVEL) {
            rigidBody.current.setTranslation(SPAWN_POINT, true);
            rigidBody.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
            return; // Skip rest of frame to prevent physics glitches
        }

        // 1. Raycast Ground Check
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

        // 3. Wall Sliding
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

        // 4. Dynamic Gravity
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

        // 6. Visuals
        const isMoving = Math.abs(moveX) > 0.1 || Math.abs(moveZ) > 0.1;
        if (isMoving && visuals.current) {
            const targetAngle = Math.atan2(moveX, moveZ);
            visuals.current.quaternion.copy(orientation.update(targetAngle, delta));
        }

        animationState.current.speed = Math.sqrt(moveX * moveX + moveZ * moveZ);
        animationState.current.isGrounded = isVisualGrounded;
        animationState.current.isJumping = isJumping;
        animationState.current.isFalling = isFalling;

        // 7. Network Broadcast (15Hz)
        const now = Date.now();
        if (now - lastBroadcast.current > 60) {
            const localId = networkManager.getSocketId();
            if (localId && visuals.current) {
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
            position={ [0, 10, 0] } // Default spawn height updated to match Logic
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
