import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import aftonbladetImg from "../assets/www.aftonbladet.se.jpg";

// Component for rendering a textured plane with platform-specific handling
const ImagePlane = ({ scrollOffset = 0, ...props }) => {
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

  // Re-create texture every time scrollOffset changes
  useEffect(() => {
    createCanvasTexture();
  }, [scrollOffset]);

  // Modified positioning logic to stay fixed at initial position - with increased distance
  useFrame(({ camera }) => {
    if (!meshRef.current) return;

    // If initial position hasn't been set yet, set it once
    if (!initialPositionSet.current) {
      // Get the current camera position and direction
      const cameraPosition = camera.position;
      const cameraDirection = new THREE.Vector3(0, 0, -1);
      cameraDirection.applyQuaternion(camera.quaternion);

      // Calculate initial position that's directly in front
      // Increased distance from 2 meters to 3.5 meters
      const zDistance = props.position?.[2] || -3.5; // 3.5 meters in front

      const forwardOffset = cameraDirection
        .clone()
        .multiplyScalar(Math.abs(zDistance));

      // Set initial position
      initialPosition.current.set(
        cameraPosition.x + forwardOffset.x,
        // Increased height to position at eye level + 0.5 meters
        cameraPosition.y + 0.5, // Higher above eye level for better visibility
        cameraPosition.z + forwardOffset.z
      );

      // Move mesh to initial position
      meshRef.current.position.copy(initialPosition.current);

      // Scale up the image to compensate for farther distance
      // Only adjust scale if it wasn't explicitly set in props
      if (!props.scale) {
        // Make it larger since it's further away
        meshRef.current.scale.set(3.0, 3.0, 1);
      }

      // Mark initial position as set
      initialPositionSet.current = true;
      console.log(
        "Initial position set (increased distance):",
        initialPosition.current
      );
    }

    // Always make the image face the camera, even though position is fixed
    meshRef.current.lookAt(camera.position);
  });

  // Universal texture loading approach that works on both platforms
  useEffect(() => {
    console.log("Starting texture loading...");
    console.log("Loading image from path:", aftonbladetImg);

    // Create a texture loader
    const textureLoader = new THREE.TextureLoader();

    // Load texture directly
    textureLoader.load(
      aftonbladetImg,
      (loadedTexture) => {
        console.log("Texture loaded successfully");

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
          console.log("Updated material with texture");
        }
      },
      // Progress callback
      (xhr) => {
        console.log(
          `Texture loading: ${(xhr.loaded / xhr.total) * 100}% loaded`
        );
      },
      // Error callback
      (error) => {
        console.error("Error loading texture:", error);
        console.log("Falling back to canvas texture");

        // Fallback to canvas approach
      }
    );
  }, []);

  // Fallback function to create canvas texture
  const createCanvasTexture = () => {
    // Create a canvas element based on scroll offset
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 896; // Reduced size for performance
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.src = aftonbladetImg;

    img.onload = () => {
      const visibleHeight = canvas.height;
      const maxScroll = img.height - visibleHeight;
      const yOffset = scrollOffset * maxScroll;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        img,
        0, // source x
        yOffset, // source y (start crop vertically)
        img.width, // source width
        visibleHeight, // source height to draw
        0, // dest x
        0, // dest y
        canvas.width, // dest width
        canvas.height // dest height
      );

      const newTexture = new THREE.CanvasTexture(canvas);
      newTexture.needsUpdate = true;
      newTexture.minFilter = THREE.LinearFilter;
      newTexture.magFilter = THREE.LinearFilter;

      console.log("Texture updated with cropped canvas");
      setTexture(newTexture);
    };
  };

  // Fill with a bright color so we can see it
  /*const gradient = ctx.createLinearGradient(
      0,
      0,
      canvas.width,
      canvas.height
    );
    gradient.addColorStop(0, "#f9c22e");
    gradient.addColorStop(1, "#e84855");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add some text to ensure we see something
    ctx.fillStyle = "white";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("AFTONBLADET", canvas.width / 2, canvas.height / 2);
    ctx.font = "32px Arial";
    ctx.fillText("Web AR Demo", canvas.width / 2, canvas.height / 2 + 60);

    // Create texture from canvas
    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.needsUpdate = true;
    canvasTexture.minFilter = THREE.LinearFilter;
    canvasTexture.magFilter = THREE.LinearFilter;

    setTexture(canvasTexture);
    setLoaded(true);
    console.log("Canvas texture created successfully");

    // Add canvas to DOM for debugging if needed
    if (DEBUG) {
      canvas.style.position = "absolute";
      canvas.style.bottom = "10px";
      canvas.style.right = "10px";
      canvas.style.width = "80px";
      canvas.style.height = "140px";
      canvas.style.zIndex = "1000";
      canvas.style.border = "2px solid red";
      document.body.appendChild(canvas);
    }
  };
*/
  return (
    <mesh ref={meshRef} {...props}>
      <planeGeometry args={[1, 1.7]} />
      {loaded && !hasError ? (
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          transparent={true}
          opacity={0.85}
          alphaTest={0.1}
          side={THREE.DoubleSide} // Show image from both sides
          depthWrite={false}
          depthTest={false}
          color="white"
        />
      ) : (
        // Visible fallback while loading
        <meshBasicMaterial
          color="#4285f4" // Google blue
          transparent={true}
          opacity={0.9}
          depthTest={false}
        />
      )}
    </mesh>
  );
};

export default ImagePlane;
