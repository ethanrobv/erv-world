import { BasePlanetScene } from "@/game/scenes/BasePlanetScene";
import { isWater } from "@/game/constants/TileConfig";

/**
 * Manages the core fishing mechanic loop: Casting, Waiting, Biting, and Reeling.
 * Handles interaction with the Tilemap to ensure valid water placement.
 */
export class FishingSystem {
    private scene: BasePlanetScene;
    public isFishing: boolean = false;

    private bobber: Phaser.GameObjects.Sprite | null = null;
    private biteTimer: Phaser.Time.TimerEvent | null = null;
    private debugGraphic: Phaser.GameObjects.Rectangle | null = null;

    constructor(scene: BasePlanetScene) {
        this.scene = scene;
    }

    /**
     * Attempts to cast the fishing line in the direction the player is facing.
     * Validates that the target tile is water before proceeding.
     * @param x - The player's current X coordinate.
     * @param y - The player's current Y coordinate.
     * @param direction - Facing direction ('up', 'down', 'left', 'right').
     */
    public startCast(x: number, y: number, direction: 'up' | 'down' | 'left' | 'right'): void {
        if (this.isFishing) return;

        // Calculate target coordinate (one tile distance in front of player)
        const CAST_DISTANCE = 32;
        let targetX = x;
        let targetY = y;

        switch (direction) {
            case 'left':
                targetX -= CAST_DISTANCE;
                break;
            case 'right':
                targetX += CAST_DISTANCE;
                break;
            case 'up':
                targetY -= CAST_DISTANCE;
                break;
            case 'down':
                targetY += CAST_DISTANCE;
                break;
        }

        // Query the map for the specific tile at the target world coordinates
        const tile = this.scene.map.getTileAtWorldXY(targetX, targetY, true, this.scene.cameras.main);

        // Validate tile exists and is designated as Water
        if (tile && isWater(tile.index)) {
            this.executeCast(targetX, targetY);
        } else {
            // Visual feedback for hitting land/invalid target
            this.showDebugIndicator(targetX, targetY, 0xff0000); // Red for fail
        }
    }

    /**
     * Initializes the casting visual and starts the RNG timer for a fish bite.
     * @param x - World X coordinate for the bobber.
     * @param y - World Y coordinate for the bobber.
     */
    private executeCast(x: number, y: number): void {
        this.isFishing = true;
        this.showDebugIndicator(x, y, 0x00ff00); // Green for success

        // Spawn visual bobber
        this.bobber = this.scene.add.sprite(x, y, 'bobber');

        // Start RNG timer (2 to 5 seconds) before a bite occurs
        const delay = Phaser.Math.Between(2000, 5000);
        this.biteTimer = this.scene.time.delayedCall(delay, () => this.onBite());
    }

    /**
     * Triggered when the wait timer expires.
     * Visual feedback indicates a fish is hooked.
     */
    private onBite(): void {
        if (!this.bobber) return;

        // Simple bobbing animation to indicate a bite
        this.scene.tweens.add({
            targets: this.bobber,
            y: this.bobber.y + 5,
            duration: 100,
            yoyo: true,
            repeat: -1
        });

        // Placeholder: Logic to alert UI would go here
    }

    /**
     * Resets the fishing state, cleans up sprites, and handles catch logic if successful.
     */
    public reelIn(): void {
        if (!this.isFishing) return;

        // Cleanup visuals and timers
        if (this.bobber) {
            this.bobber.destroy();
            this.bobber = null;
        }

        if (this.biteTimer) {
            this.biteTimer.remove();
            this.biteTimer = null;
        }

        if (this.debugGraphic) {
            this.debugGraphic.destroy();
            this.debugGraphic = null;
        }

        this.isFishing = false;

        // Placeholder: Success/Fail logic based on reaction time would go here
    }

    /**
     * Renders a temporary debug square to visualize the cast target.
     * @param x - Target X
     * @param y - Target Y
     * @param color - Hex color code
     */
    private showDebugIndicator(x: number, y: number, color: number): void {
        if (this.debugGraphic) this.debugGraphic.destroy();
        this.debugGraphic = this.scene.add.rectangle(x, y, 8, 8, color);

        // Fade out debug graphic
        this.scene.tweens.add({
            targets: this.debugGraphic,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                if (this.debugGraphic) {
                    this.debugGraphic.destroy();
                    this.debugGraphic = null;
                }
            }
        });
    }
}
