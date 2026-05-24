import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./src/context/AuthContext";
import { Toaster } from "react-hot-toast";
import "./index.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: "monospace" }}>
          <h2 style={{ color: "red" }}>App crashed</h2>
          <pre style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>{this.state.error.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { fontSize: 14, fontWeight: 600, borderRadius: 10, maxWidth: 380 },
              success: { style: { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" } },
              error:   { style: { background: "#fff1f2", color: "#b91c1c", border: "1px solid #fecdd3" } },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
