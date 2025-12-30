import { describe, it, expect, beforeEach } from 'vitest';
import { MovementController, type InputState } from '../src/game/mechanics/MovementSystem';

describe('MovementController Mechanics', () => {
    let controller: MovementController;

    // Mocks
    const delta = 0.016; // 16ms (approx 60fps)
    const zeroVelocity = { x: 0, y: 0, z: 0 };

    const emptyInput: InputState = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        run: false,
        crouch: false,
        jump: false
    };

    beforeEach(() => {
        controller = new MovementController();
    });

    describe('Continuous Movement (Walking/Running)', () => {
        it('returns [0, -3, 0] when no keys are pressed (-3 default gravity)', () => {
            const { velocity } = controller.update(emptyInput, zeroVelocity, 0, delta);
            expect(velocity).toEqual([0, -3, 0]);
        });

        it('moves forward along the facing angle (Z-axis)', () => {
            // Facing North (Rotation 0) -> Moving Negative Z
            const input = { ...emptyInput, forward: true };
            const { velocity } = controller.update(input, zeroVelocity, 0, delta);

            // Default Walk Speed is 6
            expect(velocity[0]).toBeCloseTo(0);
            expect(velocity[2]).toBeCloseTo(-6);
        });

        it('normalizes diagonal movement (Pythagorean check)', () => {
            // Forward + Right
            const input = { ...emptyInput, forward: true, right: true };
            const { velocity } = controller.update(input, zeroVelocity, 0, delta);

            // Magnitude should still be 6 (Walk Speed), not ~7.07
            const speed = Math.sqrt(velocity[0] ** 2 + velocity[2] ** 2);
            expect(speed).toBeCloseTo(6);
        });

        it('applies run modifier', () => {
            const input = { ...emptyInput, forward: true, run: true };
            const { velocity } = controller.update(input, zeroVelocity, 0, delta);

            // Default Run Speed is 12
            expect(velocity[2]).toBeCloseTo(-12);
        });

        it('handles rotation correctly', () => {
            // Facing East (+X)
            const input = { ...emptyInput, forward: true };
            const rotation = Math.PI / 2;

            const { velocity } = controller.update(input, zeroVelocity, rotation, delta);

            // Should move +X (East)
            expect(velocity[0]).toBeCloseTo(6);
            expect(velocity[2]).toBeCloseTo(0);
        });

        it('applies crouch speed modifier', () => {
            const input = { ...emptyInput, forward: true, crouch: true };
            const { velocity } = controller.update(input, zeroVelocity, 0, delta);

            // Default Crouch Speed is 3
            expect(velocity[2]).toBeCloseTo(-3);
        });

        it('prioritizes crouching over running', () => {
            // Holding Shift + Ctrl -> Should Crouch
            const input = { ...emptyInput, forward: true, run: true, crouch: true };
            const { velocity } = controller.update(input, zeroVelocity, 0, delta);

            expect(velocity[2]).toBeCloseTo(-3);
        });

        it('preserves existing vertical velocity (gravity)', () => {
            const fallingVelocity = { x: 0, y: -9.81, z: 0 };
            const { velocity } = controller.update(emptyInput, fallingVelocity, 0, delta);

            // X and Z are 0 (idle), but Y must remain -9.81
            expect(velocity[1]).toBe(-9.81);
        });
    });

    describe('Discrete Movement (Jumping)', () => {
        // Updated to test the Windup -> Launch flow
        const jumpInput = { ...emptyInput, jump: true };
        const groundedVel = { x: 0, y: 0, z: 0 };

        it('initiates windup (isJumping) but delays launch on first press', () => {
            const result = controller.update(jumpInput, groundedVel, 0, delta);

            expect(result.isJumping).toBe(true);   // Animation triggers
            expect(result.shouldLaunch).toBe(false); // Physics waits
            expect(result.jumpForce).toBeGreaterThan(0);
        });

        it('triggers physical launch after delay timer expires', () => {
            // 1. Start Windup
            controller.update(jumpInput, groundedVel, 0, delta);

            // 2. Fast forward time slightly past the default jumpDelay (0.5s)
            // We use 0.51s to ensure the timer hits <= 0
            const result = controller.update(jumpInput, groundedVel, 0, 0.51);

            expect(result.shouldLaunch).toBe(true);
        });

        it('does NOT jump when mid-air', () => {
            const airVel = { x: 0, y: 5, z: 0 }; // y!=0 implies air

            const result = controller.update(jumpInput, airVel, 0, delta);
            expect(result.isJumping).toBe(false);
            expect(result.shouldLaunch).toBe(false);
        });

        it('enforces cooldown after launch', () => {
            // 1. Start Windup
            controller.update(jumpInput, groundedVel, 0, delta);

            // 2. Complete Windup and Launch (0.5s windup)
            const launchFrame = controller.update(jumpInput, groundedVel, 0, 0.51);
            expect(launchFrame.shouldLaunch).toBe(true);

            // 3. Try to jump again immediately (still holding space, still grounded)
            const nextFrame = controller.update(jumpInput, groundedVel, 0, delta);

            // Should NOT trigger windup or launch because cooldown was set on launch
            expect(nextFrame.shouldLaunch).toBe(false);
            // isJumping might be true if we are technically in the air,
            // but we are simulating grounded here to test the spam-prevention.
            // If cooldown is active, a NEW jump cannot start.
        });

        it('allows jumping again after cooldown expires', () => {
            // 1. Start Windup
            controller.update(jumpInput, groundedVel, 0, delta);

            // 2. Trigger Launch (consumes delay, starts cooldown)
            controller.update(jumpInput, groundedVel, 0, 0.16);

            // 3. Fast forward past cooldown (default 0.2s)
            controller.update(emptyInput, groundedVel, 0, 0.3);

            // 4. Trigger Jump again
            const result = controller.update(jumpInput, groundedVel, 0, delta);

            // Should start a new windup sequence
            expect(result.isJumping).toBe(true);
        });
    });
});
