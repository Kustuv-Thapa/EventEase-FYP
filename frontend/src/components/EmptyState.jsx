const EmptyState = ({ icon = "📭", title = "Nothing here yet", message, action }) => (
  <div className="empty-state fade-in">
    <div className="empty-icon">{icon}</div>
    <h3>{title}</h3>
    {message && <p>{message}</p>}
    {action && <div style={{ marginTop: 16 }}>{action}</div>}
  </div>
);

export default EmptyState;
