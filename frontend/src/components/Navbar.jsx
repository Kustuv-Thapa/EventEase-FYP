import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import useAuth from "../hooks/useAuth";
import "../assets/styles/navbar.css";

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const navLinks = (
    <>
      <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")} aria-current={location.pathname === "/" ? "page" : undefined}>Home</NavLink>
      <NavLink to="/events" className={({ isActive }) => (isActive ? "active" : "")} aria-current={location.pathname === "/events" ? "page" : undefined}>Events</NavLink>

      {isAuthenticated && user?.role !== "ADMIN" && (
        <>
          <NavLink to="/my-registrations" className={({ isActive }) => (isActive ? "active" : "")} aria-current={location.pathname === "/my-registrations" ? "page" : undefined}>My Registrations</NavLink>
          <NavLink to="/my-tickets" className={({ isActive }) => (isActive ? "active" : "")} aria-current={location.pathname === "/my-tickets" ? "page" : undefined}>My Tickets</NavLink>
        </>
      )}

      {user?.role === "ORGANIZER" && (
        <>
          <NavLink to="/organizer/events" className={({ isActive }) => (isActive ? "active" : "")} aria-current={location.pathname === "/organizer/events" ? "page" : undefined}>My Events</NavLink>
          <NavLink to="/verify-ticket" className={({ isActive }) => (isActive ? "active" : "")} aria-current={location.pathname === "/verify-ticket" ? "page" : undefined}>Verify Ticket</NavLink>
        </>
      )}

      {user?.role === "ADMIN" && (
        <>
          <NavLink to="/admin/dashboard" className={({ isActive }) => (isActive ? "active" : "")} aria-current={location.pathname === "/admin/dashboard" ? "page" : undefined}>Admin Dashboard</NavLink>
          <NavLink to="/admin/venues" className={({ isActive }) => (isActive ? "active" : "")} aria-current={location.pathname === "/admin/venues" ? "page" : undefined}>Venues</NavLink>
        </>
      )}
    </>
  );

  const authLinks = !isAuthenticated ? (
    <>
      <NavLink to="/login" className={({ isActive }) => (isActive ? "active" : "")} aria-current={location.pathname === "/login" ? "page" : undefined}>Login</NavLink>
      <NavLink to="/register" className={({ isActive }) => (isActive ? "active" : "")} aria-current={location.pathname === "/register" ? "page" : undefined}>Register</NavLink>
    </>
  ) : (
    <div className="navbar-user">
      <div className="navbar-avatar">{initials}</div>
      <span className="navbar-name">{user?.name?.split(" ")[0]}</span>
      <button className="logout-btn" onClick={handleLogout}>Logout</button>
    </div>
  );

  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="navbar-brand">
        <Link to="/">EventEase</Link>
      </div>

      <div className="navbar-links">
        {navLinks}
        <div className="navbar-divider" />
        {authLinks}
      </div>

      <button
        className="navbar-hamburger"
        aria-label="Toggle navigation"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(o => !o)}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <rect x="2" y="5" width="18" height="2" rx="1" fill="currentColor"/>
          <rect x="2" y="10" width="18" height="2" rx="1" fill="currentColor"/>
          <rect x="2" y="15" width="18" height="2" rx="1" fill="currentColor"/>
        </svg>
      </button>

      <div className={`navbar-mobile-menu${menuOpen ? " open" : ""}`}>
        {navLinks}
        <div className="navbar-divider" />
        {isAuthenticated ? (
          <div className="navbar-user" style={{ padding: "12px 24px" }}>
            <div className="navbar-avatar">{initials}</div>
            <span className="navbar-name">{user?.name?.split(" ")[0]}</span>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        ) : (
          <>
            <NavLink to="/login" className={({ isActive }) => (isActive ? "active" : "")} aria-current={location.pathname === "/login" ? "page" : undefined}>Login</NavLink>
            <NavLink to="/register" className={({ isActive }) => (isActive ? "active" : "")} aria-current={location.pathname === "/register" ? "page" : undefined}>Register</NavLink>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
