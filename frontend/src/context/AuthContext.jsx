import { createContext, useEffect, useState } from "react";
import { getToken, removeToken, setToken } from "../utils/token";
import { loginUserApi, registerUserApi, verifyOtpApi, getProfileApi, logoutApi } from "../api/authApi";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setAuthToken] = useState(getToken());
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    try { await logoutApi(); } catch { /* ignore */ }
    removeToken();
    setAuthToken(null);
    setUser(null);
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        if (token) {
          const res = await getProfileApi();
          setUser(res.data.data.user);
        }
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (formData) => {
    const res = await loginUserApi(formData);
    const jwt = res.data.data.token;
    const userData = res.data.data.user;
    setToken(jwt);
    setAuthToken(jwt);
    setUser(userData);
    return res;
  };

  // register no longer auto-logs in — returns requiresVerification: true
  const register = async (formData) => {
    const res = await registerUserApi(formData);
    return res;
  };

  // Called after OTP is verified — activates session
  const verifyOtp = async ({ email, otp }) => {
    const res = await verifyOtpApi({ email, otp });
    const jwt = res.data.data.token;
    const userData = res.data.data.user;
    setToken(jwt);
    setAuthToken(jwt);
    setUser(userData);
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, verifyOtp, logout, updateUser: setUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};