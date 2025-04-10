/**
 * "Benz Ad"
 *
 * A 3D Mercedes-Benz model for AR advertising
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Text } from "@react-three/drei";

const MODEL = "public/models/benz_car.glb";

useGLTF.preload(MODEL);

const BenzAd = (props) => {
  // Get the nodes and materials directly from the model
  const { nodes, materials, scene } = useGLTF(MODEL);
  const groupRef = useRef();
  const textRef = useRef();

  // Add rotation animation
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const rotationSpeed = props.rotationSpeed || 0.3;
      groupRef.current.rotation.y = clock.getElapsedTime() * rotationSpeed;
    }
  });

  // Log the nodes and materials to help debugging
  console.log("Model nodes:", nodes);
  console.log("Model materials:", materials);

  return (
    <group ref={groupRef} {...props} dispose={null}>
      {/* Use the main scene as a primitive since we might not know the exact structure */}
      <primitive object={scene} scale={props.scale || [0.5, 0.5, 0.5]} />

      {/* Add text label above the model */}
      <Text
        ref={textRef}
        color={props.textColor || "#ffffff"}
        fontSize={props.fontSize || 0.2}
        position={[0, 0.9, 0]}
        depthWrite={false}
      >
        {props.text || "Mercedes-Benz"}
      </Text>

      {/* Add lighting to showcase the model */}
      <spotLight
        position={[0, 5, 2]}
        intensity={1.5}
        angle={0.6}
        penumbra={0.5}
        castShadow={false}
      />
    </group>
  );
};

export default BenzAd;
