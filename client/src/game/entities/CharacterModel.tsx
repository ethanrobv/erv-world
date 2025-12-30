import React, { useRef, useMemo } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useGraph } from '@react-three/fiber';
import { Group } from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { usePlayerAnimation } from '../hooks/usePlayerAnimation';

interface AnimationState {
    speed: number;
    isGrounded: boolean;
    isJumping: boolean;
    isFalling: boolean;
}

interface CharacterModelProps {
    animationState: React.RefObject<AnimationState>;
    scale?: number;
}

/**
 * CHARACTER MODEL
 * Pure visual component. Renders the GLB and binds the animation system.
 * We must CLONE the GLTF scene for each player.
 * Without cloning, all players share the same mesh instance, causing
 * the model to disappear from one player and jump to the other,
 * while animations applied by Player A visually affect Player B.
 */
export const CharacterModel = ({ animationState, scale = 1 }: CharacterModelProps) => {
    const group = useRef<Group>(null);

    // 1. Load the Asset (Cached)
    const { scene, animations } = useGLTF('/models/character.glb');

    // 2. Clone the Scene (Unique instance per player)
    // SkeletonUtils.clone is required for SkinnedMeshes to retain animation capability.
    const clone = useMemo(() => {
        return SkeletonUtils.clone(scene);
    }, [scene]);

    // 3. Extract the graph from the clone
    // This allows access to individual nodes if needed, but primarily ensures
    // the clone is fully instantiated for the graph.
    const { nodes } = useGraph(clone);

    // 4. Bind Animations to the CLONE (not the original scene)
    const { actions } = useAnimations(animations, group);

    // 5. Drive Animations
    usePlayerAnimation(actions, animationState);

    return (
        <group ref={ group } dispose={ null }>
            <primitive
                object={ clone }
                // Visual offset to align model feet with Collider bottom
                position={ [0, -1.3, 0] }
                scale={ scale }
            />
        </group>
    );
};

// Preload to avoid pop-in
useGLTF.preload('/models/character.glb');
