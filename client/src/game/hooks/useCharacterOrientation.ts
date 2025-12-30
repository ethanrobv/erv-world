import { useRef } from 'react';
import { Quaternion, Vector3 } from 'three';

/**
 * Hook to handle smooth character rotation.
 * Solves the "Angle Wrap" problem (e.g. going from 350 -> 10 degrees)
 * using Quaternion Slerp (Spherical Linear Interpolation).
 *
 * @param turnSpeed - How fast the character turns (radians per second approx).
 */
export const useCharacterOrientation = (turnSpeed: number = 8) => {
    // 1. Persistent State
    // We use Refs to store mutable Three.js objects to avoid Garbage Collection churn.
    const currentQuat = useRef(new Quaternion()); // Current rotation
    const targetQuat = useRef(new Quaternion());  // Where we want to look
    const upAxis = new Vector3(0, 1, 0);          // Axis of rotation (Y-axis)

    /**
     * Calculates the smoothed rotation for the current frame.
     * @param targetHeading - The desired Y-axis rotation angle (in radians).
     * @param delta - Time since last frame (in seconds).
     * @returns A Quaternion representing the new smoothed rotation.
     */
    const update = (targetHeading: number, delta: number): Quaternion => {
        // 1. Create Target Quaternion from the desired Angle
        targetQuat.current.setFromAxisAngle(upAxis, targetHeading);

        // 2. Calculate Interpolation Step (t)
        // t = speed * delta. We clamp it to 1.0 to prevent overshooting.
        const t = Math.min(1, delta * turnSpeed);

        // 3. Slerp (Rotate current towards target)
        // Three.js handles the "shortest path" math automatically here.
        currentQuat.current.slerp(targetQuat.current, t);

        return currentQuat.current;
    };

    return {
        update,
        // Expose current ref if we need to force-set rotation (e.g. teleporting)
        current: currentQuat
    };
};
