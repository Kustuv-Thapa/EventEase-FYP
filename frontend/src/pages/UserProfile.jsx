import { useState, useRef } from "react";
import useAuth from "../hooks/useAuth";
import { updateProfileApi, changePasswordApi } from "../api/authApi";
import toast from "react-hot-toast";
import "../assets/styles/forms.css";

const ROLE_LABELS = { ATTENDEE: "Attendee", ORGANIZER: "Organizer", ADMIN: "Admin" };
const ROLE_ICONS  = { ATTENDEE: "🎟", ORGANIZER: "🎪", ADMIN: "🛡️" };

export default function UserProfile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user?.name || "", email: user?.email || "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setAvatarPreview(ev.target.result); setAvatarChanged(true); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveAvatar = () => { setAvatarPreview(""); setAvatarChanged(true); };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const name  = profileForm.name.trim();
    const email = profileForm.email.trim().toLowerCase();
    if (!name)  { toast.error("Name is required"); return; }
    if (!email) { toast.error("Email is required"); return; }

    const updates = {};
    if (name  !== user.name)  updates.name  = name;
    if (email !== user.email) updates.email = email;
    if (avatarChanged)        updates.avatar = avatarPreview;

    if (Object.keys(updates).length === 0) { toast("No changes to save."); return; }

    setProfileLoading(true);
    try {
      const res = await updateProfileApi(updates);
      updateUser(res.data.data.user);
      setAvatarChanged(false);
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = pwForm;
    if (!currentPassword)                   { toast.error("Current password is required"); return; }
    if (newPassword.length < 8)             { toast.error("Password must be at least 8 characters"); return; }
    if (!/[A-Z]/.test(newPassword))         { toast.error("Password must contain at least one uppercase letter"); return; }
    if (!/[0-9]/.test(newPassword))         { toast.error("Password must contain at least one number"); return; }
    if (!/[^A-Za-z0-9]/.test(newPassword)) { toast.error("Password must contain at least one special character"); return; }
    if (newPassword !== confirmPassword)    { toast.error("Passwords do not match"); return; }

    setPwLoading(true);
    try {
      await changePasswordApi({ currentPassword, newPassword });
      toast.success("Password changed successfully!");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <div className="page-banner">
        <div className="page-banner-inner">
          <h1>My Profile</h1>
          <p>Manage your account information and password</p>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 56px" }}>

        {/* Avatar + identity card */}
        <div style={{
          background: "var(--surface)", borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)",
          padding: "28px 32px", marginBottom: 28,
          display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
        }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div onClick={handleAvatarClick} title="Change profile picture" style={{
              width: 80, height: 80, borderRadius: "50%", cursor: "pointer", overflow: "hidden",
              background: avatarPreview ? "transparent" : "linear-gradient(135deg, #6366f1, #4f46e5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, fontWeight: 900, color: "#fff",
              boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
              border: "3px solid #fff", outline: "2px solid #c7d2fe",
            }}>
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials}
            </div>
            <div onClick={handleAvatarClick} style={{
              position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%",
              background: "#6366f1", border: "2px solid #fff",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 12,
            }}>📷</div>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", marginBottom: 4 }}>{user?.name}</div>
            <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 10 }}>{user?.email}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe", borderRadius: 999, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
                {ROLE_ICONS[user?.role]} {ROLE_LABELS[user?.role] || user?.role}
              </span>
              <button type="button" onClick={handleAvatarClick} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 999, padding: "3px 12px", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer" }}>
                Change photo
              </button>
              {avatarPreview && (
                <button type="button" onClick={handleRemoveAvatar} style={{ background: "none", border: "1px solid #fecdd3", borderRadius: 999, padding: "3px 12px", fontSize: 12, fontWeight: 600, color: "#dc2626", cursor: "pointer" }}>
                  Remove photo
                </button>
              )}
            </div>
            {avatarChanged && (
              <p style={{ fontSize: 12, color: "#d97706", marginTop: 8, fontWeight: 600 }}>
                ⚠ Unsaved — click "Save Changes" below to apply
              </p>
            )}
          </div>
        </div>

        {/* Account info form */}
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden", marginBottom: 24 }}>
          <div style={{ padding: "16px 28px", background: "linear-gradient(135deg, #eef2ff, #f5f3ff)", borderBottom: "1px solid #e0e7ff", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>👤</span>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#3730a3", margin: 0 }}>Account Information</h3>
          </div>
          <form onSubmit={handleProfileSubmit} style={{ padding: "24px 28px" }}>
            <div className="form-group">
              <label>Full Name</label>
              <input name="name" value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} placeholder="Your full name" required />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input name="email" type="email" value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} placeholder="you@example.com" required />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button type="submit" disabled={profileLoading} className={`btn btn-primary${profileLoading ? " btn-loading" : ""}`}>
                {profileLoading ? "Saving…" : "Save Changes"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setProfileForm({ name: user?.name || "", email: user?.email || "" }); setAvatarPreview(user?.avatar || ""); setAvatarChanged(false); }}>
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Change password form */}
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
          <div style={{ padding: "16px 28px", background: "linear-gradient(135deg, #fff7ed, #fef3c7)", borderBottom: "1px solid #fde68a", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>🔒</span>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#92400e", margin: 0 }}>Change Password</h3>
          </div>
          <form onSubmit={handlePasswordSubmit} style={{ padding: "24px 28px" }}>
            <div className="form-group">
              <label>Current Password</label>
              <input name="currentPassword" type={showPasswords ? "text" : "password"} value={pwForm.currentPassword} onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))} placeholder="Your current password" required />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input name="newPassword" type={showPasswords ? "text" : "password"} value={pwForm.newPassword} onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))} placeholder="Min 8 chars, uppercase, number, special char" required />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input name="confirmPassword" type={showPasswords ? "text" : "password"} value={pwForm.confirmPassword} onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))} placeholder="Repeat new password" required />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--text-secondary)", userSelect: "none" }}>
                <input type="checkbox" checked={showPasswords} onChange={(e) => setShowPasswords(e.target.checked)} style={{ width: 15, height: 15, cursor: "pointer" }} />
                Show passwords
              </label>
            </div>
            {pwForm.newPassword && (
              <div style={{ background: "#f8fafc", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                {[
                  { label: "8+ characters",    ok: pwForm.newPassword.length >= 8 },
                  { label: "Uppercase letter",  ok: /[A-Z]/.test(pwForm.newPassword) },
                  { label: "Number",            ok: /[0-9]/.test(pwForm.newPassword) },
                  { label: "Special character", ok: /[^A-Za-z0-9]/.test(pwForm.newPassword) },
                ].map(({ label, ok }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                    <span style={{ color: ok ? "#16a34a" : "#94a3b8", fontSize: 14 }}>{ok ? "✓" : "○"}</span>
                    <span style={{ color: ok ? "#15803d" : "var(--text-muted)", fontWeight: ok ? 600 : 400 }}>{label}</span>
                  </div>
                ))}
              </div>
            )}
            <button type="submit" disabled={pwLoading} className={`btn btn-primary${pwLoading ? " btn-loading" : ""}`}>
              {pwLoading ? "Changing…" : "Change Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
