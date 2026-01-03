'use client';

import { useEffect, useRef } from 'react';
import { Game as PhaserGame } from 'phaser';
import { gameConfig } from '@/game/config';

export default function GameCanvas() {
    const gameRef = useRef<PhaserGame | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (gameRef.current) return;

        // Force cleanup of any zombie canvases
        if (containerRef.current) {
            containerRef.current.innerHTML = '';
        }

        gameRef.current = new PhaserGame({
            ...gameConfig,
            parent: 'game-container'
        });

        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, []);

    return (
        <div ref={ containerRef } id="game-container" className="w-full h-full relative"/>
    );
}
