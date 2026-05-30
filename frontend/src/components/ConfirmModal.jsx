const ConfirmModal = ({ isOpen, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", onConfirm, onCancel, danger = true }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)",
      padding: "24px",
    }}>
      <div style={{
        background: "var(--surface)", borderRadius: "var(--radius-xl)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        padding: "32px 28px", maxWidth: 420, width: "100%",
        border: "1px solid var(--border)",
      }}>
        <div style={{ fontSize: 36, marginBottom: 12, textAlign: "center" }}>
          {danger ? "⚠️" : "❓"}
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 8, textAlign: "center" }}>
          {title}
        </h3>
        <p style={{ fontSize: 14, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.6, marginBottom: 28 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "10px 24px", borderRadius: "var(--radius-sm)",
              border: "1.5px solid var(--border)", background: "var(--surface)",
              color: "var(--text-secondary)", fontWeight: 600, fontSize: 14,
              cursor: "pointer", minWidth: 100,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "10px 24px", borderRadius: "var(--radius-sm)",
              border: "none",
              background: danger
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : "linear-gradient(135deg, var(--primary), var(--primary-dark))",
              color: "#fff", fontWeight: 700, fontSize: 14,
              cursor: "pointer", minWidth: 100,
              boxShadow: danger ? "0 4px 12px rgba(239,68,68,0.3)" : "var(--shadow-primary)",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
