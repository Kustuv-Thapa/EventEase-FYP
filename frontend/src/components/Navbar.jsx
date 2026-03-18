import { Link, NavLink, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import "../assets/styles/navbar.css";

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">EventEase</Link>
      </div>

      <div className="navbar-links">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/events">Events</NavLink>

        {isAuthenticated && user?.role !== "ADMIN" && (
          <NavLink to="/my-registrations">My Registrations</NavLink>
        )}

        {user?.role === "ORGANIZER" && (
          <NavLink to="/organizer/events">My Events</NavLink>
        )}

        {user?.role === "ADMIN" && (
          <>
            <NavLink to="/admin/dashboard">Admin Dashboard</NavLink>
            <NavLink to="/admin/venues">Venues</NavLink>
          </>
        )}

        <div className="navbar-divider" />

        {!isAuthenticated ? (
          <>
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/register">Register</NavLink>
          </>
        ) : (
          <div className="navbar-user">
            <div className="navbar-avatar">{initials}</div>
            <span>{user?.name?.split(" ")[0]}</span>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
