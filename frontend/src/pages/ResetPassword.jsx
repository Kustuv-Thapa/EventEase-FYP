import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { resetPasswordApi } from "../api/authApi";
import ErrorMessage from "../components/ErrorMessage";
import "../assets/styles/forms.css";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirm) { setError("Passwords do not match"); return; }
    if (!token) { setError("Invalid or missing reset token"); return; }
    setError(""); setLoading(true);
    try {
      await resetPasswordApi(token, newPassword);
      navigate("/login", { state: { message: "Password reset successfully. Please log in." } });
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <div className="form-container">
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <h2>Set new password</h2>
          <p className="form-subtitle">Choose a strong password for your account</p>
        </div>

        <ErrorMessage message={error} />

        <form onSubmit={handleSubmit}>
          <div className={`form-group${error ? ' has-error' : ''}`}>
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </div>
          <div className={`form-group${error ? ' has-error' : ''}`}>
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              required
            />
          </div>
          <button type="submit" className={`btn btn-primary btn-lg form-submit${loading ? ' btn-loading' : ''}`} disabled={loading}>
            {loading ? "Resetting..." : "Reset Password →"}
          </button>
        </form>

        <p className="form-footer" style={{ marginTop: 20 }}>
          <Link to="/login">← Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
