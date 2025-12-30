import { useFrame } from '@react-three/fiber';
import { updateInterpolation } from '../../store/gameStore';

/**
 * NETWORK SYNC SYSTEM
 * This component acts as the "Heartbeat" for the multiplayer interpolation.
 * It ticks the PhysicsEngine every frame so that getInterpolatedEntity()
 * returns fresh data for RemotePlayer.tsx and NetworkedEntity.tsx.
 */
export const NetworkSync = () => {
    useFrame(() => {
        // We use Date.now() to sync with the timestamps generated in NetworkManager.
        // In a production environment with server-authoritative logic,
        // this would use a synchronized server time clock.
        updateInterpolation(Date.now());
    });

    return null;
};
