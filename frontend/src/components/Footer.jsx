import { Link } from "react-router-dom";
import "../assets/styles/navbar.css";

const Footer = () => (
  <footer className="footer">
    <div className="footer-inner">
      <div className="footer-brand">
        <span className="footer-brand-name">
          <span className="footer-brand-icon">✦</span> EventEase
        </span>
        <div className="footer-nav">
          {[["Events", "/events"], ["Venues", "/venues"], ["Login", "/login"]].map(([label, to]) => (
            <Link key={to} to={to} className="footer-nav-link">
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

export default Footer;
