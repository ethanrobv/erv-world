import type { Vector3 } from '../../network/Protocol';

/**
 * INPUT STATE
 * Represents the current status of all control inputs.
 * These are logical actions, decoupled from specific physical keys.
 */
export interface InputState {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    run: boolean;
    crouch: boolean;
    jump: boolean;
}

/**
 * MOVEMENT CONFIGURATION
 * Tuning values for player physics.
 */
export interface MovementConfig {
    walkSpeed: number;
    runSpeed: number;
    crouchSpeed: number;
    /** Upward impulse force. Tuned for ~2.5x - 5x variable gravity. */
    jumpForce: number;
    /** Downward velocity applied when grounded to prevent "floating" off ramps. */
    snapForce: number;
    /** Delay (seconds) before physical launch (windup animation time). */
    jumpDelay: number;
    /** Minimum time (seconds) between jumps. Prevents "double-fire" glitches. */
    jumpCooldown: number;
}

/**
 * MOVEMENT RESULT
 * The data packet returned by the controller every frame.
 */
export interface MovementResult {
    /** The target X/Y/Z velocity to apply to the body. */
    velocity: Vector3;
    /** If true, apply the impulse this specific frame. */
    shouldLaunch: boolean;
    /** True if in the active "Jumping" sequence (Windup or Ascent). */
    isJumping: boolean;
    /** True if airborne but NOT in a jump sequence (e.g. falling or apex). */
    isFalling: boolean;
    /** The force to apply for the jump. */
    jumpForce: number;
}

/**
 * MOVEMENT CONTROLLER
 * Manages character physics logic, state, and input filtering.
 * Enforces "tight" controls by handling state transitions explicitly.
 */
export class MovementController {
    // --- INTERNAL STATE ---
    private jumpCooldownTimer = 0;
    private jumpDelayTimer = 0;
    private isInternalJumping = false; // Tracks "Windup" phase
    private wasJumpPressed = false;    // Tracks input from previous frame (Rising Edge)

    // Latch: True only after a launch, until apex or landing.
    // Prevents errant triggers of the jumping animation.
    private isPerformingJump = false;

    // --- CONFIGURATION ---
    private config: MovementConfig = {
        walkSpeed: 6,
        runSpeed: 12,
        crouchSpeed: 3,
        jumpForce: 8,       // Balanced for tight, heavy gravity
        snapForce: -3,      // Gentle stickiness for slopes
        jumpDelay: 0.5,    // Short snappy windup
        jumpCooldown: 0.2
    };

    /**
     * Calculates the physics state for the next frame.
     */
    public update(
        input: InputState,
        currentVelocity: { x: number, y: number, z: number },
        rotationY: number,
        delta: number
    ): MovementResult {

        // --- 1. HORIZONTAL MOVEMENT ---
        let x = 0;
        let z = 0;

        if (input.forward) z -= 1;
        if (input.backward) z += 1;
        if (input.left) x -= 1;
        if (input.right) x += 1;

        if (x !== 0 || z !== 0) {
            const length = Math.sqrt(x * x + z * z);
            let speed = this.config.walkSpeed;
            if (input.crouch) speed = this.config.crouchSpeed;
            else if (input.run) speed = this.config.runSpeed;

            x = (x / length) * speed;
            z = (z / length) * speed;
        }

        const cos = Math.cos(rotationY);
        const sin = Math.sin(rotationY);
        const worldX = x * cos - z * sin;
        const worldZ = x * sin + z * cos;

        // --- 2. VERTICAL TIMERS ---
        if (this.jumpCooldownTimer > 0) this.jumpCooldownTimer -= delta;
        if (this.jumpDelayTimer > 0) this.jumpDelayTimer -= delta;

        // --- 3. PHYSICS LOGIC ---
        const isPhysicallyGrounded = Math.abs(currentVelocity.y) < 0.2;

        let shouldLaunch = false;
        let finalY = currentVelocity.y;

        // Input: Just Pressed (Rising Edge)
        const jumpJustPressed = input.jump && !this.wasJumpPressed;
        this.wasJumpPressed = input.jump;

        // A. TRIGGER WINDUP
        // Must be grounded, cooldown ready, and strictly NOT already jumping.
        if (jumpJustPressed && isPhysicallyGrounded && this.jumpCooldownTimer <= 0 && !this.isInternalJumping) {
            this.isInternalJumping = true;
            this.jumpDelayTimer = this.config.jumpDelay;
        }

        // B. TRIGGER LAUNCH
        if (this.isInternalJumping && this.jumpDelayTimer <= 0) {
            shouldLaunch = true;
            this.isInternalJumping = false;
            this.isPerformingJump = true;
            this.jumpCooldownTimer = this.config.jumpCooldown;
        }

        // C. RESET JUMP LATCH (The "Apex" Check)
        // If we are falling (negative Y) or have landed, the active upward jump phase is over.
        if (this.isPerformingJump) {
            if (currentVelocity.y < 0 || (isPhysicallyGrounded && this.jumpCooldownTimer <= 0)) {
                this.isPerformingJump = false;
            }
        }

        // D. SNAP TO GROUND
        // Prevents micro-airtime on ramps.
        if (isPhysicallyGrounded && !this.isInternalJumping && !shouldLaunch && !this.isPerformingJump) {
            if (currentVelocity.y > -2) {
                finalY = this.config.snapForce;
            }
        }

        // --- 4. STATE RESOLUTION ---

        // IS JUMPING:
        // Strictly true ONLY if we are in the Windup phase OR the Active Jump Latch is engaged.
        // Walking up a ramp (Velocity Y > 0) will NOT trigger this because isPerformingJump remains false.
        const isJumping = this.isInternalJumping || this.isPerformingJump;

        // IS FALLING:
        // Airborne, NOT Jumping, and NOT in the initial launch cooldown buffer.
        // The buffer check prevents a 1-frame "Fall" flicker right at the moment of impulse.
        const isFalling = !isPhysicallyGrounded && !isJumping && this.jumpCooldownTimer <= 0;

        return {
            velocity: [worldX, finalY, worldZ],
            shouldLaunch,
            isJumping,
            isFalling,
            jumpForce: this.config.jumpForce
        };
    }
}
