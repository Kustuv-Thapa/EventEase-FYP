import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import "../assets/styles/navbar.css";

const Footer = () => {
  const { user } = useAuth();

  // Point admins to their management page, organizers to the venue booking list, guests to public list
  const venuesHref = user?.role === "ADMIN" ? "/admin/venues" : "/venues";

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-brand-name">
            <span className="footer-brand-icon">✦</span> EventEase
          </span>
          <div className="footer-nav">
            {[["Events", "/events"], ["Venues", venuesHref], ["Login", "/login"]].map(([label, to]) => (
              <Link key={label} to={to} className="footer-nav-link">
                {label}
              </Link>
            ))}
          </div>
        </div>
        <p className="footer-copy">
          © {new Date().getFullYear()} EventEase
        </p>
      </div>
    </footer>
  );
};

export default Footer;
