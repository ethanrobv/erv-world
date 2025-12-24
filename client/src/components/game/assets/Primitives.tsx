import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

type Position = [number, number, number];
type Rotation = [number, number, number];

/**
 * A reusable 3D block component with rounded corners.
 * Supports injecting a custom Material (e.g. shaders) via props.
 */
export const SoftBlock = ({
                              args,
                              color,
                              position,
                              rotation,
                              opacity = 1,
                              transparent = false,
                              material,
                              castShadow = false,
                              receiveShadow = true,
                          }: {
    args: [number, number, number];
    color: string;
    position?: Position;
    rotation?: Rotation;
    opacity?: number;
    transparent?: boolean;
    material?: THREE.Material;
    castShadow?: boolean;
    receiveShadow?: boolean;
}) => (
    <RoundedBox
        args={ args }
        radius={ 0.05 }
        smoothness={ 4 }
        position={ position }
        rotation={ rotation }
        castShadow={ castShadow }
        receiveShadow={ receiveShadow }
    >
        { material ? (
            <primitive object={ material } attach='material'/>
        ) : (
            <meshStandardMaterial
                color={ color }
                opacity={ opacity }
                transparent={ transparent }
                roughness={ 0.4 }
                metalness={ 0.1 }
            />
        ) }
    </RoundedBox>
);
