/**
 * "Drawer Ad"
 *
 * A 3D modern bedside drawer model for AR advertising
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import Table from "../assets/table_background.png";

const MODEL = "/models/drawer.glb"; // Note: path relative to public/

useGLTF.preload(MODEL);

const DrawerAd = (props) => {
  const { nodes, materials, scene } = useGLTF(MODEL);
  const groupRef = useRef();
  const modelRef = useRef(); // New ref for the model only
  const textRef = useRef();
  const [modelLoaded, setModelLoaded] = useState(false);

  // Add state to track initial positioning
  const initialPositionSet = useRef(false);
  const initialPosition = useRef(new THREE.Vector3());

  //load background texture
  const table = useTexture(Table);
  // Handle positioning and model rotation
  useFrame(({ camera, clock }) => {
    if (!groupRef.current) return;

    // Set initial position once based on camera position
    if (!initialPositionSet.current) {
      // Get the current camera position and direction
      const cameraPosition = camera.position;
      const cameraDirection = new THREE.Vector3(0, 0, -1);
      cameraDirection.applyQuaternion(camera.quaternion);

      // Get the desired Z distance from props or use default
      const zDistance = props.position?.[2] || -3.5;

      // Position to the left side
      const xOffset = props.position?.[0] || -3.0; // Negative value places it to the left
      const yOffset = props.position?.[1] || 0.0;

      // Calculate position in front
      const forwardOffset = cameraDirection
        .clone()
        .multiplyScalar(Math.abs(zDistance));

      // Calculate right vector for side positioning
      const rightVector = new THREE.Vector3(1, 0, 0);
      rightVector.applyQuaternion(camera.quaternion);
      const sideOffset = rightVector.multiplyScalar(xOffset);

      // Set initial position with both forward and side offsets
      initialPosition.current.set(
        cameraPosition.x + forwardOffset.x + sideOffset.x,
        cameraPosition.y + yOffset,
        cameraPosition.z + forwardOffset.z + sideOffset.z
      );

      groupRef.current.position.copy(initialPosition.current);
      initialPositionSet.current = true;
      console.log("BenzAd positioned at:", initialPosition.current);

      // Set the whole group to face the user initially
      groupRef.current.lookAt(camera.position);
      setModelLoaded(true);
    }

    // Rotate only the 3D model
    if (modelRef.current) {
      const rotationSpeed = props.rotationSpeed || 0.3;
      modelRef.current.rotation.y = clock.getElapsedTime() * rotationSpeed;
    }

    console.log("Drawer model nodes:", nodes);
    console.log("Drawer model materials:", materials);
  });
  return (
    <group ref={groupRef} {...props} dispose={null}>
      {/* Container for the 3D model that will rotate */}
      <group ref={modelRef}>
        {/**drawer model*/}
        <primitive
          object={gltfScene}
          scale={props.scale || [0.5, 0.5, 0.5]}
          renderOrder={2} // Make sure model renders in front of the background
        />
      </group>

      {/* Background plane behind the model - NOT in the rotating group */}
      <mesh position={[0, 0.5, -1]} scale={[5, 3, 1]} renderOrder={1}>
        <planeGeometry />
        <meshBasicMaterial
          map={table}
          transparent={true}
          opacity={0.9}
          depthWrite={false}
          depthTest={true}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Spotlight */}
      <spotLight
        position={[0, 5, 2]}
        intensity={1.2}
        angle={0.5}
        penumbra={0.4}
        castShadow={false}
      />
    </group>
  );
};

export default DrawerAd;
