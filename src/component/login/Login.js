import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Modal, notification } from "antd";
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
  const location = useLocation();
  const { t } = useI18n();
  const { login } = useAuth();

  const deactivatedPopupShownRef = useRef(false);
  const signupPopupShownRef = useRef(false);

  useEffect(() => {
    const reason = location?.state?.reason;
    if (reason !== 'deactivated') return;
    if (deactivatedPopupShownRef.current) return;
    deactivatedPopupShownRef.current = true;

    Modal.warning({
      title: 'Account deactivated',
      content: t('login_account_deactivated'),
      okText: 'OK',
      centered: true,
    });
    // Also show inline error message on the form.
    setError(t('login_account_deactivated'));

    // Clear navigation state so refresh/back won't re-trigger the popup.
    navigate('/login', { replace: true, state: {} });
  }, [location?.state, t]);

  useEffect(() => {
    const flash = location?.state?.flash;
    if (flash !== 'signup_success') return;
    if (signupPopupShownRef.current) return;
    signupPopupShownRef.current = true;

    notification.success({
      message: t('signup_created_account') || 'Created new account.',
      placement: 'topRight',
      duration: 3,
    });

    // Clear state so it doesn't show again on refresh/back.
    navigate('/login', { replace: true, state: {} });
  }, [location?.state, navigate, t]);

  const isInactiveAccount = (user) => {
    const raw = user?.accountStatus ?? user?.AccountStatus ?? user?.status ?? user?.Status;
    const s = String(raw ?? '').trim().toLowerCase();
    return s === 'inactive' || s === 'disabled' || s === 'deactive' || s === 'deactivated';
  };

  const isInactiveMessage = (msg) => {
    const s = String(msg ?? '').toLowerCase().trim();
    if (!s) return false;

    // English keywords
    if (s.includes('inactive') || s.includes('disabled') || s.includes('deactive') || s.includes('deactivated')) return true;

    // Vietnamese keywords (common phrasing)
    if (s.includes('vô hiệu hóa') || s.includes('vo hieu hoa')) return true;
    if ((s.includes('bị khóa') || s.includes('bi khoa') || s.includes('tạm khóa') || s.includes('tam khoa')) && (s.includes('tài khoản') || s.includes('tai khoan') || s.includes('account'))) {
      return true;
    }

    return false;
  };

  const isBackendGenericLoginFailureMessage = (msg) => {
    const s = String(msg ?? '').toLowerCase().trim();
    if (!s) return false;

    // Observed backend behavior: sometimes returns 500 with this message for invalid credentials.
    if (s.includes('lỗi hệ thống khi đăng nhập') || s.includes('loi he thong khi dang nhap')) return true;

    // Very generic English variants.
    if (s === 'login failed' || s.includes('login failed')) return true;

    return false;
  };

  const isInvalidCredentialsMessage = (msg) => {
    const s = String(msg ?? '').toLowerCase().trim();
    if (!s) return false;

    // English
    if (
      s.includes('invalid') ||
      s.includes('incorrect') ||
      s.includes('wrong') ||
      s.includes('unauthorized') ||
      s.includes('bad credentials') ||
      s.includes('invalid credentials')
    ) {
      return true;
    }

    // Vietnamese
    if (
      s.includes('sai mật khẩu') ||
      s.includes('sai mat khau') ||
      s.includes('sai tài khoản') ||
      s.includes('sai tai khoan') ||
      s.includes('không đúng') ||
      s.includes('khong dung')
    ) {
      return true;
    }

    // Common combined phrasing
    if (
      (s.includes('email') || s.includes('username') || s.includes('tài khoản') || s.includes('tai khoan')) &&
      (s.includes('mật khẩu') || s.includes('mat khau') || s.includes('password')) &&
      (s.includes('sai') || s.includes('không đúng') || s.includes('khong dung') || s.includes('invalid'))
    ) {
      return true;
    }

    return false;
  };

  const getLoginErrorInfo = (err) => {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const requestUrl = String(err?.config?.url ?? err?.request?.responseURL ?? '').toLowerCase();
    const isLoginEndpoint = requestUrl.includes('/user/login');

    const message =
      typeof data === 'string'
        ? data
        : typeof data?.message === 'string'
          ? data.message
          : typeof data?.title === 'string'
            ? data.title
            : err?.message || 'Login failed';

    const code = String(data?.code ?? data?.errorCode ?? data?.error_code ?? data?.key ?? '').toLowerCase();
    const accountStatus = String(
      data?.accountStatus ?? data?.AccountStatus ?? data?.status ?? data?.Status ?? data?.data?.accountStatus ?? ''
    ).toLowerCase();

    const isServerError = typeof status === 'number' && status >= 500;

    const isInvalidCredentials =
      status === 400 ||
      status === 401
        ? isInvalidCredentialsMessage(message) || isInvalidCredentialsMessage(code) || true
        : (isInvalidCredentialsMessage(message) || isInvalidCredentialsMessage(code)) ||
          // Some backends incorrectly respond 500 for invalid credentials on the login endpoint.
          (isServerError && isLoginEndpoint && isBackendGenericLoginFailureMessage(message));

    // Only treat as inactive when we have strong, explicit signals.
    // Never infer inactive from heuristics for 5xx errors.
    const hasExplicitInactiveStatus =
      accountStatus === 'inactive' ||
      accountStatus === 'disabled' ||
      accountStatus === 'deactive' ||
      accountStatus === 'deactivated' ||
      status === 423;

    const canUseInactiveHeuristics = status !== 400 && status !== 401 && !isServerError;
    const isInactive =
      hasExplicitInactiveStatus ||
      (canUseInactiveHeuristics && (isInactiveMessage(message) || isInactiveMessage(code)));

    return { status, data, message, isInactive, isInvalidCredentials };
  };

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

      if (isInactiveAccount(user)) {
        setError(t('login_account_deactivated'));
        setNotice('');
        return;
      }

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
      const msg = getAxiosErrorMessage(err);
      if (isInactiveMessage(msg)) {
        setError(t('login_account_deactivated'));
        setNotice('');
      } else {
        setError(msg);
      }
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
      const info = getLoginErrorInfo(err);
      return {
        success: false,
        message: info.message,
        status: info.status,
        data: info.data,
        isInactive: info.isInactive,
        isInvalidCredentials: info.isInvalidCredentials,
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
      if (result.isInvalidCredentials) {
        setError(t('login_invalid_credentials') || 'Wrong username or password.');
        setNotice('');
        return;
      }

      // Only show "account deactivated" when the backend explicitly indicates it.
      // Do not let heuristic message matching override invalid-credential responses.
      const canUseInactiveHeuristics = result.status !== 400 && result.status !== 401;
      if (result.isInactive || (canUseInactiveHeuristics && isInactiveMessage(result.message))) {
        setError(t('login_account_deactivated'));
        setNotice('');
        return;
      }

      setError(result.message);
      return;
    }

    if (isInactiveAccount(result.user)) {
      setError(t('login_account_deactivated'));
      setNotice('');
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
