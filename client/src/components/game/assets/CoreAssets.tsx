import { RoundedBox } from '@react-three/drei';

type Position = [number, number, number];
type Rotation = [number, number, number];

export const SoftBlock = ({
                              args,
                              color,
                              position,
                              rotation,
                              opacity = 1,
                              transparent = false
                          }: {
    args: [number, number, number];
    color: string;
    position?: Position;
    rotation?: Rotation;
    opacity?: number;
    transparent?: boolean;
}) => (
    <RoundedBox
        args={ args }
        radius={ 0.05 }
        smoothness={ 4 }
        position={ position }
        rotation={ rotation }
        castShadow
        receiveShadow
    >
        <meshStandardMaterial
            color={ color }
            opacity={ opacity }
            transparent={ transparent }
            roughness={ 0.4 }
            metalness={ 0.1 }
        />
    </RoundedBox>
);
