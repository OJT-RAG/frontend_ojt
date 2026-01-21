import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/i18n.jsx";
import { useAuth } from "../Hook/useAuth.jsx";
import "./Login.scss";
import userApi from "../API/UserAPI.js";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [appConfig, setAppConfig] = useState(null);
  const [loading, setLoading] = useState(false);

  const googleButtonRef = useRef(null);
  const [googleReady, setGoogleReady] = useState(false);

  const navigate = useNavigate();
  const { t } = useI18n();
  const { login } = useAuth();

  const googleClientId = useMemo(() => {
    return process.env.REACT_APP_GOOGLE_CLIENT_ID || appConfig?.googleClientId;
  }, [appConfig]);

  const getAxiosErrorMessage = (err) => {
    const status = err?.response?.status;
    const data = err?.response?.data;

    const asText =
      typeof data === "string"
        ? data
        : typeof data?.message === "string"
          ? data.message
          : typeof data?.title === "string"
            ? data.title
            : null;

    if (status === 401) return "Google token không hợp lệ hoặc đã hết hạn.";
    if (status === 403) return "Bạn không có quyền truy cập.";

    if (typeof asText === "string") {
      if (
        asText.includes(
          "Unable to resolve service for type 'GoogleAuthService'"
        )
      ) {
        return "Backend lỗi cấu hình DI: chưa register GoogleAuthService.";
      }
      if (
        asText.includes("unregistered_origin") ||
        asText.includes("The given origin is not allowed")
      ) {
        return "Google OAuth: origin chưa được phép. Thêm http://localhost:3000 vào Authorized JavaScript origins.";
      }

      return asText;
    }

    return err?.message || "Google login failed";
  };

  // ================= LOAD CONFIG =================
  useEffect(() => {
    fetch("/app-config.json", { cache: "no-store" })
      .then((res) => res.json())
      .then(setAppConfig)
      .catch(() => {});
  }, []);

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

  const normalizeGoogleLoginResponse = (res) => {
    const root = res?.data;
    const payload = root?.data ?? root;

    const token =
      payload?.token ||
      payload?.accessToken ||
      payload?.jwt ||
      root?.token ||
      root?.accessToken ||
      root?.jwt;

    // Backends commonly return either:
    // - { success: true, data: { userId, fullname, avatarUrl, ... } }
    // - { success: true, data: { token, user: {...} } }
    // - { token, user: {...} }
    const candidate =
      payload?.user ||
      payload?.profile ||
      payload?.data?.user ||
      payload?.data ||
      payload;
    const user =
      candidate && typeof candidate === "object" && !Array.isArray(candidate)
        ? candidate
        : null;

    return { token, user, payload };
  };

  const handleGoogleCredential = async (credential) => {
    if (!credential) {
      setError("Missing Google credential");
      return;
    }

    try {
      setError("");
      setLoading(true);

      const res = await userApi.googleLogin({ idToken: credential });
      const { token, user } = normalizeGoogleLoginResponse(res);

      const jwtPayload = decodeJwtPayload(credential);

      const role = String(user?.role || jwtPayload?.role || "student").toLowerCase();
      const resolvedId =
        user?.userId ||
        user?.id ||
        user?.UserId ||
        user?.ID ||
        null;

      const authUser = {
        id: resolvedId,
        userId: resolvedId,
        fullname: user?.fullname || user?.fullName || jwtPayload?.name || "Google User",
        email: user?.email || jwtPayload?.email,
        avatarUrl: user?.avatarUrl || user?.avatar_url || jwtPayload?.picture || null,
        role,
        company_id: user?.company_ID || user?.companyId || null,
      };

// LƯU company_id
if (authUser.company_id) {
  localStorage.setItem("company_id", authUser.company_id);
}

login(role, authUser, token);
      setNotice("🎉 Đăng nhập Google thành công");
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Google login error:", err);
      setError(getAxiosErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ================= GOOGLE ID SERVICES (GET idToken) =================
  useEffect(() => {
    if (!googleClientId) return;

    const ensureScript = () => {
      if (document.getElementById("google-gsi-script"))
        return Promise.resolve();

      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.id = "google-gsi-script";
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () =>
          reject(new Error("Failed to load Google script"));
        document.body.appendChild(script);
      });
    };

    let cancelled = false;

    ensureScript()
      .then(() => {
        if (cancelled) return;
        if (!window.google?.accounts?.id) {
          setError("Google Sign-In is unavailable");
          return;
        }

        window.google.accounts.id.initialize({
          client_id: googleClientId,

          callback: (response) => {
            //console.log("=== GOOGLE RESPONSE ===", response);
           console.log("=== ID TOKEN ===", response?.credential);

            handleGoogleCredential(response?.credential);
          },

          ux_mode: "popup",
          itp_support: true, // Thêm dòng này để hỗ trợ trình duyệt tốt hơn
        });

        if (googleButtonRef.current) {
          googleButtonRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "rectangular",
            logo_alignment: "left", // Thêm thuộc tính căn lề logo
            width: "350", // Bạn có thể tùy chỉnh độ rộng nút
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

  // ================= LOGIN API =================
  const loginApi = async (email, password) => {
    try {
      const res = await userApi.login({ email, password });

      const payload = res?.data;
      const token = payload?.token || payload?.accessToken || payload?.jwt;
      const user = payload?.data || payload?.user || payload?.profile;

      if (user) {
        return {
          success: true,
          user,
          token,
        };
      }

      return { success: false, message: "Login failed" };
    } catch (err) {
      return {
        success: false,
        message: err?.response?.data?.message || err?.message || "Login failed",
      };
    }
  };

  // ================= SUBMIT EMAIL LOGIN =================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await loginApi(email, password);
    setLoading(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    const apiRole = String(result.user.role || "student").toLowerCase();

const authUser = {
  id: result.user.userId,
  fullname: result.user.fullname,
  email: result.user.email,
  role: apiRole,
  company_id: result.user.company_ID || result.user.companyId || null,
};

// LƯU company_id VÀO LOCALSTORAGE
if (authUser.company_id) {
  localStorage.setItem("company_id", authUser.company_id);
}

login(apiRole, authUser, result.token);

    setNotice(`🎉 Chào mừng, ${authUser.fullname}`);
    setTimeout(() => navigate("/"), 1000);
  };

  // ================= GOOGLE LOGIN =================
  const handleGoogleLogin = () => {
    if (!googleClientId) {
      setError("Missing Google Client ID");
      return;
    }

    if (!googleReady || !window.google?.accounts?.id) {
      setError("Google login is not ready yet");
      return;
    }

    setError("");
    // Shows the Google prompt/popup depending on browser state.
    // window.google.accounts.id.prompt((notification) => {
    //   try {
    //     if (notification.isNotDisplayed()) {
    //       const reason = notification.getNotDisplayedReason();
    //       const map = {
    //         browser_not_supported: "Trình duyệt không hỗ trợ đăng nhập Google.",
    //         invalid_client: "Google OAuth: clientId không hợp lệ.",
    //         missing_client_id: "Thiếu Google Client ID.",
    //         opt_out_or_no_session:
    //           "Bạn chưa đăng nhập Google trong trình duyệt.",
    //         suppressed_by_user:
    //           "Đăng nhập Google bị chặn bởi người dùng/trình duyệt.",
    //         unregistered_origin:
    //           "Google OAuth: origin chưa được phép (Authorized JavaScript origins).",
    //         secure_http_required: "Google yêu cầu HTTPS hoặc localhost hợp lệ.",
    //       };
    //       setError(map[reason] || `Google prompt not displayed: ${reason}`);
    //     } else if (notification.isSkippedMoment()) {
    //       const reason = notification.getSkippedReason();
    //       setError(`Google sign-in bị bỏ qua: ${reason}`);
    //     } else if (notification.isDismissedMoment()) {
    //       const reason = notification.getDismissedReason();
    //       // User closed the popup/one-tap; keep it quiet unless it's a hard error.
    //       if (reason && reason !== "credential_returned") {
    //         setError(`Google sign-in bị đóng: ${reason}`);
    //       }
    //     }
    //   } catch (e) {
    //     console.error("Google prompt notification error:", e);
    //   }
    // });
  };

  // ================= UI =================
  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
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

        <div className="social-login">
          <div onClick={handleGoogleLogin} style={{ cursor: "pointer" }}>
            <div ref={googleButtonRef} />
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
}
//console.log("CLIENT ID:", process.env.REACT_APP_GOOGLE_CLIENT_ID);
export default Login;
