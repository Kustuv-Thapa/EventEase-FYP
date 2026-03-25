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
    <div className="form-container">
      <h2>Forgot Password</h2>
      <p className="form-subtitle">Enter your email to receive a reset link</p>
      <ErrorMessage message={error} />
      {message && (
        <div style={{ background: "#dcfce7", color: "#166534", border: "1px solid #22c55e", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 14 }}>
          {message}
        </div>
      )}
      {!message && (
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
          <button type="submit" className="btn-primary form-submit" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}
      <p className="form-footer">
        <Link to="/login">Back to Login</Link>
      </p>
    </div>
  );
};

export default ForgotPassword;
