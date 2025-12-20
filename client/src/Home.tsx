import React from 'react';

/* -------------------------------------------------------------------------- */
/* BACKGROUND COMPONENT                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Renders a performant, purely CSS-based starfield.
 * Uses multiple radial-gradient layers and drop-shadow filters to create depth.
 */
const SpaceBackground: React.FC = () => (
    <div
        className='absolute inset-0 z-0 overflow-hidden pointer-events-none select-none'
        aria-hidden='true'
    >
        {/* Starfield Pattern */ }
        <div
            className='absolute inset-0 opacity-80'
            style={ {
                // Combines multiple drop-shadows to create a "bloom" effect around the CSS stars
                filter: 'drop-shadow(0 0 1px var(--text-main)) drop-shadow(0 0 3px var(--text-main)) brightness(2.0) contrast(1.2)',
                backgroundImage: `
          /* Large Stars (0.8px) */
          radial-gradient(circle, var(--text-main) 0.8px, transparent 2px),
          /* Medium Stars (0.5px) */
          radial-gradient(circle, var(--text-main) 0.5px, transparent 1.5px),
          /* Small Stars (0.2px) */
          radial-gradient(circle, var(--text-main) 0.2px, transparent 1px)
        `,
                // Varying sizes creates a parallax-like depth without using heavy JS
                backgroundSize: '550px 550px, 350px 350px, 250px 250px',
                backgroundPosition: '0 0, 150px 100px, -80px -60px',
                backgroundRepeat: 'repeat'
            } }
        />
    </div>
);

/* -------------------------------------------------------------------------- */
/* MAIN PAGE COMPONENT                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The Home landing page.
 * Acts as the desktop workspace backdrop where floating widgets are managed.
 */
export default function Home() {
    return (
        <div className='fixed inset-0 overflow-hidden bg-page text-text-main transition-colors duration-500'>
            <SpaceBackground/>

            {/* Main Content Container */ }
            <main className='relative z-10 h-full w-full'/>
        </div>
    );
}
