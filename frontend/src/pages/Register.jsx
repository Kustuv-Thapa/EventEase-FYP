import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { validateRegisterForm } from "../utils/validators";
import ErrorMessage from "../components/ErrorMessage";
import "../assets/styles/forms.css";

const ROLES = [
  { value: "ATTENDEE",  icon: "🎟",  label: "Attendee",  desc: "Browse & register for events" },
  { value: "ORGANIZER", icon: "🎪",  label: "Organizer", desc: "Create & manage events" },
];

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "ATTENDEE" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateRegisterForm(formData);
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    try {
      setErrors({}); setServerError(""); setLoading(true);
      await register(formData);
      navigate("/login");
    } catch (error) {
      setServerError(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <div className="form-container">
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
          <h2>Create account</h2>
          <p className="form-subtitle">Join EventEase — it's free</p>
        </div>

        <ErrorMessage message={serverError} />

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className={`form-group${errors.name ? ' has-error' : ''}`}>
            <label>Full Name</label>
            <input name="name" placeholder="Your full name" onChange={handleChange} autoComplete="off" />
            {errors.name && <p className="error">{errors.name}</p>}
          </div>
          <div className={`form-group${errors.email ? ' has-error' : ''}`}>
            <label>Email</label>
            <input name="email" type="email" placeholder="you@example.com" onChange={handleChange} autoComplete="off" />
            {errors.email && <p className="error">{errors.email}</p>}
          </div>
          <div className={`form-group${errors.password ? ' has-error' : ''}`}>
            <label>Password</label>
            <input name="password" type="password" placeholder="Min 6 characters" onChange={handleChange} autoComplete="new-password" />
            {errors.password && <p className="error">{errors.password}</p>}
          </div>

          <div className="form-group">
            <label>I want to</label>
            <div className="role-selector">
              {ROLES.map((r) => (
                <div
                  key={r.value}
                  className={`role-option${formData.role === r.value ? " selected" : ""}`}
                  onClick={() => setFormData((p) => ({ ...p, role: r.value }))}
                >
                  <div className="role-icon">{r.icon}</div>
                  <div className="role-label">{r.label}</div>
                  <div className="role-desc">{r.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className={`btn btn-primary btn-lg form-submit${loading ? ' btn-loading' : ''}`} disabled={loading}>
            {loading ? "Creating account…" : "Create Account →"}
          </button>
        </form>

        <p className="form-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
