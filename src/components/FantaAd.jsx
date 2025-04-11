/**
 * "Fanta Ad"
 *
 * A 3D Fanta can model for AR advertising
 */
import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGLTF, Text } from "@react-three/drei";

// Path to the can model in public folder
const MODEL_PATH = "/models/can.glb";

// Preload the model for better performance
useGLTF.preload(MODEL_PATH);

const FantaAd = (props) => {
  const groupRef = useRef();
  const textRef = useRef();
  const [hasError, setHasError] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);

  // Load the model using useGLTF hook
  let gltf = null;
  try {
    gltf = useGLTF(MODEL_PATH);
  } catch (error) {
    console.error("Error loading can model:", error);
    setHasError(true);
  }

  // Store the scene for use in the component
  const [model, setModel] = useState(null);

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

          if (child.material) {
            // Set material properties for better AR rendering
            child.material.needsUpdate = true;
            child.material.metalness = 0.8;
            child.material.roughness = 0.2;
            // Ensure the can is visible but slightly transparent
            child.material.transparent = true;
            child.material.opacity = 0.95;
            child.material.depthTest = true;
            child.material.depthWrite = false;
            child.material.toneMapped = false;
          }
        }
      });

      setModel(clonedScene);
      setModelLoaded(true);
      console.log("Fanta can model processed successfully");
    }
  }, [gltf]);

  // Add state to track initial positioning
  const initialPositionSet = useRef(false);
  const initialPosition = useRef(new THREE.Vector3());

  // Float animation for the can
  const floatAnimation = useRef({
    height: 0,
    speed: 0.5 + Math.random() * 0.5,
  });

  // Handle model positioning and rotation
  useFrame(({ camera, clock }) => {
    if (!groupRef.current || hasError) return;

    // Set initial position once based on camera position
    if (!initialPositionSet.current) {
      // Get the current camera position and direction
      const cameraPosition = camera.position;
      const cameraDirection = new THREE.Vector3(0, 0, -1);
      cameraDirection.applyQuaternion(camera.quaternion);

      // Get the desired Z distance from props or use default
      const zDistance = props.position?.[2] || -3.5;

      // Position to the right of ImagePlane
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
      initialPositionSet.current = true;
      console.log("FantaAd positioned at:", initialPosition.current);
    }

    // Rotate can slowly
    const rotationSpeed = props.rotationSpeed || 0.2;
    groupRef.current.rotation.y = clock.getElapsedTime() * rotationSpeed;

    // Add floating animation
    if (modelLoaded) {
      const time = clock.getElapsedTime();
      const floatSpeed = floatAnimation.current.speed;
      const floatHeight = Math.sin(time * floatSpeed) * 0.1;

      // Apply floating motion
      groupRef.current.position.y = initialPosition.current.y + floatHeight;

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
    }
  });

  // If error or no model, don't render anything
  if (hasError || !model) {
    return (
      <mesh position={props.position || [3.0, 0.0, -3.5]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="orange" />
        <Text position={[0, 1, 0]} color="white" fontSize={0.2}>
          Error loading Fanta model
        </Text>
      </mesh>
    );
  }

  return (
    <group ref={groupRef} {...props} dispose={null}>
      {/* Use the can model */}
      <primitive
        object={model}
        scale={props.scale || [0.7, 0.7, 0.7]}
        position={[0, 0, 0]}
      />

      {/* Add text label above the can */}
      <Text
        ref={textRef}
        color={props.textColor || "#ff6600"}
        fontSize={props.fontSize || 0.2}
        position={[0, 1.5, 0]}
        depthWrite={false}
      >
        {props.text || "Fanta"}
      </Text>

      {/* Add spotlight to highlight the can */}
      <spotLight
        position={[0, 3, 2]}
        intensity={1.5}
        angle={0.6}
        penumbra={0.5}
        castShadow={false}
        color="#ffcc88"
      />

      {/* Add a point light for better material highlights */}
      <pointLight position={[1, 0, 1]} intensity={0.8} color="#ffaa66" />
    </group>
  );
};

export default FantaAd;
