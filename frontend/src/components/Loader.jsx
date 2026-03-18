const Loader = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "60px 0" }}>
    <div style={{
      width: 36,
      height: 36,
      border: "3px solid #e2e8f0",
      borderTop: "3px solid #4f46e5",
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite"
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default Loader;
