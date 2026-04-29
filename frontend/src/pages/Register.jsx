import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { validateRegisterForm } from "../utils/validators";
import { resendOtpApi } from "../api/authApi";
import ErrorMessage from "../components/ErrorMessage";
import "../assets/styles/forms.css";

const ROLES = [
  { value: "ATTENDEE",  icon: "🎟",  label: "Attendee",  desc: "Browse & register for events" },
  { value: "ORGANIZER", icon: "🎪",  label: "Organizer", desc: "Create & manage events" },
];

const Register = () => {
  const { register, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "ATTENDEE" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP step
  const [step, setStep] = useState("register"); // "register" | "otp"
  const [pendingEmail, setPendingEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateRegisterForm(formData);
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    try {
      setErrors({}); setServerError(""); setLoading(true);
      await register(formData);
      setPendingEmail(formData.email);
      setStep("otp");
    } catch (error) {
      setServerError(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) { setOtpError("Please enter the 6-digit code"); return; }
    try {
      setOtpError(""); setOtpLoading(true);
      await verifyOtp({ email: pendingEmail, otp: otp.trim() });
      navigate("/");
    } catch (error) {
      setOtpError(error.response?.data?.message || "Verification failed");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResendMsg(""); setResendLoading(true);
      await resendOtpApi(pendingEmail);
      setResendMsg("A new code has been sent to your email.");
    } catch {
      setResendMsg("Failed to resend. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <div className="form-page">
        <div className="form-container">
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
            <h2>Check your email</h2>
            <p className="form-subtitle">
              We sent a 6-digit code to <strong>{pendingEmail}</strong>
            </p>
          </div>

          {otpError && <ErrorMessage message={otpError} />}
          {resendMsg && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#15803d", marginBottom: 16 }}>
              {resendMsg}
            </div>
          )}

          <form onSubmit={handleVerifyOtp} autoComplete="off">
            <div className="form-group">
              <label>Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                style={{ fontSize: 28, letterSpacing: 10, textAlign: "center", fontWeight: 700 }}
                autoFocus
              />
            </div>

            <button
              type="submit"
              className={`btn btn-primary btn-lg form-submit${otpLoading ? " btn-loading" : ""}`}
              disabled={otpLoading}
            >
              {otpLoading ? "Verifying…" : "Verify Account →"}
            </button>
          </form>

          <p className="form-footer" style={{ marginTop: 20 }}>
            Didn't receive it?{" "}
            <button
              onClick={handleResend}
              disabled={resendLoading}
              style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "inherit" }}
            >
              {resendLoading ? "Sending…" : "Resend code"}
            </button>
          </p>
          <p className="form-footer">
            <button
              onClick={() => setStep("register")}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, fontSize: "inherit" }}
            >
              ← Back to registration
            </button>
          </p>
        </div>
      </div>
    );
  }

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
          <div className={`form-group${errors.name ? " has-error" : ""}`}>
            <label>Full Name</label>
            <input name="name" placeholder="Your full name" onChange={handleChange} autoComplete="off" />
            {errors.name && <p className="error">{errors.name}</p>}
          </div>
          <div className={`form-group${errors.email ? " has-error" : ""}`}>
            <label>Email</label>
            <input name="email" type="email" placeholder="you@example.com" onChange={handleChange} autoComplete="off" />
            {errors.email && <p className="error">{errors.email}</p>}
          </div>
          <div className={`form-group${errors.password ? " has-error" : ""}`}>
            <label>Password</label>
            <input name="password" type="password" placeholder="Min 8 chars, uppercase, number, special char" onChange={handleChange} autoComplete="new-password" />
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

          <button type="submit" className={`btn btn-primary btn-lg form-submit${loading ? " btn-loading" : ""}`} disabled={loading}>
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
