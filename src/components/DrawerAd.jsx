import React, { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Text, useTexture } from "@react-three/drei";
import * as THREE from "three";
import Table from "../assets/Table_background.png";

const MODEL = "/models/drawer.glb"; // Note: path relative to public/

useGLTF.preload(MODEL);

const DrawerAd = (props) => {
  // Get the nodes and materials directly from the model
  const { scene: gltfScene } = useGLTF(MODEL);
  const groupRef = useRef();
  const modelRef = useRef();
  const textRef = useRef();
  const { scene } = useThree();
  const [modelLoaded, setModelLoaded] = useState(false);

  // Add state to track initial positioning
  const initialPositionSet = useRef(false);
  const initialPosition = useRef(new THREE.Vector3());

  // Load background texture with proper error handling
  const background = useTexture(
    Table,
    (texture) => {
      console.log("Table background texture loaded successfully!");
      texture.needsUpdate = true;
    },
    (error) => {
      console.error("Error loading Table background:", error);
    }
  );

  // Process the model once it's loaded
  useEffect(() => {
    if (gltfScene) {
      // Clone the scene to avoid mutations affecting the cached model
      const clonedScene = gltfScene.clone();

      // Optimize materials for AR rendering
      clonedScene.traverse((child) => {
        if (child.isMesh) {
          // Configure for AR visibility
          child.castShadow = false;
          child.receiveShadow = false;

          // CRITICAL CHANGE: Set renderOrder to ensure it renders after background
          child.renderOrder = 2;

          if (child.material) {
            // Set material properties for better AR rendering
            child.material.needsUpdate = true;

            // CRITICAL CHANGES FOR VISIBILITY:
            child.material.transparent = false; // Change to false for proper depth
            child.material.opacity = 1.0; // Full opacity
            child.material.depthTest = true; // Keep depth testing
            child.material.depthWrite = true; // Enable depth writing
          }
        }
      });

      setModelLoaded(true);
      console.log("Drawer model processed successfully");
    }
  }, [gltfScene]);

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

      // Position based on props
      const xOffset = props.position?.[0] || 4.0;
      const yOffset = props.position?.[1] || -5.0;

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

      // Set the whole group to face the user initially
      groupRef.current.lookAt(camera.position);

      initialPositionSet.current = true;
      console.log("DrawerAd positioned at:", initialPosition.current);
    }

    // Rotate only the 3D model
    if (modelRef.current) {
      const rotationSpeed = props.rotationSpeed || 0.3;
      modelRef.current.rotation.y = clock.getElapsedTime() * rotationSpeed;
    }

    // Make the text always face the camera
    if (textRef.current) {
      const textWorldPos = new THREE.Vector3();
      textRef.current.getWorldPosition(textWorldPos);

      const lookAtQuaternion = new THREE.Quaternion();
      lookAtQuaternion.setFromRotationMatrix(
        new THREE.Matrix4().lookAt(textWorldPos, camera.position, camera.up)
      );
      textRef.current.quaternion.copy(lookAtQuaternion);
    }
  });

  return (
    <group ref={groupRef} {...props} dispose={null}>
      {/* Background plane behind the model - NOT in the rotating group */}
      <mesh position={[0, 0.4, -1]} scale={[2.5, 4, 0.5]} renderOrder={1}>
        <planeGeometry />
        <meshBasicMaterial
          map={background}
          transparent={true}
          opacity={1}
          depthWrite={false}
          depthTest={true}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Container for the 3D model that will rotate */}
      <group ref={modelRef} position={[0, -1, 0]}>
        {/* Drawer model */}
        <primitive
          object={gltfScene}
          scale={props.scale || [7, 7, 7]}
          renderOrder={2}
        />
      </group>

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

export default DrawerAd;
