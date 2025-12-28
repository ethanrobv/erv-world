/**
 * Lightweight tuple representation of 3D coordinates [x, y, z].
 */
export type Vector3 = [number, number, number];

/**
 * Lightweight tuple representation of a Quaternion [x, y, z, w].
 */
export type Quaternion = [number, number, number, number];

/**
 * Network message type constants.
 * Mapped to integers to minimize binary payload size.
 */
export const PacketType = {
    // Handshake (Reliable)
    JOIN_REQUEST: 0,
    WORLD_SNAPSHOT: 1,

    // Game Loop (Unreliable/High Frequency)
    PLAYER_UPDATE: 2,
    WORLD_TICK: 3,

    // Events (Reliable)
    GLOBAL_STATE: 4,
    MINIGAME_RESULT: 5,
} as const;

export type PacketType = typeof PacketType[keyof typeof PacketType];

// =============================================================================
// PAYLOAD DEFINITIONS
// =============================================================================

/**
 * Payload for the initial handshake request (Client -> Host).
 */
export interface JoinRequestPayload {
    clientId: string;
    username: string;
}

/**
 * Payload containing the authoritative world state (Host -> Client).
 * Sent immediately after a successful connection.
 */
export interface WorldSnapshotPayload {
    gameTime: number;       // Total game minutes (integer)
    weather: number;        // Weather enum index
    season: number;         // Season enum index
    players: PlayerState[];
}

/**
 * High-frequency player update (Client -> Host).
 * Contains position and velocity for client-side prediction.
 */
export interface PlayerUpdatePayload {
    id: string;
    p: Vector3;    // Position
    r: number;     // Rotation (Y-axis)
    v: Vector3;    // Velocity
    a: number;     // Animation State ID
}

/**
 * Aggregated world state update (Host -> All Clients).
 */
export interface WorldTickPayload {
    t: number;     // Server Timestamp
    p: PlayerUpdatePayload[];
}

/**
 * Updates for shared environmental variables (Host -> All Clients).
 */
export interface GlobalStatePayload {
    type: number; // 0=WEATHER, 1=TIME, 2=SEASON
    val: number;
}

/**
 * Result of a locally executed minigame (Client -> Host).
 */
export interface MinigameResultPayload {
    id: string;
    score: number;
    data?: Record<string, unknown>;
}

// =============================================================================
// PACKET UNION
// =============================================================================

/**
 * Master union type for all network packets.
 * This structure is strictly typed for MessagePack encoding/decoding.
 */
export type GamePacket =
    | { t: typeof PacketType.JOIN_REQUEST; d: JoinRequestPayload }
    | { t: typeof PacketType.WORLD_SNAPSHOT; d: WorldSnapshotPayload }
    | { t: typeof PacketType.PLAYER_UPDATE; d: PlayerUpdatePayload }
    | { t: typeof PacketType.WORLD_TICK; d: WorldTickPayload }
    | { t: typeof PacketType.GLOBAL_STATE; d: GlobalStatePayload }
    | { t: typeof PacketType.MINIGAME_RESULT; d: MinigameResultPayload };

/**
 * Helper interface for the internal player state.
 */
export interface PlayerState {
    id: string;
    username: string;
    p: Vector3;
    r: number;
}
