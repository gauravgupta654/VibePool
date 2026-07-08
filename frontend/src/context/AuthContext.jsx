import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE = 'http://localhost:5000/api/auth';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('vibepool_token'));
  const [loading, setLoading] = useState(true);

  // Set axios default auth header when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('vibepool_token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('vibepool_token');
    }
  }, [token]);

  // On mount, check if token is valid and fetch user
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${API_BASE}/me`);
        setUser(res.data.user);
      } catch (error) {
        console.error('Token validation failed:', error);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  const signup = async (name, email, password, phone) => {
    const res = await axios.post(`${API_BASE}/signup`, { name, email, password, phone });
    return res.data;
  };

  const verifyOtp = async (email, code) => {
    const res = await axios.post(`${API_BASE}/verify-otp`, { email, code });
    if (res.data.token) {
      setToken(res.data.token);
      setUser(res.data.user);
    }
    return res.data;
  };

  const login = async (email, password) => {
    const res = await axios.post(`${API_BASE}/login`, { email, password });
    if (res.data.token) {
      setToken(res.data.token);
      setUser(res.data.user);
    }
    return res.data;
  };

  const resendOtp = async (email) => {
    const res = await axios.post(`${API_BASE}/resend-otp`, { email });
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    signup,
    verifyOtp,
    login,
    resendOtp,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
