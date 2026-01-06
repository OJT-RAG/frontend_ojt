import React, { useState, useEffect } from "react";
import { Languages, User, MessageSquare, BookOpen, Home, Shield } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useI18n } from "../../i18n/i18n.jsx";
import "./Header.css";
import semesterApi from "../API/SemesterAPI.js";

const Header = () => {
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [role, setRole] = useState(localStorage.getItem("userRole") || "guest");
  const [activeSemester, setActiveSemester] = useState(null);

  const { lang, setLang, t } = useI18n();
  const languageCode = (lang || "en").toUpperCase().slice(0, 2);

  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  // Load active semester
  useEffect(() => {
  const loadSemester = async () => {
    try {
      const res = await semesterApi.getAll();

      // FIX: lấy mảng semester đúng chuẩn
      const list = Array.isArray(res.data)
        ? res.data
        : res.data.data || []; // fallback nếu backend bọc trong object

      // FIX: tìm đúng field isActive
      const active = list.find(s => s.isActive === true);

      setActiveSemester(active || null);
    } catch (error) {
      console.error("Failed to load semester:", error);
    }
  };

  loadSemester();
}, []);


  // Re-check role from localStorage
  useEffect(() => {
    const handleStorage = () => {
      setRole(localStorage.getItem("userRole") || "guest");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <header className="header-root">
      <div className="header-container">
        <div className="brand">
          <Link to="/" className={`home-chip ${isActive('/') ? 'active' : ''}`} aria-label={t('home')}>
            <Home size={14} />
            <span className="label">{t('home')}</span>
          </Link>
        </div>

        <nav className="nav" aria-label="Main navigation">
          <Link to='/knowledge' className={`nav-btn ${isActive('/knowledge') ? 'active' : ''}`}>
            <BookOpen /> <span>{t("nav_knowledge")}</span>
            <span className="line"></span>
          </Link>
          <Link to='/qa' className={`nav-btn ${isActive('/qa') ? 'active' : ''}`}>
            <MessageSquare /> <span>{t("nav_qa")}</span>
            <span className="line"></span>
          </Link>
          <Link to='/ragdocs' className={`nav-btn ${isActive('/ragdocs') ? 'active' : ''}`}>
            <BookOpen /> <span>{t("nav_rag_docs")}</span>
            <span className="line"></span>
          </Link>
          <Link to='/ojt' className={`nav-btn ${isActive('/ojt') ? 'active' : ''}`}>
            <BookOpen /> <span>{t("nav_ojt_docs")}</span>
            <span className="line"></span>
          </Link>
          <Link to='/student' className={`nav-btn ${isActive('/student') ? 'active' : ''}`}>
            <User /> <span>{t("Student")}</span>
            <span className="line"></span>
          </Link>
          <Link to='/admin' className={`nav-btn ${isActive('/admin') ? 'active' : ''}`}>
            <Shield /> <span>{t("nav_admin")}</span>
            <span className="line"></span>
          </Link>
          <Link to='/company' className={`nav-btn ${isActive('/company') ? 'active' : ''}`}>
            <Shield /> <span>{t("Company")}</span>
            <span className="line"></span>
          </Link>
          <Link to='/staff' className={`nav-btn ${isActive('/staff') ? 'active' : ''}`}>
            <Shield /> <span>{t("Staff")}</span>
            <span className="line"></span>
          </Link>
        </nav>

        <div className="actions">

          {/* ACTIVE SEMESTER */}
          <div className="semester-badge">
            {activeSemester ? (
              <span className="badge-semester">
                {activeSemester.name || activeSemester.semesterName || "Semester"}
              </span>
            ) : (
              <span className="badge-semester badge-inactive">No Active Semester</span>
            )}
          </div>

          {/* Language Switch */}
          <div className="lang">
            <button
              className="btn btn-outline lang-trigger"
              onClick={() => setIsLangOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={isLangOpen}
              aria-label={t("language")}
            >
              <Languages /> <span>{languageCode}</span>
            </button>

            {isLangOpen && (
              <div className="lang-menu" role="menu">
                <button className="lang-item" onClick={() => { setLang("en"); setIsLangOpen(false); }}>
                  🇬🇧 English
                </button>
                <button className="lang-item" onClick={() => { setLang("vi"); setIsLangOpen(false); }}>
                  🇻🇳 Tiếng Việt
                </button>
                <button className="lang-item" onClick={() => { setLang("ja"); setIsLangOpen(false); }}>
                  🇯🇵 日本語
                </button>
              </div>
            )}
          </div>

          {/* Badge - Student / Guest */}
          <span className="badge">
            {role === "students" ? t('role_student') : t('role_guest')}
          </span>

          {/* Login / Logout */}
          {role === "students" ? (
            <button
              className="btn btn-card"
              onClick={() => {
                localStorage.removeItem("userRole");
                setRole("guest");
              }}
            >
              <User /> <span>{t("logout")}</span>
            </button>
          ) : (
            <Link to="/login" className="login-link">
              <button className="btn btn-card">
                <User /> <span>{t("login")}</span>
              </button>
            </Link>
          )}

          {/* Avatar (Profile) */}
          <Link to="/profile/cv" className="avatar-link">
            <div className="avatar">
              <User />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
