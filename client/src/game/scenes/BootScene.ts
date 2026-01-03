import { Scene } from 'phaser';
import { TextureExtruder } from '../utils/TextureExtruder';
import { useGameStore } from '@/lib/stores/useGameStore';
import { NetworkManager } from '@/game/systems/network/NetworkManager';

export class BootScene extends Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Load the sprite sheet
        this.load.spritesheet('player', 'assets/game/player.png', {
            frameWidth: 32,
            frameHeight: 32
        });

        // Load the RAW tileset
        this.load.image('tiles-raw', 'assets/game/tiles.png');
        this.load.image('bobber', 'assets/game/bobber.png');
    }

    create() {
        // 1. REGISTER GAME INSTANCE
        // Critical: Allows NetworkManager to access active scenes for State Sync snapshots.
        // Without this, the Host cannot send player positions to joining clients.
        NetworkManager.getInstance().setGame(this.game);

        // 2. GENERATE EXTRUDED TEXTURE
        // This adds a 1px safety border around tiles to prevent "black lines" (bleeding)
        // when the camera moves. New key: 'tiles-extruded'.
        TextureExtruder.extrude(this, 'tiles-raw', 32, 32, 'tiles-extruded');

        // 3. CREATE ANIMATIONS
        this.createPlayerAnimations();

        // 4. START GAME WORLD
        // Dynamically load the scene that matches the Store's current state.
        // This ensures Clients load directly into the correct planet (e.g. Mars)
        // if the host is already there, rather than loading Earth and then warping.
        const currentPlanet = useGameStore.getState().currentPlanet;
        const targetScene = currentPlanet.charAt(0).toUpperCase() + currentPlanet.slice(1) + 'Scene';

        console.log(`[BootScene] Booting straight to: ${ targetScene }`);
        this.scene.start(targetScene);
    }

    private createPlayerAnimations() {
        // South
        this.anims.create({
            key: 'idle-down',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 6 }),
            frameRate: 8,
            repeat: -1
        });
        this.anims.create({
            key: 'walk-down',
            frames: this.anims.generateFrameNumbers('player', { start: 7, end: 12 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'run-down',
            frames: this.anims.generateFrameNumbers('player', { start: 13, end: 20 }),
            frameRate: 12,
            repeat: -1
        });

        // East
        this.anims.create({
            key: 'idle-right',
            frames: [{ key: 'player', frame: 21 }],
            frameRate: 10
        });
        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('player', { start: 22, end: 26 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'run-right',
            frames: this.anims.generateFrameNumbers('player', { start: 27, end: 36 }),
            frameRate: 12,
            repeat: -1
        });

        // North
        this.anims.create({
            key: 'idle-up',
            frames: [{ key: 'player', frame: 37 }],
            frameRate: 10
        });
        this.anims.create({
            key: 'walk-up',
            frames: this.anims.generateFrameNumbers('player', { start: 38, end: 44 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'run-up',
            frames: this.anims.generateFrameNumbers('player', { start: 45, end: 49 }),
            frameRate: 12,
            repeat: -1
        });

        // West
        this.anims.create({
            key: 'idle-left',
            frames: [{ key: 'player', frame: 50 }],
            frameRate: 10
        });
        this.anims.create({
            key: 'walk-left',
            frames: this.anims.generateFrameNumbers('player', { start: 51, end: 57 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'run-left',
            frames: this.anims.generateFrameNumbers('player', { start: 58, end: 65 }),
            frameRate: 12,
            repeat: -1
        });
    }
}
