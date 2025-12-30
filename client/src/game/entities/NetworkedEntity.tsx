import React, { useRef } from 'react';
import { RigidBody, type RigidBodyProps, type RapierRigidBody } from '@react-three/rapier';
import { useNetworkObject } from '../hooks/useNetworkObject';
import { useGameStore } from '../../store/gameStore';
import { networkManager } from '../../network/NetworkManager';

interface NetworkedEntityProps extends RigidBodyProps {
    netId: string; // Unique Network Identifier
    children: React.ReactNode;
}

/**
 * A Physics Entity that synchronizes its state across the P2P network.
 * Automatically handles ownership transfer and interpolation.
 */
export const NetworkedEntity = ({ netId, children, ...rbProps }: NetworkedEntityProps) => {
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const localId = networkManager.getSocketId();

    // 1. Bind the Networking Hook
    const { isAuthority } = useNetworkObject({ netId, rigidBodyRef });

    // 2. Determine Physics Type
    // DYNAMIC: Physics are simulated locally (Gravity, Collisions apply).
    // KINEMATIC_POSITION: Physics are ignored locally; position is forced by network data.
    const bodyType = isAuthority ? 'dynamic' : 'kinematicPosition';

    // 3. Interaction Data
    // We attach this to userData so the Raycaster can read it without needing a lookup map.
    const userData = {
        ...rbProps.userData,
        netId,
        interactionType: 'PHYSICS_CLAIM' // Tag for the Player Interaction System
    };

    return (
        <RigidBody
            ref={ rigidBodyRef }
            type={ bodyType }
            // If we are not the authority, we disable sleeping so the Kinematic updates
            // are always applied, preventing the object from freezing mid-air due to lack of local forces.
            canSleep={ isAuthority }
            colliders={ isAuthority ? 'hull' : false } // Optional: Disable collision on peers if jitter occurs? Keeping strict for now.
            userData={ userData }
            { ...rbProps }
        >
            { children }
        </RigidBody>
    );
};
