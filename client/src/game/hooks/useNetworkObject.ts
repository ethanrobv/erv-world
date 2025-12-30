import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RapierRigidBody } from '@react-three/rapier';
import { useGameStore, getInterpolatedEntity } from '../../store/gameStore';
import { networkManager } from '../../network/NetworkManager';
import { PacketType, type Quaternion, type Vector3 } from '../../network/Protocol';

interface UseNetworkObjectProps {
    netId: string;
    rigidBodyRef: React.RefObject<RapierRigidBody | null>;
}

/**
 * Manages the networking logic for a single physics entity.
 * Handles Authority Switching, Position Interpolation, and Network Broadcasting.
 */
export const useNetworkObject = ({ netId, rigidBodyRef }: UseNetworkObjectProps) => {
    // We use a ref for the owner ID to avoid re-subscribing the loop constantly.
    const ownerIdRef = useRef<string | null>(null);
    const localId = networkManager.getSocketId();

    // Throttling State
    const lastBroadcast = useRef<number>(0);
    const BROADCAST_RATE = 60; // ms (approx 15Hz)

    // Sync Ownership changes from Store to Ref
    useEffect(() => {
        return useGameStore.subscribe(
            (state) => state.objectRegistry[netId],
            (newOwner) => {
                ownerIdRef.current = newOwner || null; // Null implies Host/Server

                // WAKE UP: When ownership changes, we must wake the body
                // to ensure physics takes over immediately if we just became owner.
                if (rigidBodyRef.current) {
                    rigidBodyRef.current.wakeUp();
                }
            }
        );
    }, [netId, rigidBodyRef]);

    useFrame(() => {
        if (!rigidBodyRef.current || !localId) return;

        const owner = ownerIdRef.current;
        const isOwner = owner === localId;
        const isHost = !owner && useGameStore.getState().players.find(p => p.id === localId)?.isHost;

        // ---------------------------------------------------------------------
        // MODE A: AUTHORITY (I am simulating this object)
        // ---------------------------------------------------------------------
        if (isOwner || isHost) {
            const now = Date.now();
            if (now - lastBroadcast.current > BROADCAST_RATE) {
                const translation = rigidBodyRef.current.translation();
                const rotation = rigidBodyRef.current.rotation();
                const linvel = rigidBodyRef.current.linvel();

                // Optimization: Sleep Check
                // If the object is barely moving, don't flood the network.
                const speed = linvel.x * linvel.x + linvel.y * linvel.y + linvel.z * linvel.z;
                if (speed > 0.001) {
                    networkManager.broadcast({
                        t: PacketType.OBJECT_UPDATE,
                        d: {
                            id: netId,
                            p: [translation.x, translation.y, translation.z] as Vector3,
                            q: [rotation.x, rotation.y, rotation.z, rotation.w] as Quaternion,
                            v: [linvel.x, linvel.y, linvel.z] as Vector3
                        }
                    });
                    lastBroadcast.current = now;
                }
            }
        }

            // ---------------------------------------------------------------------
            // MODE B: REPLICA (I am interpolating someone else's simulation)
        // ---------------------------------------------------------------------
        else {
            const snapshot = getInterpolatedEntity(netId);
            if (snapshot) {
                // Kinematic Teleport
                // We use setNextKinematicTranslation to move it smoothly in the physics world
                // without applying forces that would fight the interpolation.
                rigidBodyRef.current.setNextKinematicTranslation(
                    new THREE.Vector3(...snapshot.position)
                );

                // Handle Quaternion Rotation
                if (Array.isArray(snapshot.rotation)) {
                    const [x, y, z, w] = snapshot.rotation;
                    rigidBodyRef.current.setNextKinematicRotation(
                        new THREE.Quaternion(x, y, z, w)
                    );
                }
            }
        }
    });

    return {
        // Expose isOwner so the component can switch the Body Type (Dynamic vs Kinematic)
        isAuthority: ownerIdRef.current === localId || (!ownerIdRef.current && useGameStore.getState().players.find(p => p.id === localId)?.isHost)
    };
};

import * as THREE from 'three'; // Required for Vector3/Quaternion object creation
