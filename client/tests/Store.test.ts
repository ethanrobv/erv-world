import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsEngine } from '../src/store/PhysicsEngine';
import type { Quaternion } from '../src/network/Protocol';

describe('Physics Engine Logic', () => {
    let engine: PhysicsEngine;
    const PID = 'player_A';
    const Q_ID: Quaternion = [0, 0, 0, 1]; // Identity Quaternion

    beforeEach(() => {
        engine = new PhysicsEngine();
    });

    // --- INTERPOLATION SCENARIOS ---

    it('handles single snapshot (Initial Spawn)', () => {
        // When a player first joins, we have no history to interpolate FROM.
        // We must snap directly to the single packet.
        engine.pushUpdate(PID, {
            timestamp: 100,
            position: [10, 10, 10],
            velocity: [0, 0, 0],
            rotation: Q_ID,
            animState: 0
        });

        engine.update(500); // Render time doesn't matter here

        const result = engine.getState(PID);
        expect(result).toBeDefined();
        expect(result?.position).toEqual([10, 10, 10]);
        expect(result?.animState).toBe(0);
    });

    it('interpolates strictly 50% between two snapshots', () => {
        engine.pushUpdate(PID, {
            timestamp: 100,
            position: [0, 0, 0],
            velocity: [0, 0, 0],
            rotation: Q_ID,
            animState: 0
        });
        engine.pushUpdate(PID, {
            timestamp: 200,
            position: [10, 0, 0],
            velocity: [0, 0, 0],
            rotation: Q_ID,
            animState: 0
        });

        // Logic: renderTime = serverTime - 100
        // We want renderTime = 150 (halfway). So serverTime = 250.
        engine.update(250);

        const result = engine.getState(PID);
        expect(result?.position[0]).toBeCloseTo(5);
    });

    it('interpolates rotation (Slerp) and discrete animState', () => {
        // T=100: 0 degrees, Idle (0)
        engine.pushUpdate(PID, {
            timestamp: 100,
            position: [0, 0, 0],
            velocity: [0, 0, 0],
            rotation: [0, 0, 0, 1],
            animState: 0
        });

        // T=200: 90 degrees Y, Run (1)
        // 90 deg around Y is approx [0, 0.7071, 0, 0.7071]
        engine.pushUpdate(PID, {
            timestamp: 200,
            position: [0, 0, 0],
            velocity: [0, 0, 0],
            rotation: [0, 0.70710678, 0, 0.70710678],
            animState: 1
        });

        // Render at 50% (T=150) -> Server Time 250
        engine.update(250);

        const result = engine.getState(PID);

        // 1. Check Animation (Should take 'next' value = 1)
        expect(result?.animState).toBe(1);

        // 2. Check Rotation (Slerp 50% of 90deg = 45deg)
        // 45 deg quaternion is approx [0, 0.3826, 0, 0.9238]
        expect(result?.rotation[1]).toBeCloseTo(0.3826, 2);
        expect(result?.rotation[3]).toBeCloseTo(0.9238, 2);
    });

    // --- EDGE CASES ---

    it('clamps to last known position when out of data (Extrapolation)', () => {
        // Scenario: Packet loss. We only have data up to T=100.
        engine.pushUpdate(PID, {
            timestamp: 100,
            position: [5, 5, 5],
            velocity: [0, 0, 0],
            rotation: Q_ID,
            animState: 0
        });

        // Render way in the future (Server T=1000)
        engine.update(1000);

        const result = engine.getState(PID);
        // Should NOT crash, should return last known pos
        expect(result?.position).toEqual([5, 5, 5]);
    });

    it('ignores out-of-order packets', () => {
        // 1. Receive fresh packet T=200
        engine.pushUpdate(PID, {
            timestamp: 200,
            position: [20, 0, 0],
            velocity: [0, 0, 0],
            rotation: Q_ID,
            animState: 0
        });

        // 2. Receive stale laggy packet T=100
        engine.pushUpdate(PID, {
            timestamp: 100,
            position: [10, 0, 0],
            velocity: [0, 0, 0],
            rotation: Q_ID,
            animState: 0
        });

        engine.update(250);

        // Should ignore T=100 and stick to T=200
        const result = engine.getState(PID);
        expect(result?.position[0]).toBe(20);
    });

    it('maintains buffer size limit', () => {
        // Push 15 updates. Max buffer size is 10.
        // Buffer should end up containing T=600 to T=1500.
        for (let i = 1; i <= 15; i++) {
            engine.pushUpdate(PID, {
                timestamp: i * 100,
                position: [i, 0, 0],
                velocity: [0, 0, 0],
                rotation: Q_ID,
                animState: 0
            });
        }

        // 1. Verify T=600 exists (Buffer start)
        // renderTime=650 -> ServerTime=750. Should interp between 600 and 700.
        engine.update(750);
        const result = engine.getState(PID);
        expect(result?.position[0]).toBeCloseTo(6.5);

        // 2. Verify T=100 is gone (shifted out)
        // renderTime=150 -> ServerTime=250.
        // Oldest packet is T=600. Engine should clamp to T=600 (pos 6).
        engine.update(250);
        const resultOld = engine.getState(PID);
        expect(resultOld?.position[0]).toBe(6);
    });

    it('removes entities correctly', () => {
        engine.pushUpdate(PID, {
            timestamp: 100,
            position: [0, 0, 0],
            velocity: [0, 0, 0],
            rotation: Q_ID,
            animState: 0
        });
        engine.update(200);

        expect(engine.getState(PID)).toBeDefined();

        engine.removeEntity(PID);

        expect(engine.getState(PID)).toBeUndefined();
    });
});
