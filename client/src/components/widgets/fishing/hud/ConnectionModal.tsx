'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/lib/stores/useGameStore';
import { NetworkManager } from '@/game/systems/network/NetworkManager';
import { GameEvents } from '@/game/core/GameEvents';

/**
 * Main Menu / Connection Modal.
 * Handles user identity, session initialization, and game start.
 * Supports:
 * 1. Solo Play (Local generation, no network)
 * 2. Hosting (Network initialization)
 * 3. Joining (Network connection with Sync Timeout protection)
 */
export default function ConnectionModal() {
    const {
        hasGameStarted,
        setHasGameStarted,
        setConnectionStatus,
        setRoomId,
        setUsername,
        setIsHost,
        setWorldSeed
    } = useGameStore();

    const [inputRoomId, setInputRoomId] = useState('');
    const [inputName, setInputName] = useState('');
    const [isInitializing, setIsInitializing] = useState(false);

    // UI Feedback State
    const [statusMessage, setStatusMessage] = useState('ESTABLISHING LINK...');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Global Error Listener: Abort connection if NetworkManager reports a fatal error
    useEffect(() => {
        const onError = (err: any) => {
            console.error("Network Error caught in Modal:", err);
            setIsInitializing(false);
            setErrorMessage("CONNECTION FAILED. CHECK CONSOLE.");
            setConnectionStatus('disconnected');
        };

        GameEvents.on('NETWORK_ERROR', onError);
        return () => {
            GameEvents.off('NETWORK_ERROR', onError);
        };
    }, [setConnectionStatus]);

    // If the game engine is running, the main menu should be hidden
    if (hasGameStarted) return null;

    /**
     * Prevents key events from bubbling up to global listeners.
     */
    const stopPropagation = (e: React.KeyboardEvent) => {
        e.stopPropagation();
    };

    /**
     * SOLO MODE: Generates a seed and starts the game WITHOUT PeerJS.
     */
    const handleSolo = () => {
        if (!inputName) return;

        const localSeed = Math.random().toString(36).substring(7);
        setWorldSeed(localSeed);
        setUsername(inputName);
        setIsHost(true);
        setConnectionStatus('disconnected'); // Explicitly offline

        setHasGameStarted(true);
    };

    /**
     * HOST MODE: Generates seed + Initializes PeerJS network layer.
     */
    const handleHost = async () => {
        if (!inputName) return;
        setIsInitializing(true);
        setErrorMessage(null);
        setStatusMessage('INITIALIZING NETWORK...');

        try {
            const myPeerId = await NetworkManager.getInstance().init();
            NetworkManager.getInstance().hostGame();

            setRoomId(myPeerId);
            setUsername(inputName);
            setIsHost(true);
            setConnectionStatus('connected');
            setHasGameStarted(true);
        } catch (err) {
            console.error('[ConnectionModal] Host failed:', err);
            setIsInitializing(false);
            setErrorMessage("FAILED TO INITIALIZE HOST.");
        }
    };

    /**
     * JOIN MODE: Connects to an existing peer via Room ID.
     * Includes a 10-second timeout to prevent infinite loading screens.
     */
    const handleJoin = async () => {
        if (!inputRoomId || !inputName) return;
        setIsInitializing(true);
        setErrorMessage(null);
        setStatusMessage('SEARCHING FOR HOST...');

        // SAFETY TIMEOUT: If we don't get a Sync Response in 10s, abort.
        const timeout = setTimeout(() => {
            // Check if game still hasn't started
            if (!useGameStore.getState().hasGameStarted) {
                setIsInitializing(false);
                setErrorMessage("CONNECTION TIMED OUT. HOST UNREACHABLE.");
                setConnectionStatus('disconnected');
            }
        }, 10000);

        try {
            await NetworkManager.getInstance().init();
            NetworkManager.getInstance().connectToHost(inputRoomId);

            setRoomId(inputRoomId);
            setUsername(inputName);
            setIsHost(false);
            setConnectionStatus('connecting');

            // Note: We do NOT setHasGameStarted(true) here.
            // We wait for NetworkManager to receive the SYNC_RESPONSE packet.
            // If that packet arrives, it will update the store and this modal will unmount.
        } catch (err) {
            clearTimeout(timeout);
            console.error('[ConnectionModal] Join failed:', err);
            setIsInitializing(false);
            setErrorMessage("FAILED TO JOIN SECTOR.");
        }
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div
                className="w-[450px] bg-black border-2 border-blue-900 shadow-[0_0_50px_rgba(30,58,138,0.5)] p-6 relative overflow-hidden">
                {/* Decorative Scanline Animation */ }
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 animate-[scan_3s_linear_infinite]"></div>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-200 tracking-widest font-mono">
                        COSMIC ANGLER
                    </h1>
                    <p className="text-blue-500/60 text-xs font-mono mt-2">INTERPLANETARY FISHING SIMULATOR</p>
                </div>

                <div className="space-y-6">
                    {/* Identity Section */ }
                    <div className="space-y-2">
                        <label className="text-xs text-blue-400 font-bold uppercase tracking-wider">Angler
                            Identity</label>
                        <input
                            type="text"
                            placeholder="ENTER CALLSIGN..."
                            value={ inputName }
                            onChange={ (e) => setInputName(e.target.value) }
                            onKeyDown={ stopPropagation }
                            maxLength={ 12 }
                            className="w-full bg-blue-950/30 border border-blue-800 p-3 text-white font-mono focus:outline-none focus:border-blue-400 focus:bg-blue-900/50 transition-all text-center uppercase tracking-widest"
                        />
                    </div>

                    {/* Actions Grid */ }
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-blue-900/50">
                        {/* LEFT: Start New World Options */ }
                        <div className="space-y-3">
                            <button
                                onClick={ handleSolo }
                                disabled={ !inputName || isInitializing }
                                className="w-full bg-cyan-900/20 hover:bg-cyan-500/20 border border-cyan-700 text-cyan-300 py-3 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                            >
                                Solo Expedition
                            </button>
                            <button
                                onClick={ handleHost }
                                disabled={ !inputName || isInitializing }
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                            >
                                Host Uplink
                            </button>
                        </div>

                        {/* RIGHT: Join Existing Options */ }
                        <div className="space-y-3 pl-4 border-l border-blue-900/50">
                            <input
                                type="text"
                                placeholder="UPLINK CODE"
                                value={ inputRoomId }
                                onChange={ (e) => setInputRoomId(e.target.value) }
                                onKeyDown={ stopPropagation }
                                className="w-full bg-black border border-gray-700 p-2 text-gray-300 font-mono text-xs focus:border-white focus:outline-none text-center"
                            />
                            <button
                                onClick={ handleJoin }
                                disabled={ !inputName || !inputRoomId || isInitializing }
                                className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                            >
                                Join Sector
                            </button>
                        </div>
                    </div>

                    {/* Error Feedback */ }
                    { errorMessage && (
                        <div
                            className="text-red-500 text-xs font-mono text-center font-bold animate-pulse border border-red-900/50 p-2 bg-red-950/30">
                            ⚠ { errorMessage }
                        </div>
                    ) }
                </div>

                {/* Initialization Spinner Overlay */ }
                { isInitializing && (
                    <div className="absolute inset-0 bg-black/90 flex items-center justify-center flex-col gap-2 z-50">
                        <div
                            className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-blue-400 font-mono text-xs animate-pulse">{ statusMessage }</span>
                    </div>
                ) }
            </div>
        </div>
    );
}
