import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { api } from '../api/axios';

const AuthContext = createContext(null);



export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on load
    const token = sessionStorage.getItem('accessToken');

    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Check if token is expired (exp is in seconds)
        if (decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          // Load the full user details we saved in Login.jsx
          const savedUser = sessionStorage.getItem('user');
          setUser(savedUser ? { ...JSON.parse(savedUser), token } : { id: decoded.id, token });
        }
      } catch (err) {
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/admin/login', { email, password });
      
      const { token, _id, role, name, email: userEmail } = response.data;
      
      sessionStorage.setItem('accessToken', token);
      const userData = { _id, role, name, email: userEmail };
      sessionStorage.setItem('user', JSON.stringify(userData));
      
      setUser({ ...userData, token });
      return response.data;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);