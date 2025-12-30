import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3, Object3D } from 'three';
import { useRapier, type RapierRigidBody } from '@react-three/rapier'; // Added useRapier
import { CameraController, type CameraConfig } from '../mechanics/CameraSystem';

/**
 * CONFIGURATION
 * Default settings for the visual rig.
 */
const DEFAULT_CONFIG: CameraConfig = {
    minDistance: 3,
    maxDistance: 10,
    sensitivityX: 0.002,
    sensitivityY: 0.002,
    minPolarAngle: 1,
    maxPolarAngle: 2
};

interface CameraRigProps {
    /** The object the camera should follow. */
    targetRef: React.RefObject<RapierRigidBody | Object3D | null>;

    /** SHARED STATE (WRITE): Camera writes its Azimuth here. */
    rotationRef?: React.RefObject<number>;
}

/**
 * CAMERA RIG COMPONENT
 * Manages the Third-Person Camera, Orientation, and Collision.
 */
export const CameraRig = ({ targetRef, rotationRef }: CameraRigProps) => {
    // 1. LOGIC ENGINE
    const controller = useRef(new CameraController(DEFAULT_CONFIG));
    const { camera, gl } = useThree();

    // 2. PHYSICS WORLD (For Raycasting)
    const { world, rapier } = useRapier();

    // 3. INPUT LISTENERS
    useEffect(() => {
        const canvas = gl.domElement;

        const handleClick = () => canvas.requestPointerLock();

        const handleMouseMove = (e: MouseEvent) => {
            if (document.pointerLockElement === canvas) {
                controller.current.orbit(e.movementX, e.movementY);
            }
        };

        const handleWheel = (e: WheelEvent) => {
            controller.current.zoom(e.deltaY / 4);
        };

        canvas.addEventListener('click', handleClick);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('wheel', handleWheel);

        return () => {
            canvas.removeEventListener('click', handleClick);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('wheel', handleWheel);
        };
    }, [gl]);

    // 4. RENDER LOOP
    useFrame(() => {
        if (!targetRef.current) return;

        // A. Normalize Target Position
        let tPos = { x: 0, y: 0, z: 0 };
        let rigidBody: RapierRigidBody | undefined = undefined;

        // Rapier Body Check
        if ('translation' in targetRef.current && typeof targetRef.current.translation === 'function') {
            tPos = targetRef.current.translation();
            rigidBody = targetRef.current;
        }
        // Standard Mesh Check
        else if ('position' in targetRef.current) {
            // @ts-ignore
            tPos = targetRef.current.position;
        }

        // Aim at the "Head" (approx 1.5 units up)
        const lookAtTarget = new Vector3(tPos.x, tPos.y + 1.5, tPos.z);

        // B. Collision Detection (Spring Arm)
        const state = controller.current.getState();
        const direction = controller.current.getOffsetDirection(); // Normalized direction (Target -> Camera)

        // Cast a ray from the head towards the camera
        const ray = new rapier.Ray(lookAtTarget, direction);

        // We cast as far as the current zoom radius
        const maxDistance = state.radius;

        // Cast!
        // We pass 'true' for solid to hit everything.
        // We pass 'rigidBody' (the player) as the 'exclude' argument so we don't hit ourselves.
        const hit = world.castRay(
            ray,
            maxDistance,
            true,
            undefined,
            undefined,
            undefined,
            rigidBody // Exclude the player's body
        );

        let finalDistance = maxDistance;

        if (hit) {
            // If we hit a wall, place the camera slightly in front of the hit point.
            // 0.2 is a "cushion" radius to stop near-clipping plane artifacts.
            const cushion = 0.2;
            finalDistance = Math.max(0.5, hit.timeOfImpact - cushion); // Ensure we don't zoom *inside* the head (min 0.5)
        }

        // C. Apply Final Position
        // Position = Target + (Direction * FinalDistance)
        const newPos = lookAtTarget.clone().addScaledVector(direction, finalDistance);

        camera.position.copy(newPos);
        camera.lookAt(lookAtTarget);

        // D. Sync Rotation
        if (rotationRef) {
            // @ts-ignore - We are writing to the ref, RefObject is readonly by default but we are treating it as a mutable container here pattern-wise.
            rotationRef.current = controller.current.getAzimuth();
        }
    });

    return null;
};
