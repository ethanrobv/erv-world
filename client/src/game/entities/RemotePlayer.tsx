import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { CharacterModel } from './CharacterModel';
import { getInterpolatedEntity } from '../../store/gameStore';

interface RemotePlayerProps {
    id: string;
}

/**
 * Renders a remote peer's avatar.
 * Interpolates position/rotation from the PhysicsEngine and drives animation state.
 */
export const RemotePlayer = ({ id }: RemotePlayerProps) => {
    const group = useRef<Group>(null);

    // Mock animation state to feed into the shared CharacterModel
    const animationState = useRef({
        speed: 0,
        isGrounded: true,
        isJumping: false,
        isFalling: false
    });

    useFrame((_state, _delta) => {
        if (!group.current) return;

        const snapshot = getInterpolatedEntity(id);
        if (!snapshot) return;

        // 1. Apply Position
        group.current.position.set(
            snapshot.position[0],
            snapshot.position[1],
            snapshot.position[2]
        );

        // 2. Apply Rotation (Quaternion)
        if (Array.isArray(snapshot.rotation)) {
            const [x, y, z, w] = snapshot.rotation;
            group.current.quaternion.set(x, y, z, w);
        }

        // 3. Apply Explicit Animation State
        // 0: Idle, 1: Run, 2: Jump, 3: Fall
        const anim = snapshot.animState;

        // Force the flags that trigger the correct animation in CharacterModel
        animationState.current.speed = (anim === 1) ? 1.0 : 0.0;
        animationState.current.isJumping = (anim === 2);
        animationState.current.isFalling = (anim === 3);
        animationState.current.isGrounded = (anim !== 2 && anim !== 3);
    });

    return (
        <group ref={ group }>
            {/* Reuse the exact same model component */ }
            <CharacterModel animationState={ animationState } scale={ 0.25 }/>

            {/* Optional: Add Username Tag here later */ }
        </group>
    );
};
