'use client';
import { useGameStore } from '@/lib/stores/useGameStore';

/**
 * Displays the current session's crew manifest.
 * Distinguishes between the local user (You) and remote peers.
 * Correctly labels the local player based on connection status (Host vs Captain).
 */
export default function PlayerList() {
    const players = useGameStore((state) => state.players) || [];
    const myUsername = useGameStore((state) => state.username);
    const isHost = useGameStore((state) => state.isHost);
    const connectionStatus = useGameStore((state) => state.connectionStatus);

    const isConnected = connectionStatus === 'connected';

    // Determine the label for the local player
    let roleLabel = 'CLIENT';
    let roleColor = 'bg-blue-400';

    if (isConnected) {
        if (isHost) {
            roleLabel = 'HOST';
            roleColor = 'bg-yellow-400';
        }
    } else {
        // In Solo/Offline mode, you are the Captain of your own ship
        roleLabel = 'CAPTAIN';
        roleColor = 'bg-gray-400';
    }

    return (
        <div className="w-full">
            <ul className="space-y-1">
                {/* Local Player Entry (Pinned Top) */ }
                <li className="flex items-center justify-between text-white bg-blue-900/50 p-1 border border-blue-500">
                    <span className="font-bold truncate max-w-25" title={ myUsername }>
                        { myUsername.toUpperCase() }
                    </span>
                    <span className={ `text-[10px] px-1 text-black font-bold ${ roleColor }` }>
                        { roleLabel }
                    </span>
                </li>

                {/* Remote Players List */ }
                { players.map((p) => (
                    <li key={ p.id }
                        className="flex items-center justify-between text-gray-300 p-1 border-b border-gray-800 bg-black/50">
                        <span className="truncate max-w-30" title={ p.username }>
                            { p.username || 'UNKNOWN' }
                        </span>
                        <span className="text-[10px] text-gray-600">REMOTE</span>
                    </li>
                )) }

                {/* Empty State */ }
                { players.length === 0 && (
                    <li className="text-gray-500 italic p-1 text-xs text-center border-t border-gray-800 mt-1">
                        No remote signals...
                    </li>
                ) }
            </ul>
        </div>
    );
}
