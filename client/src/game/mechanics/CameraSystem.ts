import { Vector3 } from 'three';

/**
 * CONFIGURATION
 * Defines the limits and sensitivity of the camera.
 */
export interface CameraConfig {
    /** Closest the camera can get to the target (prevents clipping inside player). */
    minDistance: number;
    /** Furthest the camera can zoom out. */
    maxDistance: number;
    /** Horizontal rotation speed (Mouse X). */
    sensitivityX: number;
    /** Vertical rotation speed (Mouse Y). */
    sensitivityY: number;
    /** Upper vertical limit (radians). Prevents Gimbal Lock at the north pole. */
    minPolarAngle: number;
    /** Lower vertical limit (radians). Prevents going underground/through the south pole. */
    maxPolarAngle: number;
}

/**
 * STATE
 * Represents the camera's position in Spherical Coordinates.
 */
export interface CameraState {
    radius: number; // Distance from target
    theta: number;  // Azimuth (Horizontal angle around Y-axis)
    phi: number;    // Polar (Vertical angle from Y-axis down)
}

/**
 * CAMERA CONTROLLER
 * Pure logic class for Third-Person Camera mechanics.
 */
export class CameraController {
    private state: CameraState;
    private config: CameraConfig;

    // Reusable vector to prevent Garbage Collection churn during the render loop
    private resultVector: Vector3 = new Vector3();

    constructor(config: CameraConfig) {
        this.config = config;
        this.state = {
            radius: (config.minDistance + config.maxDistance) / 2,
            theta: 0,
            phi: Math.PI / 3
        };
    }

    public getState(): CameraState {
        return { ...this.state };
    }

    /**
     * Updates the internal angles based on input deltas (Mouse Movement).
     */
    public orbit(deltaX: number, deltaY: number): void {
        this.state.theta -= deltaX * this.config.sensitivityX;
        this.state.phi += deltaY * this.config.sensitivityY;

        // Clamp Vertical Angle
        this.state.phi = Math.max(
            this.config.minPolarAngle,
            Math.min(this.config.maxPolarAngle, this.state.phi)
        );
    }

    /**
     * Updates the zoom level based on scroll input.
     */
    public zoom(delta: number): void {
        const zoomSpeed = 0.1;
        this.state.radius += delta * zoomSpeed;
        this.state.radius = Math.max(
            this.config.minDistance,
            Math.min(this.config.maxDistance, this.state.radius)
        );
    }

    public setSpherical(radius: number, theta: number, phi: number): void {
        this.state = { radius, theta, phi };
    }

    /**
     * Calculates the Unit Vector pointing from the Target TO the Camera.
     * Used for raycasting (Collision Detection).
     */
    public getOffsetDirection(): Vector3 {
        const { theta, phi } = this.state;

        // Spherical -> Cartesian Unit Vector
        const x = Math.sin(phi) * Math.sin(theta);
        const y = Math.cos(phi);
        const z = Math.sin(phi) * Math.cos(theta);

        // We update our reusable vector to avoid GC
        return this.resultVector.set(x, y, z);
    }

    /**
     * Converts the internal Spherical state into a Cartesian World Position.
     */
    public calculatePosition(target: { x: number, y: number, z: number }): Vector3 {
        const { radius } = this.state;

        // Reuse the direction logic
        const offset = this.getOffsetDirection();

        // Position = Target + (Direction * Radius)
        this.resultVector.set(
            target.x + (offset.x * radius),
            target.y + (offset.y * radius),
            target.z + (offset.z * radius)
        );

        return this.resultVector;
    }

    public getAzimuth(): number {
        return this.state.theta;
    }
}
