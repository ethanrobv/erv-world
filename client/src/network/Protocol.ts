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
    OBJECT_UPDATE: 3, // For physics objects (Crates, Fish)
    WORLD_TICK: 4,

    // Events (Reliable)
    GLOBAL_STATE: 5,
    INTERACTION_REQUEST: 6, // Client asks to interact
    INTERACTION_RESPONSE: 7, // Host Approves/Denies
    OBJECT_CLAIM: 8,         // "I own this now"
} as const;

/**
 * Distinguishes the category of interaction.
 */
export const InteractionType = {
    PHYSICS_CLAIM: 0, // Requesting authority over a RigidBody
    LOGIC_REQUEST: 1  // Requesting a game state change (e.g. Minigame Join)
} as const;

export type InteractionType = typeof InteractionType[keyof typeof InteractionType];

// =============================================================================
// PAYLOAD DEFINITIONS
// =============================================================================

export interface JoinRequestPayload {
    clientId: string;
    username: string;
}

export interface PlayerState {
    id: string;
    username: string;
    p: Vector3;
    q: Quaternion; // Rotation (Quaternion)
}

export interface WorldSnapshotPayload {
    gameTime: number;
    weather: number;
    season: number;
    players: PlayerState[];
    // We will add objects here later when we persist them
}

/**
 * Player Movement Update.
 */
export interface PlayerUpdatePayload {
    id: string;
    p: Vector3;    // Position
    q: Quaternion; // Rotation (Quaternion)
    v: Vector3;    // Velocity
    a: number;     // Animation State ID
}

/**
 * Physics Object Movement.
 * Objects can tumble in all directions, requiring a Quaternion.
 */
export interface ObjectUpdatePayload {
    id: string;
    p: Vector3;    // Position
    q: Quaternion; // Rotation (Quaternion)
    v: Vector3;    // Velocity
}

export interface WorldTickPayload {
    t: number;     // Server Timestamp
    p: PlayerUpdatePayload[];
    o: ObjectUpdatePayload[]; // Batch object updates
}

export interface GlobalStatePayload {
    type: number; // 0=WEATHER, 1=TIME, 2=SEASON
    val: number;
}

/**
 * Generic Interaction Request.
 */
export interface InteractionRequestPayload {
    netId: string; // The ID of the entity being interacted with
    type: InteractionType;
    data?: Record<string, unknown>; // Optional context (e.g., seat index)
}

/**
 * Broadcasts ownership changes.
 */
export interface ObjectClaimPayload {
    netId: string;
    ownerId: string; // The socket ID of the new owner
}

// =============================================================================
// PACKET UNION
// =============================================================================

export type GamePacket =
    | { t: typeof PacketType.JOIN_REQUEST; d: JoinRequestPayload }
    | { t: typeof PacketType.WORLD_SNAPSHOT; d: WorldSnapshotPayload }
    | { t: typeof PacketType.PLAYER_UPDATE; d: PlayerUpdatePayload }
    | { t: typeof PacketType.OBJECT_UPDATE; d: ObjectUpdatePayload }
    | { t: typeof PacketType.WORLD_TICK; d: WorldTickPayload }
    | { t: typeof PacketType.GLOBAL_STATE; d: GlobalStatePayload }
    | { t: typeof PacketType.INTERACTION_REQUEST; d: InteractionRequestPayload }
    | { t: typeof PacketType.OBJECT_CLAIM; d: ObjectClaimPayload };
