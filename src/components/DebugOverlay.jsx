const DebugOverlay = ({
  isSupported,
  sessionActive,
  forceRender,
  isIOSDevice,
}) => {
  return (
    <div className="debug-overlay">
      WebXR: {isSupported ? "✓" : "✗"} | Session:{" "}
      {sessionActive ? "Active" : "Inactive"} | Force:{" "}
      {forceRender ? "Yes" : "No"} | iOS: {isIOSDevice ? "Yes" : "No"}
    </div>
  );
};

export default DebugOverlay;
