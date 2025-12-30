import { RigidBody, CuboidCollider } from '@react-three/rapier';

/**
 * WATER BODY
 * Renders the water surfaces and establishes Physics Sensors.
 * * TODO: MovementSystem.ts needs to check for intersections with these sensors
 * to apply buoyancy and drag.
 */
export const WaterBody = () => {
    return (
        <group>
            {/* 1. THE OCEAN (Infinite Horizon) */ }
            <mesh rotation={ [-Math.PI / 2, 0, 0] } position={ [0, -1, 0] }>
                <planeGeometry args={ [500, 500] }/>
                <meshStandardMaterial
                    color="#0ea5e9"
                    transparent
                    opacity={ 0.8 }
                    roughness={ 0.1 }
                />
            </mesh>

            {/* Ocean Physics Sensor (Surface Level) */ }
            <RigidBody type="fixed" sensor position={ [0, -2, 0] }>
                <CuboidCollider args={ [250, 2, 250] }/>
            </RigidBody>

            {/* 2. THE RIVER (Between the islands) */ }
            <mesh rotation={ [-Math.PI / 2, 0, 0] } position={ [0, -0.5, 0] }>
                <planeGeometry args={ [10, 40] }/>
                <meshStandardMaterial
                    color="#38bdf8"
                    transparent
                    opacity={ 0.6 }
                />
            </mesh>

            {/* River Sensor (triggers flow mechanics) */ }
            <RigidBody type="fixed" sensor position={ [0, -1, 0] }>
                <CuboidCollider args={ [5, 1, 20] }/>
            </RigidBody>
        </group>
    );
};
