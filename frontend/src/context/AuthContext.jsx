import { createContext, useContext, useState, useEffect } from 'react';
import { getUser, logout as apiLogout } from '../services/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getUser());

  const refresh = () => setUser(getUser());

  const logout = () => {
    apiLogout();
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, refresh, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
