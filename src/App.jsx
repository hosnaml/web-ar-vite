import { Canvas } from "@react-three/fiber";
import { createXRStore, XR, XROrigin } from "@react-three/xr";
import { useState, useEffect } from "react";
import "./App.css"; // Make sure CSS is imported

// Enable debugging where needed, but reduce verbosity
const DEBUG = true;
const logDebug = (...args) => DEBUG && console.log(...args);

// Clean store creation
const store = createXRStore({
  onEnter: () => logDebug("XR session started"),
  onExit: () => logDebug("XR session ended"),
  requiredFeatures: ["camera"],
  optionalFeatures: [
    "dom-overlay",
    "light-estimation",
    "hit-test",
    "local-floor",
  ],
  domOverlay: { root: document.body },
  blendMode: "alpha-blend",
});

export default function App() {
  const [isSupported, setIsSupported] = useState(true);
  const [red, setRed] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check WebXR support once on component mount
  useEffect(() => {
    if ("xr" in navigator) {
      navigator.xr
        .isSessionSupported("immersive-ar")
        .then((supported) => {
          setIsSupported(supported);
          if (!supported) {
            console.warn("WebXR AR not supported in this browser");
          }
        })
        .catch((err) => {
          console.error("Error checking AR support:", err);
          setIsSupported(false);
        });
    } else {
      setIsSupported(false);
      console.warn("WebXR not supported in this browser");
    }
  }, []);

  // Simplified session tracking - single source of truth
  useEffect(() => {
    const handleSessionStateChange = (state) => {
      // Set session active if both conditions are met
      if (state.session && state.referenceSpace) {
        setSessionActive(true);
      } else {
        setSessionActive(state.supported && state.active);
      }
    };

    const unsubscribe = store.subscribe(handleSessionStateChange);
    return () => unsubscribe();
  }, []);

  // Streamlined enterAR function
  const enterAR = async () => {
    setLoading(true);
    try {
      // Pre-warm camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      // Create video element to initialize camera
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.style.position = "absolute";
      video.style.opacity = "0";
      video.style.zIndex = "-1";
      document.body.appendChild(video);

      // Play video
      await video.play().catch(() => {});

      // Wait for camera to warm up
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Clean up
      stream.getTracks().forEach((track) => track.stop());
      video.remove();

      // Enter AR mode
      await store.enterAR();

      // Fallback in case session state doesn't update
      setTimeout(() => {
        if (!sessionActive) {
          setSessionActive(true);
        }
      }, 2000);
    } catch (error) {
      console.error("AR initialization error:", error);
      alert("Camera access is required for AR functionality");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`ar-container ${DEBUG ? "debug-border" : ""}`}>
      {/* Button container */}
      <div className="button-container">
        <button
          onClick={enterAR}
          className="ar-button"
          disabled={!isSupported || loading}
        >
          {loading
            ? "Loading..."
            : !isSupported
            ? "AR Not Supported"
            : sessionActive
            ? "AR Running"
            : "Enter AR"}
        </button>
      </div>

      {/* Minimal debug overlay */}
      {DEBUG && (
        <div className="debug-overlay">
          WebXR: {isSupported ? "✓" : "✗"} | Session:{" "}
          {sessionActive ? "Active" : "Inactive"}
        </div>
      )}

      <Canvas
        className="ar-canvas"
        gl={{
          alpha: true, // CRITICAL for iOS camera passthrough
          antialias: true,
          preserveDrawingBuffer: true,
          clearColor: [0, 0, 0, 0], // fully transparent
          powerPreference: "high-performance",
        }}
        onCreated={(state) => {
          // Force transparent background for the renderer
          state.gl.setClearColor(0, 0, 0, 0);
          logDebug("Canvas created:", state);
        }}
      >
        {/* Explicitly set background to transparent */}
        <color attach="background" args={[0, 0, 0, 0]} />

        <XR store={store}>
          <XROrigin />
          {(sessionActive || store.getState().session) && (
            <>
              <ambientLight intensity={0.8} />
              <directionalLight position={[5, 5, 5]} intensity={1} />

              <mesh
                onClick={() => setRed(!red)}
                position={[0, 1, -1]}
                // Make the mesh more visible for testing
                scale={[0.5, 0.5, 0.5]}
              >
                <boxGeometry />
                <meshBasicMaterial
                  color={red ? "red" : "blue"}
                  emissive={red ? "red" : "blue"}
                  emissiveIntensity={0.5}
                />
              </mesh>

              {/* Add a ground plane for reference */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <planeGeometry args={[10, 10]} />
                <meshBasicMaterial color="#444444" opacity={0.5} transparent />
              </mesh>
            </>
          )}
        </XR>
      </Canvas>
    </div>
  );
}
