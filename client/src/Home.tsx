/* -------------------------------------------------------------------------- */
/* BACKGROUND COMPONENT                                                       */
/* -------------------------------------------------------------------------- */

const SpaceBackground = () => (
    <div className='absolute inset-0 z-0 overflow-hidden pointer-events-none select-none'>
        {/* Starfield Pattern */ }
        <div
            className='absolute inset-0 opacity-80'
            style={ {
                filter: `
                    drop-shadow(0 0 1px var(--text-main)) 
                    drop-shadow(0 0 3px var(--text-main)) 
                    brightness(2.0) contrast(1.2)
                `,
                backgroundImage: `
                    /* Large Stars (0.8px) */
                    radial-gradient(circle, var(--text-main) 0.8px, transparent 2px),
                    /* Medium Stars (0.5px) */
                    radial-gradient(circle, var(--text-main) 0.5px, transparent 1.5px),
                    /* Small Stars (0.2px) */
                    radial-gradient(circle, var(--text-main) 0.2px, transparent 1px)
                `,
                backgroundSize: '550px 550px, 350px 350px, 250px 250px',
                backgroundPosition: '0 0, 150px 100px, -80px -60px'
            } }
        />
    </div>
);

/* -------------------------------------------------------------------------- */
/* MAIN PAGE COMPONENT                                                        */
/* -------------------------------------------------------------------------- */

export default function Home() {
    return (
        <div className='fixed inset-0 overflow-hidden bg-page text-text-main transition-colors duration-500'>
            <SpaceBackground/>

            {/* Main Content Container */ }
            <main className='relative z-10 h-full w-full'/>
        </div>
    );
}
