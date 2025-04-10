/**
 * "Drawer Ad"
 *
 * A 3D modern bedside drawer model for AR advertising
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Text } from "@react-three/drei";

const MODEL = "/models/drawer.glb"; // Note: path relative to public/

useGLTF.preload(MODEL);

const DrawerAd = (props) => {
  const { nodes, materials, scene } = useGLTF(MODEL);
  const groupRef = useRef();
  const textRef = useRef();

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const rotationSpeed = props.rotationSpeed || 0.2;
      groupRef.current.rotation.y = clock.getElapsedTime() * rotationSpeed;
    }
  });

  console.log("Drawer model nodes:", nodes);
  console.log("Drawer model materials:", materials);

  return (
    <group ref={groupRef} {...props} dispose={null}>
      {/* Use the whole scene */}
      <primitive object={scene} scale={props.scale || [0.5, 0.5, 0.5]} />

      {/* Text label */}
      <Text
        ref={textRef}
        color={props.textColor || "#ffffff"}
        fontSize={props.fontSize || 0.2}
        position={[0, -1, 0]}
        depthWrite={false}
      >
        {props.text || "Modern Pink Drawer"}
      </Text>

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
