import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("authUser")) || null;
    } catch {
      return null;
    }
  });
  const [role, setRole] = useState(() => {
    return (localStorage.getItem("userRole") || "guest").toLowerCase();
  });

  const login = (newRole, user) => {
    setRole(newRole);
    setAuthUser(user);
    localStorage.setItem("userRole", newRole);
    localStorage.setItem("authUser", JSON.stringify(user));
  };

  const logout = () => {
    setRole("guest");
    setAuthUser(null);
    localStorage.removeItem("userRole");
    localStorage.removeItem("authUser");
  };

  return (
    <AuthContext.Provider value={{ authUser, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
