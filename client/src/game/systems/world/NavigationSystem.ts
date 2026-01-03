import { Scene } from 'phaser';
import { GameEvents } from '@/game/core/GameEvents';
import { useGameStore } from '@/lib/stores/useGameStore';

/**
 * Handles scene transitions and planetary warping.
 * Listens for global WARP_COMMAND events from the Network or HUD.
 */
export class NavigationSystem {
    private scene: Scene;
    private readonly onWarpContext: (pkt: any) => void;

    constructor(scene: Scene) {
        this.scene = scene;

        // Bind the handler so we can reference it for removal later
        this.onWarpContext = (pkt: any) => this.warp(pkt.planetId);

        // Listen for global warp commands
        GameEvents.on('WARP_COMMAND', this.onWarpContext);

        // CLEANUP: Important! Remove listener when scene destroys to prevent duplicates
        this.scene.events.once('shutdown', () => {
            GameEvents.off('WARP_COMMAND', this.onWarpContext);
        });
    }

    /**
     * Executes the visual transition and scene swap.
     * @param planetId - The target scene key suffix (e.g. 'mars' -> 'MarsScene').
     */
    private warp(planetId: string) {
        // Construct the Phaser Scene Key (e.g., 'earth' -> 'EarthScene')
        const key = planetId.charAt(0).toUpperCase() + planetId.slice(1) + 'Scene';

        console.log(`[Navigation] Warping to: ${ key }`);

        // Update the Global Store UI immediately so the HUD reflects the change
        useGameStore.getState().setCurrentPlanet(planetId);

        // Visual Transition
        this.scene.cameras.main.fadeOut(500, 0, 0, 0);

        this.scene.cameras.main.once('camerafadeoutcomplete', () => {
            // Stop current scene and start new one
            this.scene.scene.start(key);
        });
    }
}
