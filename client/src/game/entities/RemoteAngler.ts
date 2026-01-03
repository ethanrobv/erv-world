import { Scene } from 'phaser';

/**
 * Networked player entity.
 * Interpolates position and replays animation state received from host.
 */
export class RemoteAngler extends Phaser.Physics.Arcade.Sprite {
    private targetX: number;
    private targetY: number;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, 'player');

        this.setTint(0xcccccc); // Slight tint to differentiate peers

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Match hitbox with LocalAngler
        this.body?.setSize(16, 8);
        this.body?.setOffset(8, 24);

        this.targetX = x;
        this.targetY = y;

        // Default animation
        this.play('idle-down');
    }

    /**
     * Updates target state from network packet.
     * @param x World X
     * @param y World Y
     * @param anim Animation key (e.g., 'walk-up')
     * @param direction Explicit facing direction ('up', 'down', 'left', 'right')
     */
    public setTarget(x: number, y: number, anim: string, direction?: string): void {
        this.targetX = x;
        this.targetY = y;

        // 1. Try to play the specific animation key sent by the client
        if (anim && this.anims.exists(anim)) {
            this.play(anim, true);
        }
        // 2. Fallback: If no valid animation is provided (or packet drop), use direction
        // This fixes the "sliding" issue where players move without rotating
        else if (direction) {
            this.play(`idle-${ direction }`, true);
        }
    }

    update(): void {
        // Smooth movement interpolation (Linear 10%)
        this.x = Phaser.Math.Linear(this.x, this.targetX, 0.1);
        this.y = Phaser.Math.Linear(this.y, this.targetY, 0.1);

        // Depth sorting ensures correct layering behind/in-front of objects
        this.setDepth(this.y);
    }
}
