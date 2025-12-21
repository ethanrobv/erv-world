import React from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { SoftBlock } from './CoreAssets';
import { HandVisuals } from './Cards';
import type { Card } from '../GameConfig';

interface PlayerAvatarProps {
    // Animation Refs (Passed from logic to control limbs)
    visualsRef: React.RefObject<THREE.Group>;
    leftLegRef: React.RefObject<THREE.Group>;
    rightLegRef: React.RefObject<THREE.Group>;
    leftArmRef: React.RefObject<THREE.Group>;
    rightArmRef: React.RefObject<THREE.Group>;

    // Visual State
    opacity: number;
    displayName?: string;

    // Card Data
    hand?: Card[];
    isLocalPlayer: boolean;
}

export const PlayerAvatar = ({
                                 visualsRef,
                                 leftLegRef,
                                 rightLegRef,
                                 leftArmRef,
                                 rightArmRef,
                                 opacity,
                                 displayName,
                                 hand,
                                 isLocalPlayer
                             }: PlayerAvatarProps) => {
    // Theme
    const primaryColor = useThemeColor('--brand-primary');
    const shirtColor = useThemeColor('--player-torso');
    const headColor = useThemeColor('--player-head');
    const pantsColor = useThemeColor('--player-legs');

    const isTrans = opacity < 1;

    return (
        <>
            {/* NAME TAG */ }
            { displayName && opacity > 0.1 && (
                <Text
                    position={ [0, 2.4, 0] }
                    fontSize={ 0.2 }
                    color={ primaryColor }
                    anchorX='center'
                    anchorY='middle'
                    fillOpacity={ opacity }
                    font='https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff'
                >
                    { displayName.toUpperCase() }
                </Text>
            ) }

            {/* HAND VISUALS (Cards over head) */ }
            { hand && hand.length > 0 && (
                <HandVisuals hand={ hand } isLocal={ isLocalPlayer }/>
            ) }

            {/* BODY GROUP (Animated by parent) */ }
            <group ref={ visualsRef }>
                <SoftBlock
                    args={ [0.5, 0.5, 0.5] }
                    color={ headColor }
                    position={ [0, 1.45, 0] }
                    opacity={ opacity }
                    transparent={ isTrans }
                />
                {/* Face Visor/Eyes */ }
                <mesh position={ [0, 1.45, 0.26] } castShadow>
                    <planeGeometry args={ [0.4, 0.1] }/>
                    <meshStandardMaterial
                        color={ primaryColor }
                        emissive={ primaryColor }
                        emissiveIntensity={ 0.5 }
                        opacity={ opacity }
                        transparent={ isTrans }
                    />
                </mesh>

                {/* Torso */ }
                <SoftBlock
                    args={ [0.6, 0.7, 0.4] }
                    color={ shirtColor }
                    position={ [0, 0.85, 0] }
                    opacity={ opacity }
                    transparent={ isTrans }
                />

                {/* Limbs */ }
                <group position={ [-0.15, 0.5, 0] } ref={ leftLegRef }>
                    <SoftBlock
                        args={ [0.2, 0.5, 0.2] }
                        color={ pantsColor }
                        position={ [0, -0.25, 0] }
                        opacity={ opacity }
                        transparent={ isTrans }
                    />
                </group>
                <group position={ [0.15, 0.5, 0] } ref={ rightLegRef }>
                    <SoftBlock
                        args={ [0.2, 0.5, 0.2] }
                        color={ pantsColor }
                        position={ [0, -0.25, 0] }
                        opacity={ opacity }
                        transparent={ isTrans }
                    />
                </group>
                <group position={ [-0.38, 1.15, 0] } ref={ leftArmRef }>
                    <SoftBlock
                        args={ [0.18, 0.5, 0.18] }
                        color={ shirtColor }
                        position={ [0, -0.2, 0] }
                        opacity={ opacity }
                        transparent={ isTrans }
                    />
                </group>
                <group position={ [0.38, 1.15, 0] } ref={ rightArmRef }>
                    <SoftBlock
                        args={ [0.18, 0.5, 0.18] }
                        color={ shirtColor }
                        position={ [0, -0.2, 0] }
                        opacity={ opacity }
                        transparent={ isTrans }
                    />
                </group>
            </group>
        </>
    );
};
