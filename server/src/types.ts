/**
 * Represents the structure of a game room within the in-memory registry.
 */
export interface Room {
    /** Unique identifier for the room. */
    id: string;
    /** Display name set by the host. */
    name: string;
    /** The PeerJS ID of the host client. */
    hostPeerId: string;
    /** Current number of players in the room. */
    currentPlayers: number;
    /** Maximum capacity of the room. */
    maxPlayers: number;
    /** Timestamp (ms) of creation. */
    createdAt: number;
}

/**
 * Payload definition for the save progress API.
 */
export interface SaveRequest {
    /** The UUID of the player. */
    playerId: string;
    /** The player's display name. */
    username?: string;
    /** The amount of XP gained in this session. */
    xpGained: number;
    /**
     * Dictionary mapping fish IDs to count caught.
     * Example: { 'bass': 2, 'golden_trout': 1 }
     */
    newCatchLog: Record<string, number>;
}
