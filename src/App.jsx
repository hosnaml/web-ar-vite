import { Canvas } from "@react-three/fiber";
import { createXRStore, XR, XROrigin } from "@react-three/xr";
import { useState, useEffect, useRef } from "react";
import "./App.css";

// Enable debugging where needed
const DEBUG = true;
const logDebug = (...args) => DEBUG && console.log(...args);

// Modified store creation with improved logging
const store = createXRStore({
  onEnter: () => {
    logDebug("XR session started");
    // Force a global flag that we can check
    window.xrSessionActive = true;
  },
  onExit: () => {
    logDebug("XR session ended");
    window.xrSessionActive = false;
  },
  requiredFeatures: ["camera"],
  optionalFeatures: ["dom-overlay", "light-estimation"],
  domOverlay: { root: document.body },
  blendMode: "alpha-blend",
});

export default function App() {
  const [isSupported, setIsSupported] = useState(true);
  const [red, setRed] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [loading, setLoading] = useState(false);
  // Add a forced render state to guarantee cube visibility
  const [forceRender, setForceRender] = useState(false);
  const sessionStartTimeRef = useRef(null);

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

  // Enhanced session tracking with multiple triggers to ensure cube renders
  useEffect(() => {
    const handleSessionStateChange = (state) => {
      const newSessionActive = state.supported && state.active;

      if (newSessionActive && !sessionActive) {
        // Session just became active
        sessionStartTimeRef.current = Date.now();
        logDebug("Session became active at:", new Date().toISOString());

        // Force render the cube
        setForceRender(true);
      }

      setSessionActive(newSessionActive);

      // Additional logging to debug cube visibility
      if (state.session && state.referenceSpace) {
        logDebug("Both session and referenceSpace available");
      }
    };

    const unsubscribe = store.subscribe(handleSessionStateChange);
    return () => unsubscribe();
  }, [sessionActive]);

  // Check session state periodically to ensure cube renders
  useEffect(() => {
    if (sessionActive && sessionStartTimeRef.current) {
      const checkInterval = setInterval(() => {
        const elapsedTime = Date.now() - sessionStartTimeRef.current;

        // If we've been active for 2+ seconds but cube might not be visible
        if (elapsedTime > 2000 && !forceRender) {
          logDebug("Forcing render after timeout");
          setForceRender(true);
        }

        // Clear interval after 5 seconds
        if (elapsedTime > 5000) {
          clearInterval(checkInterval);
        }
      }, 1000);

      return () => clearInterval(checkInterval);
    }
  }, [sessionActive, forceRender]);

  // Improved enterAR function
  const enterAR = async () => {
    setLoading(true);
    try {
      logDebug("Starting enterAR process");
      // Pre-warm camera with lower resolution for performance
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 }, // Lower resolution for better performance
          height: { ideal: 480 },
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
      await video
        .play()
        .catch((e) => logDebug("Video play error (can be ignored):", e));

      logDebug("Camera preview initialized");

      // Wait for camera to warm up (shorter time for better UX)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Clean up
      stream.getTracks().forEach((track) => track.stop());
      video.remove();
      logDebug("Camera warmup complete");

      // Reset force render state before entering AR
      setForceRender(false);

      // Enter AR mode
      await store.enterAR();
      logDebug("store.enterAR() completed");

      // Force cube to appear after a delay
      setTimeout(() => {
        if (!forceRender) {
          logDebug("Forcing render state via timeout");
          setForceRender(true);
        }
      }, 1000);
    } catch (error) {
      console.error("AR initialization error:", error);
      alert("Camera access is required for AR functionality");
    } finally {
      setLoading(false);
    }
  };

  // Determine if we should render 3D objects - use multiple conditions
  const shouldRender =
    sessionActive ||
    forceRender ||
    (store.getState() && store.getState().session);

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

      {/* Enhanced debug overlay */}
      {DEBUG && (
        <div className="debug-overlay">
          WebXR: {isSupported ? "✓" : "✗"} | Session:{" "}
          {sessionActive ? "Active" : "Inactive"} | Force:{" "}
          {forceRender ? "Yes" : "No"}
        </div>
      )}

      <Canvas
        className="ar-canvas"
        gl={{
          alpha: true,
          antialias: false, // For better performance
          preserveDrawingBuffer: true,
          clearColor: [0, 0, 0, 0],
          powerPreference: "high-performance",
        }}
        onCreated={(state) => {
          state.gl.setClearColor(0, 0, 0, 0);
          logDebug("Canvas created");
        }}
      >
        <color attach="background" args={[0, 0, 0, 0]} />

        <XR store={store}>
          <XROrigin />
          {/* IMPORTANT CHANGE: More aggressive conditions to ensure rendering */}
          {shouldRender && (
            <>
              <ambientLight intensity={0.8} />
              <directionalLight position={[5, 5, 5]} intensity={1} />

              {/* Make the cube bigger and closer so it's easier to see */}
              <mesh
                onClick={() => setRed(!red)}
                position={[0, 0.5, -0.7]} // Positioned closer and lower
                scale={[0.5, 0.5, 0.5]} // Smaller but still visible
              >
                <boxGeometry />
                <meshStandardMaterial // Changed to StandardMaterial for better visibility
                  color={red ? "#ff3030" : "#4040ff"} // Brighter colors
                  emissive={red ? "#ff0000" : "#0000ff"}
                  emissiveIntensity={0.8}
                  roughness={0.2}
                />
              </mesh>
            </>
          )}
        </XR>
      </Canvas>
    </div>
  );
}
