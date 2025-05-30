import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import cleanWebsite from "../assets/cleanWebsite.png";

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
    createCanvasTexture(scrollOffset);
  }, []); // Run on mount

  useEffect(() => {
    if (loaded) createCanvasTexture(scrollOffset);
  }, [scrollOffset]); // Re-run when scroll changes after initial load

  // Modified positioning logic to stay fixed at initial position - with increased distance
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
        "ImagePlane - Initial position set with X offset:",
        initialPosition.current,
        "X offset was:",
        xOffset
      );
    }

    // ONLY rotate to face camera, but don't follow camera position
    meshRef.current.lookAt(camera.position);
  });

  // Fallback function to create canvas texture
  const createCanvasTexture = (scrollOffset) => {
    // Ensure scrollOffset is passed here
    const canvas = document.createElement("canvas");
    canvas.width = isIOSDevice ? 256 : 512;
    canvas.height = isIOSDevice ? 448 : 896;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = cleanWebsite?.src || cleanWebsite;

    img.onload = () => {
      const visibleHeight = canvas.height;
      const maxScroll = img.height - visibleHeight;
      const yOffset = Math.min(
        maxScroll,
        Math.max(0, scrollOffset * maxScroll)
      );

      // iOS-specific optimization
      if (isIOSDevice) {
        ctx.save();
        ctx.imageSmoothingQuality = "high"; // This helps on iOS
      }

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

      if (isIOSDevice) ctx.restore();

      const newTexture = new THREE.CanvasTexture(canvas);
      newTexture.needsUpdate = true;
      newTexture.minFilter = THREE.LinearFilter;
      newTexture.magFilter = THREE.LinearFilter;
      newTexture.anisotropy = 1; // Lower for iOS performance

      console.log("Texture updated with cropped canvas");
      setTexture(newTexture);
      setLoaded(true);
    };

    img.onerror = (err) => {
      console.error("Image loading error:", err);
      setHasError(true);
    };
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
            opacity={1} // Slightly reduce opacity to ensure camera shows through
            alphaTest={0.1}
            side={THREE.DoubleSide}
            depthWrite={false} // Change to false to prevent blocking camera
            depthTest={true}
            color="white"
          />
        </mesh>
      ) : null}
    </>
  );
};

export default ImagePlane;

<ImagePlane
  scrollOffset={scrollY}
  position={[1, 0.3, -5]} // Changed Z for more distance
  scale={[3.0, 3, 1]} // Increased scale to compensate for distance
  rotation={[0, 0, 0]}
/>;
