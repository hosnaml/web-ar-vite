import React, { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Text, useTexture } from "@react-three/drei";
import * as THREE from "three";
import fantaBackground from "../assets/Fanta-Background.png";

// Path to the can model in public folder
const MODEL_PATH = "/models/can.glb";

// Preload the model for better performance
useGLTF.preload(MODEL_PATH);

const FantaAd = (props) => {
  const groupRef = useRef();
  const modelRef = useRef(); // Ref for just the 3D model
  const textRef = useRef();
  const { scene } = useThree();
  const [hasError, setHasError] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);

  // Add state to track initial positioning
  const initialPositionSet = useRef(false);
  const initialPosition = useRef(new THREE.Vector3());

  // Load the model using useGLTF hook
  const gltf = useGLTF(MODEL_PATH);

  // Load background texture
  const background = useTexture(fantaBackground);

  // Process the model once it's loaded
  useEffect(() => {
    if (gltf && gltf.scene) {
      // Clone the scene to avoid mutations affecting the cached model
      const clonedScene = gltf.scene.clone();

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
            child.material.metalness = 0.8;
            child.material.roughness = 0.2;

            // CRITICAL CHANGES FOR VISIBILITY:
            child.material.transparent = false; // Change to false for proper depth
            child.material.opacity = 1.0; // Full opacity
            child.material.depthTest = true; // Keep depth testing
            child.material.depthWrite = true; // Enable depth writing
            child.material.toneMapped = false;
          }
        }
      });

      setModelLoaded(true);
      console.log("Fanta can model processed successfully");
    }
  }, [gltf]);

  // Float animation for the can
  const floatAnimation = useRef({
    height: 0,
    speed: 0.5 + Math.random() * 0.5,
  });

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

      // Position to the right side
      const xOffset = props.position?.[0] || 3.0; // Positive value places it to the right
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

      // Set the whole group to face the user initially
      groupRef.current.lookAt(camera.position);

      initialPositionSet.current = true;
      console.log("FantaAd positioned at:", initialPosition.current);
    }

    // Rotate only the 3D model
    if (modelRef.current) {
      const rotationSpeed = props.rotationSpeed || 0.3;
      modelRef.current.rotation.y = clock.getElapsedTime() * rotationSpeed;
    }

    // Add floating animation to the model only
    if (modelLoaded && modelRef.current) {
      const time = clock.getElapsedTime();
      const floatSpeed = floatAnimation.current.speed;
      const floatHeight = Math.sin(time * floatSpeed) * 0.1;

      // Apply floating motion just to the model, not the whole group
      modelRef.current.position.y = floatHeight;
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
      <mesh position={[0, 0.8, -1]} scale={[5, 3, 1]} renderOrder={1}>
        <planeGeometry />
        <meshBasicMaterial
          map={background}
          transparent={true}
          opacity={0.9}
          depthWrite={false}
          depthTest={true}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Container for the 3D model that will rotate */}
      <group ref={modelRef}>
        {/* Fanta can model */}
        <primitive
          object={gltf.scene}
          scale={props.scale || [0.5, 0.5, 0.5]}
          renderOrder={2} // Make sure model renders in front of the background
        />
      </group>

      {/* Add text label above the can */}
      <Text
        ref={textRef}
        color={props.textColor || "#ff6600"}
        fontSize={props.fontSize || 0.2}
        position={[0, 1.2, 0]}
        depthWrite={false}
      >
        {props.text || "Fanta"}
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

export default FantaAd;
