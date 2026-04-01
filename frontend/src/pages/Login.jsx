import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { validateLoginForm } from "../utils/validators";
import ErrorMessage from "../components/ErrorMessage";
import "../assets/styles/forms.css";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMsg = location.state?.message || "";
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateLoginForm(formData);
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    try {
      setErrors({}); setServerError(""); setLoading(true);
      await login(formData);
      navigate("/");
    } catch (error) {
      setServerError(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <div className="form-container">
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>👋</div>
          <h2>Welcome back</h2>
          <p className="form-subtitle">Sign in to your EventEase account</p>
        </div>

        {successMsg && (
          <div className="alert alert-success" style={{ marginBottom: 20 }}>{successMsg}</div>
        )}
        <ErrorMessage message={serverError} />

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className={`form-group${errors.email ? ' has-error' : ''}`}>
            <label>Email</label>
            <input type="email" name="email" placeholder="you@example.com" onChange={handleChange} autoComplete="new-password" />
            {errors.email && <p className="error">{errors.email}</p>}
          </div>
          <div className={`form-group${errors.password ? ' has-error' : ''}`}>
            <label>Password</label>
            <input type="password" name="password" placeholder="Your password" onChange={handleChange} autoComplete="new-password" />
            {errors.password && <p className="error">{errors.password}</p>}
          </div>
          <button type="submit" className={`btn btn-primary btn-lg form-submit${loading ? ' btn-loading' : ''}`} disabled={loading}>
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        <p className="form-footer" style={{ marginTop: 16 }}>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
        <p className="form-footer">
          No account? <Link to="/register">Create one free</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
