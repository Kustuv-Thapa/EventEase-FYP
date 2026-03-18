import { createContext, useEffect, useState } from "react";
import { getToken, removeToken, setToken } from "../utils/token";
import { loginUserApi, registerUserApi, getProfileApi } from "../api/authApi";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setAuthToken] = useState(getToken());
  const [loading, setLoading] = useState(true);

  const logout = () => {
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
      } catch (error) {
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

  const register = async (formData) => {
    const res = await registerUserApi(formData);
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!token
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};