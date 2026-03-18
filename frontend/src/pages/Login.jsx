import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { validateLoginForm } from "../utils/validators";
import ErrorMessage from "../components/ErrorMessage";
import "../assets/styles/forms.css";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
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
    <div className="form-container">
      <h2>Welcome back</h2>
      <p className="form-subtitle">Sign in to your account</p>
      <ErrorMessage message={serverError} />
      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="form-group">
          <label>Email</label>
          <input type="email" name="email" placeholder="you@example.com" onChange={handleChange} autoComplete="new-password" />
          {errors.email && <p className="error">{errors.email}</p>}
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" name="password" placeholder="Password" onChange={handleChange} autoComplete="new-password" />
          {errors.password && <p className="error">{errors.password}</p>}
        </div>
        <button type="submit" className="btn-primary form-submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
      <p className="form-footer">
        Don't have an account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
};

export default Login;
