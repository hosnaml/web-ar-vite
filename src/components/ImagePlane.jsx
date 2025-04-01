import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import aftonbladetImg from "../assets/www.aftonbladet.se.jpg";
import { useEffect, useState } from "react";

const ImagePlane = (props) => {
  const [hasError, setHasError] = useState(false);

  let texture;
  try {
    texture = useLoader(TextureLoader, aftonbladetImg);
  } catch (err) {
    console.error("Error loading texture:", err);
    setHasError(true);
  }

  return (
    <mesh {...props}>
      <planeGeometry args={[1, 1]} />
      {!hasError ? (
        <meshBasicMaterial map={texture} transparent />
      ) : (
        <meshBasicMaterial color="blue" />
      )}
    </mesh>
  );
};

export default ImagePlane;
