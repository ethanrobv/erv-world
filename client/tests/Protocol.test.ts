import { describe, it, expect } from 'vitest';
import { encode, decode } from '@msgpack/msgpack';
import { PacketType, type GamePacket, type Vector3, type Quaternion } from '../src/network/Protocol';

describe('Protocol Data Integrity', () => {

    it('correctly serializes a basic PLAYER_UPDATE packet', () => {
        const originalPacket: GamePacket = {
            t: PacketType.PLAYER_UPDATE,
            d: {
                id: 'player_123',
                p: [10.5, 0, -5.2] as Vector3,
                // [UPDATED] r (number) -> q (Quaternion)
                q: [0, 0.707, 0, 0.707] as Quaternion,
                v: [0, 0, 1] as Vector3,
                a: 1
            }
        };

        const encoded = encode(originalPacket);
        const decoded = decode(encoded) as GamePacket;

        expect(decoded.t).toBe(PacketType.PLAYER_UPDATE);
        if (decoded.t === PacketType.PLAYER_UPDATE) {
            expect(decoded.d.id).toBe('player_123');
            expect(decoded.d.p[0]).toBeCloseTo(10.5);
            // Verify quaternion integrity
            expect(decoded.d.q).toHaveLength(4);
            expect(decoded.d.q[1]).toBeCloseTo(0.707);
        }
    });

    it('handles complex nested structures (WORLD_SNAPSHOT)', () => {
        // This is the heaviest packet type. Critical to test.
        const snapshotPacket: GamePacket = {
            t: PacketType.WORLD_SNAPSHOT,
            d: {
                gameTime: 720,
                weather: 1, // Rain
                season: 0,  // Warm
                players: [
                    // [UPDATED] Players now use 'q' for rotation
                    { id: 'p1', username: 'Alice', p: [0, 0, 0], q: [0, 0, 0, 1] },
                    { id: 'p2', username: 'Bob', p: [10, 5, 0], q: [0, 1, 0, 0] }
                ]
            }
        };

        const encoded = encode(snapshotPacket);
        const decoded = decode(encoded) as GamePacket;

        expect(decoded.t).toBe(PacketType.WORLD_SNAPSHOT);

        if (decoded.t === PacketType.WORLD_SNAPSHOT) {
            expect(decoded.d.gameTime).toBe(720);
            expect(decoded.d.players).toHaveLength(2);
            expect(decoded.d.players[1].username).toBe('Bob');
            expect(decoded.d.players[1].p[0]).toBe(10);
            expect(decoded.d.players[1].q[1]).toBe(1);
        }
    });

    it('keeps payload size small (Efficiency Check)', () => {
        const packet: GamePacket = {
            t: PacketType.PLAYER_UPDATE,
            d: {
                id: 'A',
                p: [1, 2, 3],
                q: [0, 0, 0, 1], // [UPDATED]
                v: [0, 0, 0],
                a: 0
            }
        };
        const encoded = encode(packet);
        // MessagePack is efficient with small integers; [0,0,0,1] adds minimal overhead vs a single 0.
        // It should still easily fit under 60 bytes.
        expect(encoded.byteLength).toBeLessThan(60);
    });
});
