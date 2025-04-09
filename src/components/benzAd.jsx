import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { Text, Center } from "@react-three/drei";

// Component for rendering a 3D Benz car model
const BenzAd = (props) => {
  const groupRef = useRef();
  const textRef = useRef();
  const [model, setModel] = useState(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Add state to track initial positioning
  const initialPositionSet = useRef(false);
  const initialPosition = useRef(new THREE.Vector3());

  // Text config - customize as needed
  const textConfig = {
    text: props.text || "Mercedes-Benz",
    color: props.textColor || "#ffffff",
    fontSize: props.fontSize || 0.15,
    position: [0, 0.9, 0],
  };

  // Load the model using the standard Three.js loader
  useEffect(() => {
    // Create a texture loader with custom manager to handle errors
    const manager = new THREE.LoadingManager();
    manager.onError = (url) => {
      console.error("Error loading resource:", url);
    };

    // Create a texture loader with our custom manager
    const textureLoader = new THREE.TextureLoader(manager);

    // Create the GLTF loader with same manager for consistency
    const loader = new GLTFLoader(manager);

    // Set path to your model
    const modelPath = "/models/benz_car.glb";

    console.log("Attempting to load model from:", modelPath);

    // Use standard Three.js loading pattern with enhanced error handling
    loader.load(
      // Model URL
      modelPath,

      // Success callback
      (gltf) => {
        console.log("Model loaded successfully:", gltf);

        // Create default texture if needed for fallback
        const defaultTexture = new THREE.TextureLoader().load(
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        );
        defaultTexture.encoding = THREE.sRGBEncoding;

        // Enhanced material processing with texture error handling
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            // Enable shadows
            child.castShadow = true;
            child.receiveShadow = true;

            // Enhance materials with safer texture handling
            if (child.material) {
              // Create a new MeshStandardMaterial with better defaults
              const newMaterial = new THREE.MeshStandardMaterial({
                color: child.material.color || 0xcccccc,
                metalness: 0.8,
                roughness: 0.2,
                envMapIntensity: 1.0,
              });

              // If the original material had a map, try to preserve it or use default
              if (child.material.map) {
                try {
                  newMaterial.map = child.material.map;
                  newMaterial.map.anisotropy = 16;
                  newMaterial.map.needsUpdate = true;
                } catch (e) {
                  console.warn("Couldn't transfer texture, using default");
                  newMaterial.map = defaultTexture;
                }
              }

              // Apply the new material
              child.material = newMaterial;
              child.material.needsUpdate = true;
            }
          }
        });

        // Set the model in state
        setModel(gltf.scene);
        setModelLoaded(true);
      },

      // Progress callback
      (xhr) => {
        const progress = (xhr.loaded / xhr.total) * 100;
        console.log(`Loading model: ${progress.toFixed(2)}%`);
      },

      // Error callback with more detail
      (error) => {
        console.error("Error loading model:", error);
        console.error("Error details:", error.message || "Unknown error");
        setHasError(true);
      }
    );

    // Cleanup function
    return () => {
      if (model) {
        model.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
    };
  }, []);

  // Handle model positioning and rotation
  useFrame(({ camera, clock }) => {
    if (!groupRef.current) return;

    // Set initial position once
    if (!initialPositionSet.current) {
      // Get camera position and direction
      const cameraPosition = camera.position;
      const cameraDirection = new THREE.Vector3(0, 0, -1);
      cameraDirection.applyQuaternion(camera.quaternion);

      // Get position parameters
      const zDistance = props.position?.[2] || -2.5;
      const xOffset = props.position?.[0] || 0;
      const yOffset = props.position?.[1] || -0.5;

      // Calculate forward vector
      const forwardOffset = cameraDirection
        .clone()
        .multiplyScalar(Math.abs(zDistance));

      // Calculate right vector for side positioning
      const rightVector = new THREE.Vector3(1, 0, 0);
      rightVector.applyQuaternion(camera.quaternion);
      const sideOffset = rightVector.multiplyScalar(xOffset);

      // Set position
      initialPosition.current.set(
        cameraPosition.x + forwardOffset.x + sideOffset.x,
        cameraPosition.y + yOffset,
        cameraPosition.z + forwardOffset.z + sideOffset.z
      );

      groupRef.current.position.copy(initialPosition.current);
      initialPositionSet.current = true;
      console.log("BenzAd positioned at:", initialPosition.current);
    }

    // Rotate the model continuously for display
    const rotationSpeed = props.rotationSpeed || 0.3;
    groupRef.current.rotation.y = clock.getElapsedTime() * rotationSpeed;

    // Make the text always face the camera
    if (textRef.current) {
      // Get the world position of the text
      const textWorldPos = new THREE.Vector3();
      textRef.current.getWorldPosition(textWorldPos);

      // Calculate direction from text to camera
      const dir = new THREE.Vector3().subVectors(camera.position, textWorldPos);

      // Set the quaternion of the text to face the camera
      const lookAtQuaternion = new THREE.Quaternion();
      lookAtQuaternion.setFromRotationMatrix(
        new THREE.Matrix4().lookAt(textWorldPos, camera.position, camera.up)
      );
      textRef.current.quaternion.copy(lookAtQuaternion);
    }
  });

  return (
    <group ref={groupRef} {...props}>
      {/* If model loaded successfully, show it */}
      {modelLoaded && model && (
        <primitive
          object={model}
          scale={props.scale || [0.5, 0.5, 0.5]}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
        />
      )}

      {/* If error loading model or still loading, show a fallback */}
      {(!modelLoaded || hasError) && (
        <mesh>
          <boxGeometry args={[1, 0.5, 2]} />
          <meshStandardMaterial color={hasError ? "#ff0000" : "#3080ee"} />
        </mesh>
      )}

      {/* Add lighting to showcase the model */}
      <spotLight
        position={[0, 5, 2]}
        intensity={1.5}
        angle={0.6}
        penumbra={0.5}
        castShadow
      />

      {/* Add text above the car */}
      <Center>
        <Text
          ref={textRef}
          color={textConfig.color}
          fontSize={textConfig.fontSize}
          position={textConfig.position}
        >
          {textConfig.text}
        </Text>
      </Center>
    </group>
  );
};

export default BenzAd;
