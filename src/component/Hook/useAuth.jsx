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

  const login = (newRole, user, token) => {
    const normalizedRole = (newRole || "guest").toLowerCase();
    const normalizedUser = user ? { ...user, role: normalizedRole } : user;

    setRole(normalizedRole);
    setAuthUser(normalizedUser);
    localStorage.setItem("userRole", normalizedRole);
    localStorage.setItem("authUser", JSON.stringify(normalizedUser));
    if (token) localStorage.setItem("token", token);
  };

  const logout = () => {
    setRole("guest");
    setAuthUser(null);
    localStorage.removeItem("userRole");
    localStorage.removeItem("authUser");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ authUser, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
