import { Scene } from 'phaser';

export interface IMinigame {
    start(difficulty: number, onComplete: (success: boolean) => void): void;

    update(): void;

    destroy(): void;
}
