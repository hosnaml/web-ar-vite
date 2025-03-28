import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import { useState } from "react";
import * as THREE from "three";
import aftonbladetImg from "../assets/www.aftonbladet.se.jpg";

// Component for rendering a textured plane with error handling
const ImagePlane = (props) => {
  const [hasError, setHasError] = useState(false);

  let texture;
  try {
    texture = useLoader(TextureLoader, aftonbladetImg);
  } catch (error) {
    console.error("Error loading texture:", error);
    setHasError(true);
  }

  return (
    <mesh {...props}>
      <planeGeometry args={[1, 0.6]} />
      {!hasError ? (
        <meshBasicMaterial map={texture} transparent />
      ) : (
        <meshBasicMaterial color="#4285F4" transparent />
      )}
    </mesh>
  );
};

export default ImagePlane;
