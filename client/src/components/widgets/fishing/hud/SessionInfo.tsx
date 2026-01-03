'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/lib/stores/useGameStore';
import { NetworkManager } from '@/game/systems/network/NetworkManager';
import { GameEvents } from '@/game/core/GameEvents';

/**
 * Display widget for session status and World Time.
 * Handles:
 * 1. Connection Status / Ping
 * 2. World Time Display (synced via TimeSystem)
 * 3. Copying Room ID
 * 4. Hosting/Joining transitions
 */
export default function SessionInfo() {
    const isConnected = useGameStore((s) => s.connectionStatus === 'connected');
    const roomId = useGameStore((s) => s.roomId);
    const isHost = useGameStore((s) => s.isHost);

    // Actions
    const setRoomId = useGameStore((s) => s.setRoomId);
    const setConnectionStatus = useGameStore((s) => s.setConnectionStatus);
    const setIsHost = useGameStore((s) => s.setIsHost);

    const [copied, setCopied] = useState(false);
    const [ping, setPing] = useState(0);
    const [isBusy, setIsBusy] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [worldTime, setWorldTime] = useState('--:-- --');

    // Network Status & Time Listeners
    useEffect(() => {
        // Ping Simulation
        const pingInterval = setInterval(() => {
            if (isConnected && !isHost) {
                // Simulate realistic jitter (20-60ms)
                setPing(Math.floor(20 + Math.random() * 40));
            }
        }, 1000);

        // Listen for TimeSystem updates
        const onTimeUpdate = (data: any) => {
            if (data && data.timeString) {
                setWorldTime(data.timeString);
            }
        };
        GameEvents.on('TIME_UPDATE', onTimeUpdate);

        return () => {
            clearInterval(pingInterval);
            GameEvents.off('TIME_UPDATE', onTimeUpdate);
        };
    }, [isConnected, isHost]);

    /**
     * Copies the current Room ID to clipboard.
     */
    const handleCopy = () => {
        if (!isConnected || !roomId) return;
        navigator.clipboard.writeText(roomId).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    /**
     * SOLO -> HOST Transition:
     * Initializes PeerJS and becomes the Host, keeping the current world seed.
     */
    const handleGoLive = async () => {
        setIsBusy(true);
        try {
            const myPeerId = await NetworkManager.getInstance().init();

            // We manually flag as host on the manager.
            // Note: We do NOT call NetworkManager.hostGame() here because that triggers
            // a scene restart/seed regeneration. We want to preserve the current solo world.
            NetworkManager.getInstance().isHost = true;
            setIsHost(true);
            console.log('[SessionInfo] Uplink Established via Go Live');

            setRoomId(myPeerId);
            setConnectionStatus('connected');
        } catch (err) {
            console.error('Failed to go live:', err);
        } finally {
            setIsBusy(false);
        }
    };

    /**
     * SOLO -> CLIENT Transition:
     * Connects to an existing host. The NetworkManager will receive the sync packet
     * and trigger a warp/seed update automatically.
     */
    const handleJoinUplink = async () => {
        if (!joinCode) return;
        setIsBusy(true);
        try {
            await NetworkManager.getInstance().init();
            NetworkManager.getInstance().connectToHost(joinCode);

            // Client Setup
            setRoomId(joinCode);
            setIsHost(false);
            setConnectionStatus('connecting');
        } catch (err) {
            console.error('Failed to join:', err);
            setConnectionStatus('disconnected');
        } finally {
            setIsBusy(false);
        }
    };

    // Prevent control keypresses from registering as game movement while typing
    const stopPropagation = (e: React.KeyboardEvent) => e.stopPropagation();

    return (
        <div className="space-y-2">
            {/* Header: Status & Ping */ }
            <div className="flex justify-between items-center border-b border-gray-700 pb-1">
                <span className="text-gray-400 text-xs font-bold">UPLINK STATUS</span>

                <div className="flex items-center gap-2">
                    { isConnected && !isHost && (
                        <span className={ `text-[10px] font-mono ${ ping > 100 ? 'text-red-400' : 'text-green-500' }` }>
                            { ping }ms
                        </span>
                    ) }
                    <span
                        className={ `text-[10px] font-bold ${ isConnected ? "text-green-400 blink" : "text-yellow-600" }` }>
                        { isConnected ? 'ONLINE' : 'LOCAL' }
                    </span>
                </div>
            </div>

            {/* Time Display */ }
            <div className="flex justify-between items-center bg-blue-900/20 px-2 py-1 border border-blue-900/50 mb-1">
                <span className="text-[10px] text-blue-400 font-mono">LOCAL TIME</span>
                <span className="text-xs text-white font-mono font-bold tracking-widest">{ worldTime }</span>
            </div>

            {/* Room ID / Actions */ }
            <div className="pt-1">
                { isConnected ? (
                    // Connected View: Show Code
                    <>
                        <span className="text-[10px] text-gray-500 block mb-1">SESSION CODE</span>
                        <button
                            onClick={ handleCopy }
                            disabled={ !roomId }
                            className="w-full group flex justify-between items-center bg-black border border-gray-600 p-1 px-2 text-xs hover:border-yellow-400 hover:text-yellow-400 transition-all active:scale-95 cursor-pointer"
                            title="Click to Copy"
                        >
                            <span
                                className="font-mono text-blue-400 group-hover:text-yellow-400 truncate max-w-30">
                                { roomId || '---' }
                            </span>
                            <span
                                className="text-[10px] uppercase bg-gray-900 px-1 border border-gray-700 min-w-12.5 text-center">
                                { copied ? 'COPIED' : 'COPY' }
                            </span>
                        </button>
                    </>
                ) : (
                    // Offline View: Join or Host Options
                    <div className="space-y-2">
                        {/* Go Live Button */ }
                        <button
                            onClick={ handleGoLive }
                            disabled={ isBusy }
                            className="w-full bg-blue-900/30 border border-blue-500 text-blue-300 text-[10px] py-1.5 hover:bg-blue-800 hover:text-white font-mono transition-all disabled:opacity-50 outline-none focus:outline-none"
                        >
                            { isBusy ? 'INITIALIZING...' : 'HOST UPLINK (GO LIVE)' }
                        </button>

                        {/* Divider */ }
                        <div className="relative flex items-center justify-center">
                            <span className="bg-black px-2 text-[10px] text-gray-600 uppercase">Or Join</span>
                            <div className="absolute inset-0 border-t border-gray-800 -z-10"></div>
                        </div>

                        {/* Join Input Group */ }
                        <div className="flex gap-1">
                            <input
                                type="text"
                                placeholder="CODE"
                                value={ joinCode }
                                onChange={ (e) => setJoinCode(e.target.value) }
                                onKeyDown={ stopPropagation }
                                className="flex-1 bg-black border border-gray-700 text-gray-300 text-[10px] p-1 font-mono focus:border-blue-500 outline-none placeholder:text-gray-700"
                            />
                            <button
                                onClick={ handleJoinUplink }
                                disabled={ !joinCode || isBusy }
                                className="bg-gray-800 text-gray-300 text-[10px] px-2 border border-gray-600 hover:bg-gray-700 disabled:opacity-50"
                            >
                                CONNECT
                            </button>
                        </div>
                    </div>
                ) }
            </div>
        </div>
    );
}
