import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import fantaBackground from "../assets/Fanta-Background.png";

const FantaBackground = ({ position = [3.0, 0.0, -3.7], ...props }) => {
  const [hasError, setHasError] = useState(false);
  const [texture, setTexture] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const materialRef = useRef();
  const meshRef = useRef();

  // State to track initial positioning
  const initialPositionSet = useRef(false);
  const initialPosition = useRef(new THREE.Vector3());

  // Check if device is iOS for optimizations
  const isIOS = () => {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  };
  const isIOSDevice = isIOS();
  const DEBUG = true;

  // Create texture using canvas approach similar to ImagePlane
  useEffect(() => {
    createCanvasTexture();

    // Cleanup function
    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, []);

  // Canvas-based texture creation (similar to ImagePlane)
  const createCanvasTexture = () => {
    const canvas = document.createElement("canvas");
    canvas.width = isIOSDevice ? 256 : 512; // Lower resolution for iOS
    canvas.height = isIOSDevice ? 384 : 768;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    // Create and load image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = fantaBackground?.src || fantaBackground;

    img.onload = () => {
      // iOS-specific optimizations
      if (isIOSDevice) {
        ctx.save();
        ctx.imageSmoothingQuality = "high";
      }

      // Clear and draw image to canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      if (isIOSDevice) ctx.restore();

      // Create texture from canvas (more stable than direct loading)
      const newTexture = new THREE.CanvasTexture(canvas);
      newTexture.needsUpdate = true;
      newTexture.minFilter = THREE.LinearFilter;
      newTexture.magFilter = THREE.LinearFilter;
      newTexture.anisotropy = 1; // Lower for iOS performance

      DEBUG && console.log("Fanta background texture created with canvas");
      setTexture(newTexture);
      setLoaded(true);
    };

    img.onerror = (error) => {
      console.error("Error loading Fanta background image:", error);
      setHasError(true);
    };
  };

  // Position and orient the background plane behind the Fanta model
  useFrame(({ camera }) => {
    if (!meshRef.current || !loaded) return;

    // If initial position hasn't been set yet, set it once
    if (!initialPositionSet.current) {
      // Get camera direction
      const cameraDirection = new THREE.Vector3(0, 0, -1);
      cameraDirection.applyQuaternion(camera.quaternion);

      // Position it behind where the Fanta model will be
      // Add extra Z offset to ensure it's behind the can
      const zDistance = position[2]; // Should be -3.7, further back than Fanta can

      // Get right vector from camera for X positioning
      const rightVector = new THREE.Vector3(1, 0, 0);
      rightVector.applyQuaternion(camera.quaternion);
      const xOffset = position[0]; // Should be 3.0, same as Fanta can

      // Calculate position
      const forwardOffset = cameraDirection
        .clone()
        .multiplyScalar(Math.abs(zDistance));
      const sideOffset = rightVector.multiplyScalar(xOffset);

      // Set initial position with both forward and side offsets
      initialPosition.current.set(
        camera.position.x + forwardOffset.x + sideOffset.x,
        camera.position.y + position[1],
        camera.position.z + forwardOffset.z + sideOffset.z
      );

      // Move mesh to initial position
      meshRef.current.position.copy(initialPosition.current);

      // Mark initial position as set
      initialPositionSet.current = true;
      DEBUG &&
        console.log("Fanta background positioned at:", initialPosition.current);
    }

    // Always face camera (billboard effect)
    meshRef.current.lookAt(camera.position);
  });

  // Don't render if there are errors or texture isn't loaded
  if (hasError || !loaded || !texture) return null;

  return (
    <>
      {loaded && !hasError ? (
        <mesh
          ref={meshRef}
          renderOrder={1} // Lower than can (2)
          {...props}
        >
          <planeGeometry args={[2.8, 4.2]} />
          <meshBasicMaterial
            ref={materialRef}
            map={texture}
            transparent={true} // Background needs transparency
            opacity={0.9} // Slightly transparent
            alphaTest={0.1}
            side={THREE.DoubleSide}
            depthWrite={false} // Don't write to depth buffer
            depthTest={true} // But still test against it
            color="white"
          />
        </mesh>
      ) : null}
    </>
  );
};

export default FantaBackground;
