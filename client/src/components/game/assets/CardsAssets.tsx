import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Card } from '../GameConfig';

// Constants
const VISUAL_SCALE = 0.25; // World scale per CSS pixel
const CSS_WIDTH_PX = 4;
const WORLD_CARD_WIDTH = CSS_WIDTH_PX * VISUAL_SCALE;
const SPACING = WORLD_CARD_WIDTH * 0.3;

// Interfaces

interface PlayingCardProps {
    card: Card | undefined;
    className?: string;
    fontSize?: string;
}

interface HandVisualsProps {
    hand?: Card[];
    isLocal: boolean;
}

// Pure Visual Components (HTML/CSS)

/**
 * Renders the 2D face of a card.
 * Safe to use in HUD and 3D <Html> overlays.
 */
export const PlayingCard = ({ card, className = '', fontSize }: PlayingCardProps) => {
    if (!card || !card.suit || !card.rank) {
        return (
            <div
                className={ `${ className } bg-zinc-800 border border-red-500 rounded flex items-center justify-center` }>
                <span className='text-[8px] text-red-500 font-mono'>ERR</span>
            </div>
        );
    }

    const isRed = ['♥', '♦'].includes(card.suit);
    const color = isRed ? '#ef4444' : '#18181b';

    return (
        <div
            className={ className }
            style={ {
                width: '100%',
                height: '100%',
                backgroundColor: '#f4f4f5',
                border: '2px solid #18181b',
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '8%',
                fontFamily: 'system-ui, sans-serif',
                fontWeight: '900',
                color: color,
                userSelect: 'none',
                position: 'relative',
                overflow: 'hidden',
                fontSize: fontSize
            } }
        >
            {/* Top Corner */ }
            <div style={ {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                lineHeight: 0.9,
                width: 'fit-content',
            } }>
                <span style={ { fontSize: '1.2em' } }>{ card.rank }</span>
                <span style={ { fontSize: '1em' } }>{ card.suit }</span>
            </div>

            {/* Center Icon */ }
            <div style={ {
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '2.5em',
                opacity: 0.1,
            } }>
                { card.suit }
            </div>

            {/* Bottom Corner */ }
            <div style={ {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                lineHeight: 0.9,
                width: 'fit-content',
                alignSelf: 'flex-end',
                transform: 'rotate(180deg)'
            } }>
                <span style={ { fontSize: '1.2em' } }>{ card.rank }</span>
                <span style={ { fontSize: '1em' } }>{ card.suit }</span>
            </div>
        </div>
    );
};

export const CardBack = ({ className = '' }: { className?: string }) => (
    <div
        className={ className }
        style={ {
            width: '100%',
            height: '100%',
            backgroundColor: '#2563eb',
            border: '1px solid #18181b',
            borderRadius: '4px',
            outline: '2px solid #18181b',
            backgroundImage: `
                repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.15) 5px, rgba(255,255,255,0.15) 10px),
                repeating-linear-gradient(-45deg, transparent, transparent 5px, rgba(255,255,255,0.15) 5px, rgba(255,255,255,0.15) 10px)
            `
        } }
    />
);

// 3D Logic Components

/**
 * Manages the 3D layout of a player's hand above their head.
 * Uses <Html> to render crisp DOM elements in world space.
 */
export const HandVisuals = ({ hand, isLocal }: HandVisualsProps) => {
    const groupRef = useRef<THREE.Group>(null);
    const { camera } = useThree();

    useFrame(() => {
        if (groupRef.current) {
            groupRef.current.quaternion.copy(camera.quaternion);
        }
    });

    if (!hand || hand.length === 0) return null;

    return (
        <group ref={ groupRef } position={ [0, 3.2, 0] }>
            { hand.map((card, i) => {
                if (!card) return null;

                const offset = (i - (hand.length - 1) / 2) * SPACING;
                const showFace = isLocal || !card.isHidden;
                const key = `${ card.rank }-${ card.suit }-${ i }`;

                return (
                    <group key={ key } position={ [offset, 0, i * 0.01] }>
                        <Html
                            transform
                            center
                            scale={ VISUAL_SCALE }
                            style={ {
                                width: '120px',
                                height: '172px',
                                pointerEvents: 'none',
                                userSelect: 'none',
                            } }
                            zIndexRange={ [100 + i, 0] }
                        >
                            { showFace ? <PlayingCard card={ card } fontSize='2cqw'/> : <CardBack/> }
                        </Html>
                    </group>
                );
            }) }
        </group>
    );
};
