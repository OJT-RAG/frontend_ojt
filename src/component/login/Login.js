// src/component/login/Login.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/i18n.jsx";
import { useAuth } from "../Hook/useAuth.jsx"; // chắc chắn đã tạo AuthProvider
import userApi from "../API/UserAPI.js";
import "./Login.scss";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [appConfig, setAppConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const googleButtonRef = useRef(null);
  const [googleReady, setGoogleReady] = useState(false);

  const { login } = useAuth(); // 🔹 dùng context để cập nhật Header
  const navigate = useNavigate();
  const { t } = useI18n();

  const googleClientId = useMemo(
    () => appConfig?.googleClientId || process.env.REACT_APP_GOOGLE_CLIENT_ID,
    [appConfig]
  );

  // ================= LOAD CONFIG =================
  useEffect(() => {
    fetch("/app-config.json", { cache: "no-store" })
      .then((res) => res.json())
      .then(setAppConfig)
      .catch(() => {});
  }, []);

  // ================== UTILS ==================
  const decodeJwtPayload = (jwt) => {
    try {
      const parts = String(jwt || "").split(".");
      if (parts.length < 2) return null;
      const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(
        atob(payload)
          .split("")
          .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
          .join("")
      );
      return JSON.parse(json);
    } catch {
      return null;
    }
  };

  const normalizeGoogleResponse = (res) => {
    const payload = res?.data?.data ?? res?.data;
    const token =
      payload?.token ||
      payload?.accessToken ||
      payload?.jwt ||
      payload?.data?.token ||
      payload?.data?.accessToken;
    const user = payload?.user || payload?.profile || payload?.data?.user;
    return { token, user, payload };
  };

  // ================== EMAIL LOGIN ==================
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await userApi.login({ email, password });
      if (!res?.data?.data) throw new Error("Login failed");

      const user = res.data.data;
      const roleName = (user.role || "student").toLowerCase();

      // 🔹 cập nhật context + localStorage
      login(roleName, {
        id: user.userId,
        fullname: user.fullname,
        email: user.email,
        role: roleName,
      });

      setNotice(`🎉 Chào mừng, ${user.fullname}`);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // ================== GOOGLE LOGIN ==================
  const handleGoogleCredential = async (credential) => {
    if (!credential) {
      setError("Missing Google credential");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await userApi.googleLogin({ idToken: credential });
      const { token, user } = normalizeGoogleResponse(res);

      if (token) localStorage.setItem("token", token);

      const jwtPayload = decodeJwtPayload(credential);
      const roleName = user?.role || jwtPayload?.role || "student";

      // 🔹 cập nhật context + localStorage
      login(roleName, {
        id: user?.userId || user?.id,
        fullname: user?.fullname || jwtPayload?.name || "Google User",
        email: user?.email || jwtPayload?.email,
        role: roleName,
      });

      setNotice("🎉 Đăng nhập Google thành công");
      navigate("/", { replace: true });
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || err.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId) return;

    const ensureScript = () => {
      if (document.getElementById("google-gsi-script")) return Promise.resolve();

      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.id = "google-gsi-script";
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error("Failed to load Google script"));
        document.body.appendChild(script);
      });
    };

    let cancelled = false;

    ensureScript()
      .then(() => {
        if (cancelled) return;
        if (!window.google?.accounts?.id) {
          setError("Google Sign-In unavailable");
          return;
        }

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (res) => handleGoogleCredential(res?.credential),
          ux_mode: "popup",
        });

        if (googleButtonRef.current) {
          googleButtonRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "rectangular",
          });
        }

        setGoogleReady(true);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to initialize Google login");
      });

    return () => {
      cancelled = true;
    };
  }, [googleClientId]);

  const handleGoogleLogin = () => {
    if (!googleReady || !window.google?.accounts?.id) {
      setError("Google login is not ready yet");
      return;
    }
    window.google.accounts.id.prompt();
  };

  // ================== UI ==================
  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleEmailLogin}>
        <div className="login-logo">FPT</div>
        <h2>{t("login_title")}</h2>

        <input
          type="email"
          placeholder={t("email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder={t("password_placeholder")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : t("login")}
        </button>

        {/* GOOGLE LOGIN */}
        <div className="social-login">
          <div onClick={handleGoogleLogin} style={{ cursor: "pointer" }}>
            <div ref={googleButtonRef} className="google-btn" />
          </div>

          <button
            type="button"
            className="google-btn"
            onClick={() => navigate("/signup")}
          >
            {t("create_account")}
          </button>
        </div>

        {error && <div className="error">{error}</div>}
        {notice && <div className="success">{notice}</div>}
      </form>
    </div>
  );
};

export default Login;
