import { Types } from 'phaser';
import { BootScene } from './scenes/BootScene';
import { EarthScene } from './scenes/EarthScene';
import { MarsScene } from './scenes/MarsScene';

export const gameConfig: Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            fps: 60,
            gravity: { y: 0, x: 0 },
            debug: false
        }
    },
    render: {
        pixelArt: true,
        antialias: false,
        roundPixels: true,
        batchSize: 512
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, EarthScene, MarsScene],
};
