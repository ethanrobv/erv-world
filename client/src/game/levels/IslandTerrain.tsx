import { RigidBody, CylinderCollider, CuboidCollider } from '@react-three/rapier';

/**
 * ISLAND TERRAIN
 * Constructs the static geometry of the level.
 * * CHANGES:
 * 1. Hut moved to x=50 (Center of Right Bank).
 * 2. Hut scaled up significantly (20x20 floor).
 * 3. Roof uses a dedicated Hull Collider for perfect visual alignment.
 */
export const IslandTerrain = () => {
    // Theme Palette
    const SAND_COLOR = "#eab308";
    const GRASS_COLOR = "#65a30d";
    const WOOD_COLOR = "#78350f";
    const STONE_COLOR = "#57534e";

    return (
        <group>
            {/* --- LEFT BANK CLUSTER (The Hilly Side) --- */ }
            <RigidBody type="fixed" friction={ 2 } colliders="hull">
                {/* 1. Central Mass */ }
                <mesh position={ [-40, -4.1, 0] } receiveShadow>
                    <cylinderGeometry args={ [65, 75, 8, 32] }/>
                    <meshStandardMaterial color={ SAND_COLOR }/>
                </mesh>
            </RigidBody>

            <RigidBody type="fixed" friction={ 2 } colliders="hull">
                {/* 2. Northern Dune */ }
                <mesh position={ [-30, -4.2, -50] } receiveShadow>
                    <cylinderGeometry args={ [35, 45, 8, 24] }/>
                    <meshStandardMaterial color={ SAND_COLOR }/>
                </mesh>
            </RigidBody>

            <RigidBody type="fixed" friction={ 2 } colliders="hull">
                {/* 3. Southern Dune */ }
                <mesh position={ [-35, -4.05, 50] } receiveShadow>
                    <cylinderGeometry args={ [40, 50, 8, 24] }/>
                    <meshStandardMaterial color={ SAND_COLOR }/>
                </mesh>
            </RigidBody>

            {/* --- RIGHT BANK CLUSTER (The Flat Side) --- */ }
            <RigidBody type="fixed" friction={ 2 } colliders="hull">
                {/* 4. Main Mass (Center roughly x=55, z=5) */ }
                <mesh position={ [55, -4.0, 5] } receiveShadow>
                    <cylinderGeometry args={ [50, 60, 8, 32] }/>
                    <meshStandardMaterial color={ SAND_COLOR }/>
                </mesh>
            </RigidBody>

            <RigidBody type="fixed" friction={ 2 } colliders="hull">
                {/* 5. Eastern Extension */ }
                <mesh position={ [75, -4.3, -25] } receiveShadow>
                    <cylinderGeometry args={ [30, 40, 8, 24] }/>
                    <meshStandardMaterial color={ SAND_COLOR }/>
                </mesh>
            </RigidBody>

            {/* --- FEATURES --- */ }

            {/* Grassy Hill (Flattened) */ }
            <RigidBody type="fixed" colliders="hull">
                <mesh position={ [-60, -2, -20] } scale={ [3.5, 0.6, 3.5] } receiveShadow>
                    <sphereGeometry args={ [20, 32, 16] }/>
                    <meshStandardMaterial color={ GRASS_COLOR }/>
                </mesh>
            </RigidBody>

            {/* Rocky Outcrop */ }
            <RigidBody type="fixed" colliders="hull">
                <mesh position={ [80, -2, 40] } rotation={ [0.2, 0.5, 0] } scale={ [3, 1.5, 3] } castShadow
                      receiveShadow>
                    <dodecahedronGeometry args={ [5] }/>
                    <meshStandardMaterial color={ STONE_COLOR } flatShading/>
                </mesh>
            </RigidBody>

            {/* --- THE BEACH HUT (Relocated to Right Bank) --- */ }

            {/* 1. Base Structure (Floor & Posts) */ }
            <RigidBody type="fixed" position={ [50, 0, 5] } rotation={ [0, -0.2, 0] }>

                {/* Floor Platform (20x20) */ }
                <mesh position={ [0, 0.5, 0] } receiveShadow>
                    <boxGeometry args={ [20, 1, 20] }/>
                    <meshStandardMaterial color={ WOOD_COLOR }/>
                </mesh>
                <CuboidCollider args={ [10, 0.5, 10] } position={ [0, 0.5, 0] }/>

                {/* Posts (Visual Only - No Collision needed for vertical posts usually, prevents getting stuck) */ }
                <group>
                    <mesh position={ [9, 4, 9] } castShadow>
                        <cylinderGeometry args={ [0.4, 0.4, 8] }/>
                        <meshStandardMaterial color={ WOOD_COLOR }/>
                    </mesh>
                    <mesh position={ [-9, 4, 9] } castShadow>
                        <cylinderGeometry args={ [0.4, 0.4, 8] }/>
                        <meshStandardMaterial color={ WOOD_COLOR }/>
                    </mesh>
                    <mesh position={ [9, 4, -9] } castShadow>
                        <cylinderGeometry args={ [0.4, 0.4, 8] }/>
                        <meshStandardMaterial color={ WOOD_COLOR }/>
                    </mesh>
                    <mesh position={ [-9, 4, -9] } castShadow>
                        <cylinderGeometry args={ [0.4, 0.4, 8] }/>
                        <meshStandardMaterial color={ WOOD_COLOR }/>
                    </mesh>
                </group>
            </RigidBody>

            {/* 2. Roof Structure (Separate Hull Collider) */ }
            {/* Positioned relative to the Hut Base: Base is at y=0, Posts are 8 high. Roof sits at ~y=8 */ }
            <RigidBody type="fixed" position={ [50, 10, 5] } rotation={ [0, Math.PI / 4 - 0.2, 0] } colliders="hull">
                <mesh castShadow>
                    <coneGeometry args={ [16, 6, 4] }/>
                    <meshStandardMaterial color="#451a03"/>
                </mesh>
            </RigidBody>

            {/* --- SAFETY NET --- */ }
            <RigidBody type="fixed" sensor>
                <CuboidCollider args={ [500, 1, 500] } position={ [0, -20, 0] }/>
            </RigidBody>
        </group>
    );
};
