import { Canvas } from "@react-three/fiber";
import { createXRStore, XR, XROrigin } from "@react-three/xr";
import { useState, useEffect, useRef, Suspense } from "react";
import * as THREE from "three";
import "./App.css";
import ImagePlane from "./components/ImagePlane";
import ARButton from "./components/ARButton";
import DebugOverlay from "./components/DebugOverlay";
import BenzAd from "./components/benzAd";
import FantaAd from "./components/FantaAd"; // Updated FantaAd with integrated background
import DrawerAd from "./components/DrawerAd";

const DEBUG = true;
const logDebug = (...args) => DEBUG && console.log(...args);

// Fix iOS detection function - there was a syntax error
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
  optionalFeatures: [
    "camera",
    "dom-overlay",
    "light-estimation",
    "hit-test",
    "hand-tracking",
  ],
  domOverlay: { root: document.body },
  blendMode: "alpha-blend", // This ensures proper camera background
  environmentBlendMode: "alpha-blend",
  referenceSpaceType: "local-floor",
  sessionInit: {
    depthSensing: {
      usagePreference: ["none"],
      dataFormatPreference: ["luminance-alpha"],
    },
  },
});

export default function App() {
  const [isSupported, setIsSupported] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    console.log("Session is active:", sessionActive);
  }, [sessionActive]);
  const [forceRender, setForceRender] = useState(false);
  const sessionStartTimeRef = useRef(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [arInitializing, setARInitializing] = useState(false);

  // In your App component, replace the existing touch handling with this:
  useEffect(() => {
    let touchStartY = null;

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 1 && touchStartY !== null) {
        const deltaY = touchStartY - e.touches[0].clientY;
        setScrollY((prev) => {
          let next = prev + deltaY * 0.001; // Adjust sensitivity if needed
          return Math.min(1, Math.max(0, next)); // Clamp between 0 and 1
        });
        touchStartY = e.touches[0].clientY;
      }
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

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
    setARInitializing(true); // Set initializing state
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

      // Keep AR initializing true for a brief period to show loading indicator
      setTimeout(() => {
        setARInitializing(false);
      }, 1500);

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
      setARInitializing(false);
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
      // Direct handlers on the container element for better iOS support
      onTouchStart={(e) => {
        if (isIOSDevice && sessionActive) {
          e.stopPropagation();
        }
      }}
      onTouchMove={(e) => {
        if (isIOSDevice && sessionActive) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
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

      {arInitializing && (
        <div className="ar-initializing-overlay">
          <div className="ar-loading-spinner"></div>
          <p>Initializing AR...</p>
        </div>
      )}

      {/* Wrap Canvas in a scroll container */}
      <div className="scroll-container">
        <Canvas
          className={`ar-canvas scroll-enabled ${
            sessionActive ? "ar-active" : ""
          }`}
          gl={{
            alpha: true,
            antialias: isIOSDevice,
            preserveDrawingBuffer: true,
            clearColor: [0, 0, 0, 0],
            premultipliedAlpha: false,
            powerPreference: "high-performance",
            xrCompatible: true,
          }}
          // Make sure scene is transparent
          onCreated={(state) => {
            state.gl.setClearColor(0, 0, 0, 0);
            state.scene.background = null;
            // Ensure proper clear flags
            state.gl.autoClear = false;

            if (isIOSDevice) {
              try {
                const glContext = state.gl.getContext();
                if (glContext) {
                  // Clear both buffers for a clean start
                  glContext.clear(
                    glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT
                  );
                  // Instead of disabling depth, configure it properly
                  glContext.depthFunc(glContext.LEQUAL);
                }
              } catch (e) {
                console.error("WebGL context error:", e);
              }
            }

            logDebug("Canvas created with transparent settings");
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

                <group>
                  <ImagePlane
                    scrollOffset={scrollY}
                    key="main-center"
                    position={[0, 0.8, -5]}
                    scale={[3.0, 4.0, 1]}
                    rotation={[0, 0, 0]}
                  />

                  {/* Move FantaAd above the BenzAd, closer to ImagePlane */}
                  <FantaAd
                    key="fanta-model"
                    position={[-2.5, 2.0, -4.2]} // was -3.5
                    scale={[0.5, 0.5, 0.5]}
                    text="Fanta"
                    textColor="#ff6600"
                    fontSize={0.2}
                    rotationSpeed={0.7}
                  />

                  {/* Keep BenzAd in the same position but closer to ImagePlane */}
                  <BenzAd
                    key="benz-model"
                    position={[-2.5, 0.0, -4.0]} // was -3.5
                    scale={[0.65, 0.65, 0.65]}
                    text="Mercedes-Benz"
                    textColor="#ffffff"
                    fontSize={0.2}
                    rotationSpeed={0.4}
                  />

                  {/* Move DrawerAd closer to ImagePlane */}
                  <DrawerAd
                    key="drawer-model"
                    position={[3, 1.0, -4.4]} // was -3.9
                    scale={[1.8, 1.8, 1.8]}
                    text="Modern Drawer"
                    textColor="#cccccc"
                    fontSize={0.2}
                    rotationSpeed={0.7}
                  />
                </group>
              </Suspense>
            )}
          </XR>
        </Canvas>
      </div>
    </div>
  );
}
