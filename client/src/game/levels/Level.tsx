import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';

/**
 * THE GYM
 * A grey-box testing environment designed to break the camera and movement logic.
 */
export const Level = () => {
    return (
        <group>
            {/* 1. THE FLOOR */ }
            {/* Standard ground plane. Friction 1 prevents sliding like ice. */ }
            <RigidBody type="fixed" friction={ 1 } colliders={ false }>
                <CuboidCollider args={ [50, 1, 50] } position={ [0, -1, 0] }/>
                <mesh rotation={ [-Math.PI / 2, 0, 0] } position={ [0, -0.01, 0] } receiveShadow>
                    <planeGeometry args={ [100, 100] }/>
                    <meshStandardMaterial color="#333"/>
                </mesh>
            </RigidBody>

            {/* 2. THE RAMP (Slope Test) */ }
            {/* A 25-degree incline to test character friction and gravity. */ }
            <RigidBody type="fixed" position={ [-15, 0, 0] } rotation={ [0, 0, -0.4] }>
                <CuboidCollider args={ [5, 0.5, 5] }/>
                <mesh castShadow receiveShadow>
                    <boxGeometry args={ [10, 1, 10] }/>
                    <meshStandardMaterial color="#555"/>
                </mesh>
            </RigidBody>

            {/* 3. THE PILLAR (Camera Occlusion Test) */ }
            {/* A thin object to test if the camera raycast catches narrow obstructions. */ }
            <RigidBody type="fixed" position={ [5, 2.5, 5] }>
                <CylinderCollider args={ [2.5, 0.5] }/>
                <mesh castShadow receiveShadow>
                    <cylinderGeometry args={ [0.5, 0.5, 5] }/>
                    <meshStandardMaterial color="#777"/>
                </mesh>
            </RigidBody>

            {/* 4. THE TUNNEL (Ceiling Test) */ }
            {/* A low archway to verify the camera doesn't clip through the ceiling. */ }
            <group position={ [0, 0, -15] }>
                {/* Left Wall */ }
                <RigidBody type="fixed" position={ [-2, 1.5, 0] }>
                    <CuboidCollider args={ [0.5, 1.5, 2] }/>
                    <mesh castShadow>
                        <boxGeometry args={ [1, 3, 4] }/>
                        <meshStandardMaterial color="#555"/>
                    </mesh>
                </RigidBody>
                {/* Right Wall */ }
                <RigidBody type="fixed" position={ [2, 1.5, 0] }>
                    <CuboidCollider args={ [0.5, 1.5, 2] }/>
                    <mesh castShadow>
                        <boxGeometry args={ [1, 3, 4] }/>
                        <meshStandardMaterial color="#555"/>
                    </mesh>
                </RigidBody>
                {/* Roof */ }
                <RigidBody type="fixed" position={ [0, 3.5, 0] }>
                    <CuboidCollider args={ [3, 0.5, 2] }/>
                    <mesh castShadow>
                        <boxGeometry args={ [6, 1, 4] }/>
                        <meshStandardMaterial color="#555"/>
                    </mesh>
                </RigidBody>
            </group>

            {/* 5. THE CORNER (Camera Squeeze Test) */ }
            {/* A tight 90-degree angle to test camera behavior in confined spaces. */ }
            <group position={ [15, 0, 15] }>
                <RigidBody type="fixed" position={ [0, 2, 0] }>
                    <CuboidCollider args={ [5, 2, 0.5] }/>
                    <mesh castShadow>
                        <boxGeometry args={ [10, 4, 1] }/>
                        <meshStandardMaterial color="#555"/>
                    </mesh>
                </RigidBody>
                <RigidBody type="fixed" position={ [-4.5, 2, 4.5] } rotation={ [0, Math.PI / 2, 0] }>
                    <CuboidCollider args={ [5, 2, 0.5] }/>
                    <mesh castShadow>
                        <boxGeometry args={ [10, 4, 1] }/>
                        <meshStandardMaterial color="#555"/>
                    </mesh>
                </RigidBody>
            </group>
        </group>
    );
};
