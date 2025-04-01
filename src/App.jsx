import { Canvas } from "@react-three/fiber";
import { createXRStore, XR, XROrigin } from "@react-three/xr";
import { useState, useEffect, useRef, Suspense } from "react";
import "./App.css";
import ImagePlane from "./components/ImagePlane";
import ARButton from "./components/ARButton";
import DebugOverlay from "./components/DebugOverlay";

// Enable debugging where needed
const DEBUG = true;
const logDebug = (...args) => DEBUG && console.log(...args);

// Detect iOS devices
const isIOS = () => {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

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
  //requiredFeatures: ["camera"],
  optionalFeatures: ["camera", "dom-overlay", "light-estimation", "hit-test"],
  domOverlay: { root: document.body },
  blendMode: "alpha-blend",
  environmentBlendMode: "alpha-blend",
});

export default function App() {
  const [isSupported, setIsSupported] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forceRender, setForceRender] = useState(false);
  const sessionStartTimeRef = useRef(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  // Check WebXR support once on component mount
  useEffect(() => {
    // Check if running on iOS
    setIsIOSDevice(isIOS());
    logDebug("Device is iOS:", isIOS());

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

  // Enhanced session tracking with multiple triggers to ensure rendering
  useEffect(() => {
    const handleSessionStateChange = (state) => {
      const newSessionActive = state.supported && state.active;

      if (newSessionActive && !sessionActive) {
        // Session just became active
        sessionStartTimeRef.current = Date.now();
        logDebug("Session became active at:", new Date().toISOString());

        // Force render
        setForceRender(true);
      }

      setSessionActive(newSessionActive);

      // Additional logging to debug visibility
      if (state.session && state.referenceSpace) {
        logDebug("Both session and referenceSpace available");
      }
    };

    const unsubscribe = store.subscribe(handleSessionStateChange);
    return () => unsubscribe();
  }, [sessionActive]);

  // Check session state periodically to ensure rendering
  useEffect(() => {
    if (sessionActive && sessionStartTimeRef.current) {
      const checkInterval = setInterval(() => {
        const elapsedTime = Date.now() - sessionStartTimeRef.current;

        // If we've been active for 2+ seconds but might not be visible
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
      video.className = "camera-warmup";
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

      // Force to appear after a delay
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
    <div
      className={`ar-container ${DEBUG ? "debug-border" : ""} ${
        isIOSDevice ? "ios-device" : ""
      }`}
    >
      <ARButton
        onClick={enterAR}
        isSupported={isSupported}
        loading={loading}
        sessionActive={sessionActive}
      />

      {DEBUG && (
        <DebugOverlay
          isSupported={isSupported}
          sessionActive={sessionActive}
          forceRender={forceRender}
          isIOSDevice={isIOSDevice}
        />
      )}

      <Canvas
        className="ar-canvas"
        gl={{
          alpha: true,
          antialias: isIOSDevice,
          preserveDrawingBuffer: true,
          clearColor: [0, 0, 0, 0], // Fully transparent clear color
          premultipliedAlpha: false, // Critical for transparency
          powerPreference: "high-performance",
        }}
        onCreated={(state) => {
          // Set transparent background
          state.gl.setClearColor(0, 0, 0, 0);
          state.scene.background = null;

          // For iOS, get proper WebGL context
          if (isIOSDevice) {
            try {
              const glContext = state.gl.getContext();
              if (glContext) {
                // Clear both buffers for a clean start
                glContext.clear(
                  glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT
                );
                // Disable depth testing for AR
                glContext.disable(glContext.DEPTH_TEST);
              }
            } catch (e) {
              console.error("WebGL context error:", e);
            }
          }

          logDebug("Canvas created");
        }}
        flat={isIOSDevice}
        legacy={isIOSDevice}
      >
        {/* Don't set any color attachment here */}
        <XR store={store}>
          <XROrigin />
          {shouldRender && (
            <Suspense fallback={null}>
              <ambientLight intensity={5.0} />
              <directionalLight position={[0, 0, -1]} intensity={5.0} />

              {/* Position the image closer to the camera */}
              <ImagePlane
                position={[0, 0, -0.2]} // Moved closer to camera, centered vertically
                scale={[1.5, 1.5, 1]} // Reduced scale to fit better in view
                rotation={[0, 0, 0]}
              />

              {/* Optional debug elements - uncomment if needed */}
              {/*
              <mesh position={[0, 0, -0.19]} scale={[0.05, 0.05, 0.05]}>
                <sphereGeometry />
                <meshBasicMaterial color="red" depthTest={false} />
              </mesh>
              */}
            </Suspense>
          )}
        </XR>
      </Canvas>
    </div>
  );
}
