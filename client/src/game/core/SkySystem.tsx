import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, DirectionalLight } from 'three';
import { useGameStore } from '../../store/gameStore';
import { MINUTES_PER_DAY } from '../mechanics/TimeSystem';

const SUN_DISTANCE = 300; // Increased for larger world scale
const COLOR_DAWN = new Color('#fce7f3');
const COLOR_NOON = new Color('#e0f2fe');
const COLOR_DUSK = new Color('#2e1065');
const COLOR_NIGHT = new Color('#020617');

/**
 * SKY SYSTEM
 * Manages celestial bodies and atmospheric lighting.
 * Syncs 3D lighting/fog with the 2D Theme Context.
 */
export const SkySystem = () => {
    const sunRef = useRef<DirectionalLight>(null);
    const ambientRef = useRef<any>(null);

    useFrame(({ scene }) => {
        const time = useGameStore.getState().gameTime;

        // Calculate Orbit
        const angle = ((time - 360) / MINUTES_PER_DAY) * Math.PI * 2;
        const sunX = Math.cos(angle) * SUN_DISTANCE;
        const sunY = Math.sin(angle) * SUN_DISTANCE;
        const sunZ = 50;

        if (sunRef.current) {
            sunRef.current.position.set(sunX, sunY, sunZ);
            sunRef.current.updateMatrixWorld();
        }

        // Color Interpolation
        const targetColor = new Color();

        if (time >= 300 && time < 720) {
            const t = (time - 300) / 420;
            targetColor.lerpColors(COLOR_DAWN, COLOR_NOON, t);
        } else if (time >= 720 && time < 1080) {
            const t = (time - 720) / 360;
            targetColor.lerpColors(COLOR_NOON, COLOR_DUSK, t);
        } else if (time >= 1080 && time < 1440) {
            const t = (time - 1080) / 360;
            targetColor.lerpColors(COLOR_DUSK, COLOR_NIGHT, t);
        } else {
            const t = (time < 300 ? time + (1440 - 1080) : time) / 660;
            targetColor.lerpColors(COLOR_NIGHT, COLOR_DAWN, t);
        }

        scene.background = targetColor;
        if (scene.fog) {
            (scene.fog as any).color.copy(targetColor);
        }

        if (sunRef.current) {
            const intensity = Math.max(0, Math.sin(angle));
            sunRef.current.intensity = intensity * 1.5;
        }
    });

    return (
        <>
            <ambientLight ref={ ambientRef } intensity={ 0.4 }/>
            <directionalLight
                ref={ sunRef }
                castShadow
                shadow-mapSize={ [4096, 4096] } // High Res shadows for large terrain
                shadow-camera-left={ -100 }    // Expanded Shadow Volume
                shadow-camera-right={ 100 }
                shadow-camera-top={ 100 }
                shadow-camera-bottom={ -100 }
            />
            {/* Fog pushed back to accommodate large island radius */ }
            <fog attach="fog" args={ ['#ffffff', 50, 800] }/>
        </>
    );
};
