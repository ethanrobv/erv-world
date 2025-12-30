import { describe, it, expect, beforeEach } from 'vitest';
import { CameraController, type CameraConfig } from '../src/game/mechanics/CameraSystem';

describe('CameraController Logic', () => {
    let camera: CameraController;

    // Default configuration for consistent testing
    const config: CameraConfig = {
        minDistance: 2,
        maxDistance: 10,
        sensitivityX: 0.01,
        sensitivityY: 0.01,
        minPolarAngle: 0.1,    // Near top pole
        maxPolarAngle: Math.PI - 0.1 // Near bottom pole
    };

    beforeEach(() => {
        camera = new CameraController(config);
    });

    // --- EXISTING TESTS (PRESERVED) ---

    it('initializes with default spherical coordinates', () => {
        const state = camera.getState();
        expect(state.radius).toBeGreaterThan(0);
        expect(state.theta).toBe(0);
    });

    it('orbits horizontally (Azimuth/Theta) based on input X', () => {
        const initialTheta = camera.getState().theta;
        camera.orbit(100, 0);
        const newTheta = camera.getState().theta;
        expect(newTheta).toBeCloseTo(initialTheta - (100 * config.sensitivityX));
    });

    it('orbits vertically (Polar/Phi) based on input Y', () => {
        const initialPhi = camera.getState().phi;
        camera.orbit(0, 100);
        const newPhi = camera.getState().phi;
        expect(newPhi).toBeCloseTo(initialPhi + (100 * config.sensitivityY));
    });

    it('clamps vertical rotation to prevent flipping upside down', () => {
        camera.orbit(0, -10000);
        expect(camera.getState().phi).toBeGreaterThanOrEqual(config.minPolarAngle);

        camera.orbit(0, 10000);
        expect(camera.getState().phi).toBeLessThanOrEqual(config.maxPolarAngle);
    });

    it('zooms within min/max distance limits', () => {
        camera.zoom(100);
        expect(camera.getState().radius).toBe(config.maxDistance);
        camera.zoom(-100);
        expect(camera.getState().radius).toBe(config.minDistance);
    });

    it('calculates the correct Cartesian position (Spherical -> World)', () => {
        camera.setSpherical(5, Math.PI / 2, Math.PI / 2);
        const target = { x: 0, y: 0, z: 0 };
        const position = camera.calculatePosition(target);

        expect(position.x).toBeCloseTo(5);
        expect(position.y).toBeCloseTo(0);
        expect(position.z).toBeCloseTo(0);
    });

    // --- NEW TESTS (COLLISION LOGIC) ---

    it('calculates the collision ray direction correctly', () => {
        // 1. Reset camera to known state: South (+Z), Flat (Horizon)
        camera.setSpherical(5, 0, Math.PI / 2);

        // 2. Get the direction unit vector (Target -> Camera)
        const dir = camera.getOffsetDirection();

        // 3. Verify Math
        // At Theta=0, Phi=90deg, we expect to point down +Z axis.
        expect(dir.x).toBeCloseTo(0);
        expect(dir.y).toBeCloseTo(0);
        expect(dir.z).toBeCloseTo(1);

        // 4. Verify Normalization (Length should be 1)
        expect(Math.abs(dir.length() - 1)).toBeLessThan(0.001);
    });

    it('offsets the final world position by the target location', () => {
        // Camera at (0, 0, 5) relative to origin
        camera.setSpherical(5, 0, Math.PI / 2);

        // Target is NOT at origin
        const target = { x: 10, y: 10, z: 10 };
        const pos = camera.calculatePosition(target);

        // Final Pos should be Target (10,10,10) + Offset (0,0,5)
        expect(pos.x).toBeCloseTo(10);
        expect(pos.y).toBeCloseTo(10);
        expect(pos.z).toBeCloseTo(15);
    });
});
