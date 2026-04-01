const Loader = ({ size = 36, fullPage = false }) => {
  const spinner = (
    <div aria-live="polite" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div style={{
        width: size,
        height: size,
        border: `3px solid var(--border)`,
        borderTop: `3px solid var(--primary)`,
        borderRadius: "50%",
        animation: "spin 0.65s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }} aria-hidden="true">Loading...</span>
      <span className="visually-hidden">Loading…</span>
    </div>
  );

  if (fullPage) {
    return (
      <div style={{
        minHeight: "60vh", display: "flex",
        alignItems: "center", justifyContent: "center",
      }}>
        {spinner}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "60px 0" }}>
      {spinner}
    </div>
  );
};

export default Loader;
