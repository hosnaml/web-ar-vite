import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import Podme from "../assets/Podme.jpg";

const PodmeImagePlane = (props) => {
  const [hasError, setHasError] = useState(false);
  const [texture, setTexture] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const materialRef = useRef();
  const meshRef = useRef();

  // Add state to track initial positioning
  const initialPositionSet = useRef(false);
  const initialPosition = useRef(new THREE.Vector3());

  // Check if device is iOS
  const isIOS = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    return (
      /iphone|ipad|ipod/.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  };

  const isIOSDevice = isIOS();
  const DEBUG = true; // Enable debugging

  // Modified positioning logic to stay fixed in world space while respecting X offset from props
  useFrame(({ camera }) => {
    if (!meshRef.current) return;

    // If initial position hasn't been set yet, set it once
    if (!initialPositionSet.current) {
      // Get the current camera position and direction
      const cameraPosition = camera.position;
      const cameraDirection = new THREE.Vector3(0, 0, -1);
      cameraDirection.applyQuaternion(camera.quaternion);

      // Get the desired Z distance from props or use default
      const zDistance = props.position?.[2] || -3.5;

      // Get the X offset from props (this is the key change)
      const xOffset = props.position?.[0] || 0;

      // Calculate position directly in front
      const forwardOffset = cameraDirection
        .clone()
        .multiplyScalar(Math.abs(zDistance));

      // Apply the right vector for sideways offset based on camera orientation
      const rightVector = new THREE.Vector3(1, 0, 0);
      rightVector.applyQuaternion(camera.quaternion);
      const sideOffset = rightVector.multiplyScalar(xOffset);

      // Set initial position with both forward and side offsets
      initialPosition.current.set(
        cameraPosition.x + forwardOffset.x + sideOffset.x,
        cameraPosition.y + 0.5, // Use props.position?.[1] here if you want to control Y too
        cameraPosition.z + forwardOffset.z + sideOffset.z
      );

      // Move mesh to initial position
      meshRef.current.position.copy(initialPosition.current);

      // Scale based on props or use default
      if (!props.scale) {
        meshRef.current.scale.set(3.0, 3.0, 1);
      }

      // Mark initial position as set
      initialPositionSet.current = true;
      console.log(
        "PodmeImagePlane - Initial position set with X offset:",
        initialPosition.current,
        "X offset was:",
        xOffset
      );
    }

    // ONLY rotate to face camera, but don't follow camera position
    meshRef.current.lookAt(camera.position);
  });

  // Universal texture loading approach that works on both platforms
  useEffect(() => {
    const componentId = "PodmeImagePlane";
    console.log("Starting Podme texture loading...");
    console.log("Loading image from path:", Podme);

    // Create a texture loader
    const textureLoader = new THREE.TextureLoader();

    // Load texture directly
    textureLoader.load(
      Podme,
      (loadedTexture) => {
        console.log("Podme texture loaded successfully");

        // Apply universal optimizations
        loadedTexture.minFilter = THREE.LinearFilter;
        loadedTexture.magFilter = THREE.LinearFilter;
        loadedTexture.generateMipmaps = false;
        loadedTexture.needsUpdate = true;

        // Set the texture
        setTexture(loadedTexture);
        setLoaded(true);

        // Update material directly if available
        if (materialRef.current) {
          materialRef.current.map = loadedTexture;
          materialRef.current.needsUpdate = true;
          console.log("Updated Podme material with texture");
        }
      },
      // Progress callback
      (xhr) => {
        console.log(
          `Podme texture loading: ${(xhr.loaded / xhr.total) * 100}% loaded`
        );
      },
      // Error callback
      (error) => {
        console.error("Error loading Podme texture:", error);
        console.log("Falling back to canvas texture");
        // Fallback to canvas approach
        createCanvasTexture();
      }
    );
  }, []);

  // Fallback function to create canvas texture
  const createCanvasTexture = () => {
    // Create a canvas element
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 896; // Reduced size for performance
    const ctx = canvas.getContext("2d");

    // Fill with a bright color so we can see it
    const gradient = ctx.createLinearGradient(
      0,
      0,
      canvas.width,
      canvas.height
    );
    gradient.addColorStop(0, "#4285f4"); // Different colors for Podme
    gradient.addColorStop(1, "#0f9d58");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add some text to ensure we see something
    ctx.fillStyle = "white";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("PODME", canvas.width / 2, canvas.height / 2);
    ctx.font = "32px Arial";
    ctx.fillText("Web AR Demo", canvas.width / 2, canvas.height / 2 + 60);

    // Create texture from canvas
    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.needsUpdate = true;
    canvasTexture.minFilter = THREE.LinearFilter;
    canvasTexture.magFilter = THREE.LinearFilter;

    setTexture(canvasTexture);
    setLoaded(true);
    console.log("Podme canvas texture created successfully");

    // Add canvas to DOM for debugging if needed
    if (DEBUG) {
      canvas.style.position = "absolute";
      canvas.style.bottom = "10px";
      canvas.style.right = "100px"; // Different position from main ImagePlane
      canvas.style.width = "80px";
      canvas.style.height = "140px";
      canvas.style.zIndex = "1000";
      canvas.style.border = "2px solid blue"; // Different color for identification
      document.body.appendChild(canvas);
    }
  };

  // Alternative approach - don't render anything until loaded
  return (
    <>
      {loaded && !hasError ? (
        <mesh ref={meshRef} {...props}>
          <planeGeometry args={[1, 1.7]} />
          <meshBasicMaterial
            ref={materialRef}
            map={texture}
            transparent={true}
            opacity={1.0}
            alphaTest={0.1}
            side={THREE.DoubleSide}
            depthWrite={false}
            depthTest={false}
            color="white"
          />
        </mesh>
      ) : null}
    </>
  );
};

export default PodmeImagePlane;
