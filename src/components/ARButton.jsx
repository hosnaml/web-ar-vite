const ARButton = ({ onClick, isSupported, loading, sessionActive }) => {
  return (
    <div className="button-container">
      <button
        onClick={onClick}
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
  );
};

export default ARButton;
