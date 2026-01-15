import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/i18n.jsx";
import { useAuth } from "../Hook/useAuth.jsx";
import {
  Languages, User, MessageSquare, BookOpen, Home, Shield
} from "lucide-react";
import semesterApi from "../API/SemesterAPI.js";
import "./Header.css";

const Header = () => {
  const { authUser, role, logout } = useAuth();
  const { lang, setLang, t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthenticated = role !== "guest";
  const canAccessRagDocs = role === "admin" || role === "cro_staff";

  const [activeSemester, setActiveSemester] = useState(null);
  const [isLangOpen, setIsLangOpen] = useState(false);

  const languageCode = (lang || "en").toUpperCase().slice(0, 2);
  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    let mounted = true;
    const loadSemester = async () => {
      try {
        const res = await semesterApi.getAll();
        const list = Array.isArray(res?.data) ? res.data : res?.data?.data || [];
        const active = list.find((s) => s?.isActive);
        if (mounted) setActiveSemester(active || null);
      } catch {
        if (mounted) setActiveSemester(null);
      }
    };
    loadSemester();
    return () => (mounted = false);
  }, []);

  return (
    <header className="header-root">
      <div className="header-container">
        <div className="brand">
          <Link to="/" className={`home-chip ${isActive("/") ? "active" : ""}`}>
            <Home size={14} /> <span>{t("home")}</span>
          </Link>
        </div>

        <nav className="nav">
          {isAuthenticated && (
            <>
              <Link to="/qa" className={`nav-btn ${isActive("/qa") ? "active" : ""}`}>
                <MessageSquare /> <span>{t("nav_qa")}</span>
              </Link>
              {canAccessRagDocs && (
                <Link to="/ragdocs" className={`nav-btn ${isActive("/ragdocs") ? "active" : ""}`}>
                  <BookOpen /> <span>{t("nav_rag_docs")}</span>
                </Link>
              )}
            </>
          )}
          <Link to="/ojt" className={`nav-btn ${isActive("/ojt") ? "active" : ""}`}>
            <BookOpen /> <span>{t("nav_ojt_docs")}</span>
          </Link>

          {role === "student" && <Link to="/student" className={`nav-btn ${isActive("/student") ? "active" : ""}`}><User /> <span>Student</span></Link>}
          {role === "cro_staff" && <Link to="/staff" className={`nav-btn ${isActive("/staff") ? "active" : ""}`}><Shield /> <span>CRO Staff</span></Link>}
          {role === "company" && <Link to="/company" className={`nav-btn ${isActive("/company") ? "active" : ""}`}><Shield /> <span>Company</span></Link>}
          {role === "admin" && <Link to="/admin" className={`nav-btn ${isActive("/admin") ? "active" : ""}`}><Shield /> <span>{t("nav_admin")}</span></Link>}
        </nav>

        <div className="actions">
          <div className="semester-badge">
            {activeSemester ? (
              <span className="badge-semester">{activeSemester.name || activeSemester.semesterName || "Semester"}</span>
            ) : (
              <span className="badge-semester badge-inactive">No Active Semester</span>
            )}
          </div>

          <div className="lang">
            <button className="btn btn-outline" onClick={() => setIsLangOpen((v) => !v)}>
              <Languages /> <span>{languageCode}</span>
            </button>
            {isLangOpen && (
              <div className="lang-menu">
                <button onClick={() => setLang("en")}>🇬🇧 English</button>
                <button onClick={() => setLang("vi")}>🇻🇳 Tiếng Việt</button>
                <button onClick={() => setLang("ja")}>🇯🇵 日本語</button>
              </div>
            )}
          </div>

          {role !== "guest" ? (
            <button
              className="btn btn-card"
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
            >
              <User /> <span>{t("logout")}</span>
            </button>
          ) : (
            <Link to="/login"><button className="btn btn-card"><User /> <span>{t("login")}</span></button></Link>
          )}

          {role !== "guest" && (
            <Link to="/profile/cv" className="avatar-link">
              <div className="avatar"><User /></div>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
