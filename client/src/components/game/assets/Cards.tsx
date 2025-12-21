import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { SoftBlock } from './CoreAssets';
import type { Card } from '../GameConfig';

type Position = [number, number, number];
type Rotation = [number, number, number];

export const PlayingCardVisual = ({
                                      card,
                                      position,
                                      rotation,
                                      isVisible
                                  }: {
    card: Card;
    position: Position;
    rotation?: Rotation;
    isVisible: boolean;
}) => {
    const cardBackColor = useThemeColor('--brand-primary');
    const w = 0.7;
    const h = 1.0;
    const d = 0.02;

    const isRed = ['♥', '♦'].includes(card.suit);
    const color = isRed ? '#d32f2f' : '#000000';

    return (
        <group position={ position } rotation={ rotation }>
            {/* Outline/Border */ }
            <mesh position={ [0, 0, 0] }>
                <boxGeometry args={ [w + 0.02, h + 0.02, d - 0.005] }/>
                <meshBasicMaterial color='#000000' toneMapped={ false }/>
            </mesh>

            {/* Main Card Body */ }
            <RoundedBox
                args={ [w, h, d] }
                radius={ 0.05 }
                smoothness={ 4 }
                castShadow={ false }
                receiveShadow={ false }
            >
                <meshBasicMaterial color='#ffffff' toneMapped={ false }/>
            </RoundedBox>

            {/* Back Pattern */ }
            <mesh position={ [0, 0, -d / 2 - 0.001] } rotation={ [0, Math.PI, 0] }>
                <planeGeometry args={ [w - 0.05, h - 0.05] }/>
                <meshBasicMaterial color={ cardBackColor } toneMapped={ false }/>
            </mesh>

            { isVisible ? (
                <group position={ [0, 0, d / 2 + 0.001] }>
                    <Text
                        position={ [-w / 2 + 0.15, h / 2 - 0.15, 0] }
                        fontSize={ 0.25 }
                        color={ color }
                        anchorX='center'
                        anchorY='middle'
                        font='https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff'
                        characters="0123456789JQKA"
                    >
                        { card.rank }
                    </Text>
                    <Text
                        position={ [0, 0, 0] }
                        fontSize={ 0.45 }
                        color={ color }
                        anchorX='center'
                        anchorY='middle'
                        font='https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff'
                        characters="♥♦♣♠"
                    >
                        { card.suit }
                    </Text>
                    <Text
                        position={ [w / 2 - 0.15, -h / 2 + 0.15, 0] }
                        fontSize={ 0.25 }
                        color={ color }
                        rotation={ [0, 0, Math.PI] }
                        anchorX='center'
                        anchorY='middle'
                        font='https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff'
                        characters="0123456789JQKA"
                    >
                        { card.rank }
                    </Text>
                </group>
            ) : (
                <mesh position={ [0, 0, d / 2 + 0.001] }>
                    <planeGeometry args={ [w - 0.05, h - 0.05] }/>
                    <meshBasicMaterial color={ cardBackColor } toneMapped={ false }/>
                </mesh>
            ) }
        </group>
    );
};

export const HandVisuals = ({ hand, isLocal }: { hand: Card[]; isLocal: boolean }) => {
    const groupRef = useRef<THREE.Group>(null);
    const { camera } = useThree();

    useFrame(() => {
        if (groupRef.current) {
            groupRef.current.quaternion.copy(camera.quaternion);
        }
    });

    return (
        <group ref={ groupRef } position={ [0, 3.4, 0] }>
            { hand.map((card, i) => {
                const offset = (i - (hand.length - 1) / 2) * 0.85;
                const showFace = isLocal || !card.isHidden;

                return (
                    <PlayingCardVisual
                        key={ `${ card.rank }-${ card.suit }-${ i }` }
                        card={ card }
                        position={ [offset, 0, 0] }
                        rotation={ [0, 0, 0] }
                        isVisible={ showFace }
                    />
                );
            }) }
        </group>
    );
};

export const BlackjackTable = ({ position, rotation = [0, 0, 0] }: { position: Position; rotation?: Rotation }) => {
    const feltColor = useThemeColor('--brand-primary');
    const woodColor = useThemeColor('--game-wood');
    const legColor = useThemeColor('--game-metal');
    const cardColor = useThemeColor('--brand-primary');

    return (
        <group position={ position } rotation={ rotation }>
            {/* Table Top */ }
            <SoftBlock args={ [6.0, 0.1, 3.0] } color={ feltColor } position={ [0, 1.2, 0] }/>
            <SoftBlock args={ [6.2, 0.15, 3.2] } color={ woodColor } position={ [0, 1.1, 0] }/>

            {/* Legs */ }
            <SoftBlock args={ [0.4, 1.1, 0.4] } color={ legColor } position={ [-2.5, 0.55, 1.2] }/>
            <SoftBlock args={ [0.4, 1.1, 0.4] } color={ legColor } position={ [2.5, 0.55, 1.2] }/>
            <SoftBlock args={ [0.4, 1.1, 0.4] } color={ legColor } position={ [-2.5, 0.55, -1.2] }/>
            <SoftBlock args={ [0.4, 1.1, 0.4] } color={ legColor } position={ [2.5, 0.55, -1.2] }/>

            {/* Dealer Chip Tray */ }
            <SoftBlock args={ [1.5, 0.05, 0.5] } color='#111' position={ [0, 1.25, -1.0] }/>
            <SoftBlock args={ [0.3, 0.15, 0.4] } color='#b00' position={ [2.0, 1.25, -0.8] }/>

            {/* Spread-out Cards (Table Prop Only) */ }
            <group position={ [0, 1.26, 0] }>
                { [0, 1, 2].map((i) => (
                    <mesh key={ i } rotation={ [-Math.PI / 2, 0, (i - 1) * 0.2] } position={ [(i - 1) * 0.4, 0, 0] }>
                        <planeGeometry args={ [0.35, 0.5] }/>
                        <meshStandardMaterial color='#fff'/>
                        <mesh position={ [0, 0, -0.001] }>
                            <planeGeometry args={ [0.3, 0.45] }/>
                            <meshStandardMaterial color={ cardColor }/>
                        </mesh>
                    </mesh>
                )) }
                <SoftBlock args={ [0.35, 0.15, 0.5] } color={ cardColor } position={ [-1.5, 0.075, -0.5] }
                           rotation={ [0, 0.2, 0] }/>
                <SoftBlock args={ [0.35, 0.1, 0.5] } color='#fff' position={ [1.5, 0.05, -0.5] }
                           rotation={ [0, -0.1, 0] }/>
            </group>
        </group>
    );
};
