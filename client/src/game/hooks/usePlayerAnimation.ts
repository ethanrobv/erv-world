import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AnimationAction, LoopOnce, LoopRepeat } from 'three';

type ActionName = 'Idle' | 'Running' | 'Jumping' | 'Falling';
type AnimationMap = Record<string, AnimationAction | null>;

interface AnimationState {
    speed: number;
    isGrounded: boolean;
    isJumping: boolean;
    isFalling: boolean;
}

export const usePlayerAnimation = (
    actions: AnimationMap,
    stateRef: React.RefObject<AnimationState>
) => {
    const currentAction = useRef<AnimationAction | null>(null);
    const lastState = useRef<ActionName | null>(null); // Track last state to prevent jitter/resets

    const crossFadeDuration = 0.2;

    useEffect(() => {
        return () => {
            Object.values(actions).forEach(action => action?.stop());
        };
    }, [actions]);

    useFrame(() => {
        if (!stateRef.current) return;

        const { speed, isGrounded, isJumping } = stateRef.current;

        // --- 1. PRIORITY LOGIC ---
        let targetName: ActionName = 'Idle';

        if (isJumping) {
            // PRIORITY 1: JUMPING
            // Catches the "Windup" phase even while still on the ground.
            targetName = 'Jumping';
        } else if (!isGrounded) {
            // PRIORITY 2: AIRBORNE (FALLING)
            // If we aren't jumping but are in the air (Raycast check), we are falling.
            // This handles the Apex smoothly because Raycast is stable even at 0 velocity.
            targetName = 'Falling';
        } else if (speed > 0.5) {
            // PRIORITY 3: MOVING
            targetName = 'Running';
        }

        // --- 2. TRANSITION SYSTEM ---
        // Only run transition logic if the state has genuinely changed
        if (lastState.current !== targetName) {
            const newAction = actions[targetName];
            const prevAction = currentAction.current;

            if (newAction) {
                // Setup new action
                newAction.reset();
                newAction.play();

                // Loop Configuration
                if (targetName === 'Jumping' || targetName === 'Falling') {
                    newAction.setLoop(LoopOnce, 1);
                    newAction.clampWhenFinished = true;
                } else {
                    newAction.setLoop(LoopRepeat, Infinity);
                    newAction.clampWhenFinished = false;
                }

                // Smooth Crossfade
                if (prevAction) {
                    prevAction.crossFadeTo(newAction, crossFadeDuration, true);
                } else {
                    newAction.fadeIn(crossFadeDuration);
                }

                currentAction.current = newAction;
            }

            lastState.current = targetName;
        }
    });
};
