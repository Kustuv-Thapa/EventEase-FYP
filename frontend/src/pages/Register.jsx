import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { validateRegisterForm } from "../utils/validators";
import ErrorMessage from "../components/ErrorMessage";
import "../assets/styles/forms.css";

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
    <div className="form-container">
      <h2>Create account</h2>
      <p className="form-subtitle">Join EventEase today</p>
      <ErrorMessage message={serverError} />
      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="form-group">
          <label>Full Name</label>
          <input name="name" placeholder="Your name" onChange={handleChange} autoComplete="off" />
          {errors.name && <p className="error">{errors.name}</p>}
        </div>
        <div className="form-group">
          <label>Email</label>
          <input name="email" type="email" placeholder="you@example.com" onChange={handleChange} autoComplete="off" />
          {errors.email && <p className="error">{errors.email}</p>}
        </div>
        <div className="form-group">
          <label>Password</label>
          <input name="password" type="password" placeholder="Min 6 characters" onChange={handleChange} autoComplete="new-password" />
          {errors.password && <p className="error">{errors.password}</p>}
        </div>
        <div className="form-group">
          <label>Role</label>
          <select name="role" onChange={handleChange} value={formData.role}>
            <option value="ATTENDEE">Attendee — Browse and register for events</option>
            <option value="ORGANIZER">Organizer — Create and manage events</option>
          </select>
        </div>
        <button type="submit" className="btn-primary form-submit" disabled={loading}>
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>
      <p className="form-footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
};

export default Register;
