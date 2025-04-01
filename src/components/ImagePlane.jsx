import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import aftonbladetImg from "../assets/www.aftonbladet.se.jpg";

// Component for rendering a textured plane with platform-specific handling
const ImagePlane = (props) => {
  const [hasError, setHasError] = useState(false);
  const [texture, setTexture] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const materialRef = useRef();
  const meshRef = useRef();

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

  return (
    <mesh ref={meshRef} {...props}>
      <planeGeometry args={[1, 1.7]} />
      {loaded && !hasError ? (
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          transparent={true}
          opacity={1.0}
          alphaTest={0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest={false}
          color="white" // Add white tint for visibility
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
