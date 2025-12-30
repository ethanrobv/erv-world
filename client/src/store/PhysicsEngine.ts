import type { Vector3, Quaternion } from '../network/Protocol';

/**
 * Represents a discrete physics state received from the network.
 * Contains the timestamp, position, velocity, rotation (Quaternion), and animation state.
 */
export interface PhysicsSnapshot {
    timestamp: number;
    position: Vector3;
    velocity: Vector3;
    rotation: Quaternion;
    animState: number;
}

/**
 * Represents the interpolated state of an entity at a specific render time.
 */
interface InterpolatedState {
    position: Vector3;
    velocity: Vector3;
    rotation: Quaternion;
    animState: number;
}

/**
 * Core Physics Logic.
 * Handles buffering and interpolation for both Players and Networked Objects.
 * Uses linear interpolation for position/velocity and spherical linear interpolation (slerp) for rotation.
 */
export class PhysicsEngine {
    private buffer = new Map<string, PhysicsSnapshot[]>();
    private currentState = new Map<string, InterpolatedState>();

    /**
     * Pushes a new network update into the buffer for a specific entity.
     * Automatically handles out-of-order packets and buffer sizing.
     * @param id The unique network ID of the entity.
     * @param update The physics snapshot received from the server/host.
     */
    public pushUpdate(id: string, update: PhysicsSnapshot): void {
        if (!this.buffer.has(id)) {
            this.buffer.set(id, []);
        }

        const buf = this.buffer.get(id)!;

        if (buf.length > 0 && update.timestamp <= buf[buf.length - 1].timestamp) {
            return;
        }

        buf.push(update);
        if (buf.length > 10) buf.shift();
    }

    /**
     * Removes an entity and its history from the physics engine.
     * @param id The unique network ID of the entity to remove.
     */
    public removeEntity(id: string): void {
        this.buffer.delete(id);
        this.currentState.delete(id);
    }

    /**
     * Advances the physics simulation to the specified server time.
     * Calculates the interpolated state for all tracked entities.
     * @param serverTime The current estimated time of the server.
     */
    public update(serverTime: number): void {
        const renderTime = serverTime - 100;

        this.buffer.forEach((buf, id) => {
            if (buf.length === 0) return;

            if (buf.length === 1) {
                this.setState(id, buf[0]);
                return;
            }

            const nextIdx = buf.findIndex(snap => snap.timestamp > renderTime);

            if (nextIdx === -1) {
                this.setState(id, buf[buf.length - 1]);
                return;
            }

            if (nextIdx === 0) {
                this.setState(id, buf[0]);
                return;
            }

            const next = buf[nextIdx];
            const prev = buf[nextIdx - 1];

            const totalWindow = next.timestamp - prev.timestamp;
            const timeSincePrev = renderTime - prev.timestamp;
            const alpha = Math.max(0, Math.min(1, timeSincePrev / totalWindow));

            const rotA = this.validateQuaternion(prev.rotation);
            const rotB = this.validateQuaternion(next.rotation);

            const interpolatedRot = this.slerp(rotA, rotB, alpha);

            this.currentState.set(id, {
                position: this.lerpVector(prev.position, next.position, alpha),
                velocity: next.velocity,
                rotation: interpolatedRot,
                animState: next.animState
            });
        });
    }

    /**
     * Retrieves the current interpolated state for an entity.
     * @param id The unique network ID of the entity.
     * @returns The interpolated state, or undefined if the entity is not tracked.
     */
    public getState(id: string): InterpolatedState | undefined {
        return this.currentState.get(id);
    }

    /**
     * Clears all data from the physics engine.
     */
    public clear(): void {
        this.buffer.clear();
        this.currentState.clear();
    }

    /**
     * Validates that the input is a proper Quaternion array.
     * Returns an identity quaternion if validation fails.
     */
    private validateQuaternion(q: unknown): Quaternion {
        if (Array.isArray(q) && q.length === 4) {
            return q as Quaternion;
        }
        return [0, 0, 0, 1];
    }

    private setState(id: string, snap: PhysicsSnapshot) {
        this.currentState.set(id, {
            position: snap.position,
            rotation: this.validateQuaternion(snap.rotation),
            velocity: snap.velocity,
            animState: snap.animState
        });
    }

    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    private lerpVector(a: Vector3, b: Vector3, t: number): Vector3 {
        return [
            this.lerp(a[0], b[0], t),
            this.lerp(a[1], b[1], t),
            this.lerp(a[2], b[2], t)
        ];
    }

    /**
     * Spherical Linear Interpolation (SLERP) for Quaternions.
     * Provides smooth rotational transitions.
     */
    private slerp(qa: Quaternion, qb: Quaternion, t: number): Quaternion {
        let x1 = qa[0], y1 = qa[1], z1 = qa[2], w1 = qa[3];
        let x2 = qb[0], y2 = qb[1], z2 = qb[2], w2 = qb[3];

        let cosHalfTheta = w1 * w2 + x1 * x2 + y1 * y2 + z1 * z2;

        if (cosHalfTheta < 0) {
            w2 = -w2;
            x2 = -x2;
            y2 = -y2;
            z2 = -z2;
            cosHalfTheta = -cosHalfTheta;
        }

        if (cosHalfTheta >= 1.0) {
            return qa;
        }

        const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

        if (Math.abs(sinHalfTheta) < 0.001) {
            return [
                0.5 * (x1 + x2),
                0.5 * (y1 + y2),
                0.5 * (z1 + z2),
                0.5 * (w1 + w2)
            ];
        }

        const halfTheta = Math.atan2(sinHalfTheta, cosHalfTheta);
        const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
        const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

        return [
            (x1 * ratioA + x2 * ratioB),
            (y1 * ratioA + y2 * ratioB),
            (z1 * ratioA + z2 * ratioB),
            (w1 * ratioA + w2 * ratioB)
        ];
    }
}
