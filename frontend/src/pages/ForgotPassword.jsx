import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordApi } from "../api/authApi";
import ErrorMessage from "../components/ErrorMessage";
import "../assets/styles/forms.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(""); setMessage(""); setLoading(true);
    try {
      await forgotPasswordApi(email.trim());
      setMessage("If that email is registered, a reset link has been sent. Check your inbox.");
    } catch (err) {
      setError(err.response?.data?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <div className="form-container">
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔑</div>
          <h2>Forgot password?</h2>
          <p className="form-subtitle">Enter your email and we'll send a reset link</p>
        </div>

        <ErrorMessage message={error} />

        {message ? (
          <div className="alert alert-success">{message}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <button type="submit" className={`btn btn-primary btn-lg form-submit${loading ? ' btn-loading' : ''}`} disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link →"}
            </button>
          </form>
        )}

        <p className="form-footer" style={{ marginTop: 20 }}>
          <Link to="/login">← Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
