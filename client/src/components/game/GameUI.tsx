import { useThemeColor } from '../../hooks/useThemeColor';
import { FADE_IN_DURATION, FADE_OUT_DURATION } from './GameConfig';

export const TransitionOverlay = ({ isActive }: { isActive: boolean }) => {
    const duration = isActive ? FADE_OUT_DURATION : FADE_IN_DURATION;

    return (
        <div style={ {
            position: 'absolute',
            inset: 0,
            backgroundColor: 'black',
            opacity: isActive ? 1 : 0,
            transition: `opacity ${ duration }ms ease-in-out`,
            pointerEvents: 'none',
            zIndex: 100
        } }/>
    );
};

export const InteractionPrompt = ({ label }: { label: string | null }) => {
    if (!label) return null;
    return (
        <div style={ {
            position: 'absolute',
            bottom: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'white',
            fontFamily: 'monospace',
            fontSize: '1.2rem',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
            zIndex: 20
        } }>
            [ E ] - { label }
        </div>
    );
};

export const MainMenu = ({ onStart }: { onStart: () => void }) => {
    const primary = useThemeColor('--brand-primary');
    const bg = useThemeColor('--bg-page');
    const text = useThemeColor('--text-main');
    return (
        <div style={ {
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${ bg }DD`,
            zIndex: 10,
            color: text,
            fontFamily: 'monospace',
            backdropFilter: 'blur(5px)'
        } }>
            <button onClick={ onStart } style={ {
                fontSize: '1.5rem',
                background: primary,
                color: bg,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                padding: '0.8rem 2rem',
                fontFamily: 'monospace',
                borderRadius: '4px'
            } }>START
            </button>
            <p style={ { marginTop: '30px', opacity: 0.7, fontSize: '0.9rem', color: text } }>WASD TO MOVE</p>
        </div>
    );
};
