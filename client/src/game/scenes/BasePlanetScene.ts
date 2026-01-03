import { Scene } from 'phaser';
import { LocalAngler } from '../entities/LocalAngler';
import { RemoteAngler } from '../entities/RemoteAngler';
import { TimeSystem } from '../systems/world/TimeSystem';
import { NavigationSystem } from '../systems/world/NavigationSystem';
import { GameEvents } from '../core/GameEvents';
import { FishingSystem } from '../systems/fishing/FishingSystem';
import { PlayerMovePacket } from '../systems/network/PacketTypes';
import { useGameStore } from '@/lib/stores/useGameStore';
import { MapGenerator } from '../systems/world/MapGenerator';
import { TILE_IDS, isWater } from '../constants/TileConfig';
import { NetworkManager } from '../systems/network/NetworkManager';

/**
 * Abstract base scene managing the core planetary environment.
 * Handles procedural map generation, player spawning, networking events, and system initialization.
 */
export abstract class BasePlanetScene extends Scene {
    // Public access required for NetworkManager to generate Sync Snapshots
    public player!: LocalAngler;
    public remotePlayers: Map<string, RemoteAngler> = new Map();

    // Core Systems
    protected timeSystem: TimeSystem;
    protected navSystem!: NavigationSystem;
    protected fishingSystem!: FishingSystem;
    protected mapGenerator!: MapGenerator;

    public map!: Phaser.Tilemaps.Tilemap;

    // Group for depth-sorted entities (players, NPCs)
    protected entitiesGroup!: Phaser.GameObjects.Group;

    protected abstract get planetId(): string;

    protected constructor(key: string) {
        super(key);
        this.timeSystem = new TimeSystem();
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Initializes the scene, including map generation, physics boundaries, and camera setup.
     */
    create(): void {
        console.log(`[BasePlanetScene] Generating planet: ${ this.planetId }`);
        const store = useGameStore.getState();

        // 1. Map Generation (Deterministic)
        // Pass the Global Seed to the generator so all clients build the same map
        this.mapGenerator = new MapGenerator(this, store.worldSeed);
        const mapWidth = 25;
        const mapHeight = 20;
        const rawMapData = this.mapGenerator.generateMap(mapWidth, mapHeight, this.planetId as 'earth' | 'mars');

        const widthInPixels = mapWidth * 32;
        const heightInPixels = mapHeight * 32;

        // 2. Physics Bounds
        // We inset the bounds to ensure the player sprite stays fully visible.
        const insetTop = 24;
        const insetSide = 8;

        this.physics.world.setBounds(
            insetSide,
            insetTop,
            widthInPixels - (insetSide * 2),
            heightInPixels - insetTop
        );

        // 3. Tilemap
        this.map = this.make.tilemap({
            data: rawMapData,
            tileWidth: 32,
            tileHeight: 32,
            width: mapWidth,
            height: mapHeight
        });

        // Use the extruded tileset generated in BootScene to prevent texture bleeding
        const tileset = this.map.addTilesetImage('StandardTileset', 'tiles-extruded', 32, 32, 1, 2);

        if (!tileset) {
            console.error('Failed to load tileset. Check BootScene.');
            return;
        }

        const groundLayer = this.map.createLayer(0, tileset, 0, 0);

        if (groundLayer) {
            groundLayer.setName('Ground');

            // Define collision for all water variants
            groundLayer.setCollision([
                TILE_IDS.WATER_A,
                TILE_IDS.WATER_B,
                TILE_IDS.WATER_C,
                TILE_IDS.WATER_D
            ]);

            groundLayer.setDepth(0);
        }

        // 4. Entities
        this.entitiesGroup = this.add.group({ runChildUpdate: true });
        this.fishingSystem = new FishingSystem(this);
        this.navSystem = new NavigationSystem(this);
        this.timeSystem.setPlanet(this.planetId);

        // 5. Spawn Player
        const spawn = this.findSafeSpawn(rawMapData, mapWidth, mapHeight);
        this.player = new LocalAngler(this, spawn.x * 32, spawn.y * 32, this.fishingSystem);
        this.entitiesGroup.add(this.player);

        this.player.setCollideWorldBounds(true);
        if (groundLayer) {
            this.physics.add.collider(this.player, groundLayer);
        }

        // 6. Spawn Existing Remote Players
        // Iterate through the store and spawn any players that were synced during the lobby phase.
        // We filter by planetId to ensure we don't spawn players located on other worlds.
        const myPeerId = NetworkManager.getInstance().myPeerId;
        store.players.forEach(p => {
            if (p.id !== myPeerId && p.planetId === this.planetId) {
                this.spawnRemotePlayer(p.id, p.x, p.y, p.username);
            }
        });

        // 7. Camera Setup
        this.cameras.main.setZoom(3);

        // Disable rounding to allow smooth sub-pixel movement with the camera.
        this.cameras.main.roundPixels = false;

        this.cameras.main.setBounds(0, 0, widthInPixels, heightInPixels);

        // Use non-rounded coordinates for the follow target to prevent diagonal jitter
        this.cameras.main.startFollow(this.player, false);

        // 8. Network Setup
        this.setupNetworkEvents();
    }

    /**
     * Finds the closest valid (non-water) spawn point to the center of the map.
     */
    private findSafeSpawn(mapData: number[][], w: number, h: number): { x: number, y: number } {
        const centerX = Math.floor(w / 2);
        const centerY = Math.floor(h / 2);

        // Check if center is land using helper
        if (!isWater(mapData[centerY][centerX])) {
            return { x: centerX, y: centerY };
        }

        let bestX = 0;
        let bestY = 0;
        let minDistance = Infinity;

        // Iterate through all tiles to find the closest valid one
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (!isWater(mapData[y][x])) {
                    const dist = Phaser.Math.Distance.Between(x, y, centerX, centerY);
                    if (dist < minDistance) {
                        minDistance = dist;
                        bestX = x;
                        bestY = y;
                    }
                }
            }
        }
        return { x: bestX, y: bestY };
    }

    update(time: number): void {
        this.timeSystem.update(time, Date.now());

        // Perform Y-sorting for depth management
        this.entitiesGroup.children.each((child: any) => {
            const sprite = child as Phaser.GameObjects.Sprite;
            sprite.setDepth(Math.floor(sprite.y));
            return true;
        });
    }

    /**
     * Sets up event listeners using stable class methods to allow proper cleanup.
     * Includes shutdown logic to prevent "ghost" listeners when warping.
     */
    private setupNetworkEvents(): void {
        // Clean up previous listeners using the specific method references
        GameEvents.off('REMOTE_MOVE', this.handleRemoteMove);
        GameEvents.off('PLAYER_LEAVE', this.handlePlayerLeave);

        // Bind new listeners
        GameEvents.on('REMOTE_MOVE', this.handleRemoteMove);
        GameEvents.on('PLAYER_LEAVE', this.handlePlayerLeave);

        // CLEANUP: Important! Remove listeners when scene destroys/warps to prevent duplicates
        // or handling events for the wrong planet.
        this.events.once('shutdown', () => {
            GameEvents.off('REMOTE_MOVE', this.handleRemoteMove);
            GameEvents.off('PLAYER_LEAVE', this.handlePlayerLeave);

            // CRITICAL FIX: Clear the remote players map on shutdown.
            // This prevents the scene from trying to update sprites that are scheduled for destruction,
            // which causes "Cannot read properties of undefined" errors during warping.
            this.remotePlayers.clear();
        });
    }

    /**
     * Helper to instantiate a remote player and add them to the scene.
     */
    private spawnRemotePlayer(id: string, x: number, y: number, username: string): void {
        if (this.remotePlayers.has(id)) return;

        const remote = new RemoteAngler(this, x, y);
        (remote as any).username = username;
        this.entitiesGroup.add(remote);
        this.remotePlayers.set(id, remote);
    }

    /**
     * Handles incoming movement packets from remote players.
     * Defined as an arrow function to preserve 'this' context.
     */
    private handleRemoteMove = (pkt: PlayerMovePacket) => {
        // Strict null check
        if (!pkt.senderId) return;

        // Prevent processing our own echoed packets.
        if (pkt.senderId === NetworkManager.getInstance().myPeerId) return;

        // CRITICAL: Ghost Filtering
        // Ignore packets from players who are physically on a different planet.
        if (pkt.planetId !== this.planetId) {
            // If they were previously here but moved away, ensure they are removed from this scene
            if (this.remotePlayers.has(pkt.senderId)) {
                this.handlePlayerLeave({ id: pkt.senderId });
            }
            return;
        }

        const store = useGameStore.getState();

        // 1. Update Global Store (Drives the Minimap)
        if (!store.players.some(p => p.id === pkt.senderId)) {
            store.addPlayer({
                id: pkt.senderId,
                username: pkt.username || 'Unknown',
                x: pkt.x,
                y: pkt.y,
                planetId: pkt.planetId // Save the packet's planetId
            });
        } else {
            store.updatePlayer(pkt.senderId, { x: pkt.x, y: pkt.y, planetId: pkt.planetId });
        }

        // 2. Update Phaser Scene (Drives the Game World)
        let remote = this.remotePlayers.get(pkt.senderId);

        // Spawn if missing (e.g. late joiner or just warped in)
        if (!remote) {
            this.spawnRemotePlayer(pkt.senderId, pkt.x, pkt.y, pkt.username);
            remote = this.remotePlayers.get(pkt.senderId);
        }

        // Update target position and animation
        // Passing 'direction' ensures the sprite faces the correct way even if stopped
        if (remote) {
            remote.setTarget(pkt.x, pkt.y, pkt.anim, pkt.direction);
        }
    };

    /**
     * Handles player disconnection events.
     * Defined as an arrow function to preserve 'this' context.
     */
    private handlePlayerLeave = (data: { id: string }) => {
        // Remove from Scene
        const remote = this.remotePlayers.get(data.id);
        if (remote) {
            this.entitiesGroup.remove(remote);
            remote.destroy();
            this.remotePlayers.delete(data.id);
        }
        // Remove from Store
        useGameStore.getState().removePlayer(data.id);
    };
}
