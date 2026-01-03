import { Scene } from 'phaser';
import { FishingSystem } from '../systems/fishing/FishingSystem';
import { NetworkManager } from '../systems/network/NetworkManager';
import { PacketType } from '../systems/network/PacketTypes';
import { useGameStore } from '@/lib/stores/useGameStore';
import { GameEvents } from '@/game/core/GameEvents';

/**
 * Local player entity.
 * Handles 4-directional movement input, animation state management, and fishing interaction.
 */
export class LocalAngler extends Phaser.Physics.Arcade.Sprite {
    private keys: any;
    private fishingSystem: FishingSystem;
    private spaceKey: Phaser.Input.Keyboard.Key;

    // State Tracking
    private lastSendTime: number = 0;
    private readonly SEND_INTERVAL = 50;
    private currentDir: 'up' | 'down' | 'left' | 'right' = 'down';

    constructor(scene: Scene, x: number, y: number, fishingSystem: FishingSystem) {
        super(scene, x, y, 'player');
        this.fishingSystem = fishingSystem;

        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);

        // Feet-based hitbox for depth perception
        this.body?.setSize(16, 8);
        this.body?.setOffset(8, 24);

        this.keys = scene.input.keyboard?.addKeys('W,A,S,D');
        this.spaceKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Start idle
        this.play('idle-down');
    }

    /**
     * Main update loop processed every frame.
     * Handles movement input, fishing triggers, and network synchronization.
     */
    update(): void {
        if (!this.keys) return;

        this.setVelocity(0);

        // Block movement during fishing actions
        if (this.fishingSystem.isFishing) {
            if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
                this.fishingSystem.reelIn();
            }
            return;
        }

        let vx = 0;
        let vy = 0;
        let moved = false;

        // Input Handling
        if (this.keys.A.isDown) vx = -100;
        else if (this.keys.D.isDown) vx = 100;

        if (this.keys.W.isDown) vy = -100;
        else if (this.keys.S.isDown) vy = 100;

        // Apply Velocity
        this.setVelocity(vx, vy);
        if (this.body?.velocity) {
            this.body.velocity.normalize().scale(100);
        }

        // Animation & Direction Logic
        if (vx !== 0 || vy !== 0) {
            moved = true;

            // Prioritize horizontal facing if moving diagonally
            if (vy > 0) this.currentDir = 'down';
            else if (vy < 0) this.currentDir = 'up';

            if (vx > 0) this.currentDir = 'right';
            else if (vx < 0) this.currentDir = 'left';

            this.play(`walk-${ this.currentDir }`, true);
        } else {
            this.play(`idle-${ this.currentDir }`, true);
        }

        // Fishing Trigger
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.fishingSystem.startCast(this.x, this.y, this.currentDir);
        }

        // Update UI (Minimap) - Emit every frame if moving
        // We use a separate event from the network packet to ensure the local UI is smooth (60fps)
        // even if the network sync is throttled (20fps).
        if (moved) {
            GameEvents.emit('LOCAL_MOVE', { x: this.x, y: this.y });
        }

        // Network Sync
        const now = Date.now();
        if ((moved || now - this.lastSendTime > 1000) && now - this.lastSendTime > this.SEND_INTERVAL) {
            const animKey = this.anims.currentAnim?.key || `idle-${ this.currentDir }`;
            this.broadcastPosition(animKey);
            this.lastSendTime = now;
        }
    }

    /**
     * Broadcasts the player's current position and animation state to the network.
     * Includes the current planet ID to prevent "ghosts" on other planets.
     * @param anim - The key of the current animation being played.
     */
    private broadcastPosition(anim: string): void {
        const store = useGameStore.getState();
        const username = store.username;
        const currentPlanet = store.currentPlanet;

        NetworkManager.getInstance().send({
            type: PacketType.PLAYER_MOVE,
            x: this.x,
            y: this.y,
            anim: anim,
            direction: this.currentDir,
            planetId: currentPlanet,
            username: username
        });
    }
}
