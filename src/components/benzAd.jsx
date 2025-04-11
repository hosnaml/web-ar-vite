/**
 * "Benz Ad"
 *
 * A 3D Mercedes-Benz model for AR advertising
 */
import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Text, useTexture } from "@react-three/drei";
import * as THREE from "three";
import Benz from "../assets/Benz_background.png";

const MODEL = "models/benz_car.glb";

useGLTF.preload(MODEL);

const BenzAd = (props) => {
  // Get the nodes and materials directly from the model
  const { nodes, materials, scene: gltfScene } = useGLTF(MODEL); //loads .glb 3D model (in this case: "models/benz_car.glb")
  const groupRef = useRef();
  const { scene } = useThree();

  const car = useTexture(Benz);

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
      {/* Benz 3D model */}
      <primitive object={gltfScene} scale={props.scale || [0.5, 0.5, 0.5]} />

      {/* Background plane behind the model */}
      <mesh position={[0, 0.5, -2]} scale={[5, 3, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={car} />
      </mesh>

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
