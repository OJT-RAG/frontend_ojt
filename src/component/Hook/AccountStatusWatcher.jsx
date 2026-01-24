import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth.jsx";
import userApi from "../API/UserAPI";

const isInactiveAccount = (user) => {
  const raw =
    user?.accountStatus ??
    user?.AccountStatus ??
    user?.status ??
    user?.Status;
  const s = String(raw ?? "").trim().toLowerCase();
  return s === "inactive" || s === "disabled" || s === "deactive" || s === "deactivated";
};

export default function AccountStatusWatcher() {
  const { authUser, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const kickedRef = useRef(false);

  useEffect(() => {
    const normalizedRole = String(role || "guest").toLowerCase();
    const userId = Number(authUser?.userId ?? authUser?.id ?? 0) || 0;

    if (normalizedRole === "guest" || !userId) return;

    let cancelled = false;
    kickedRef.current = false;

    const kickToLogin = () => {
      if (kickedRef.current) return;
      kickedRef.current = true;

      // Clear local auth first to prevent any further API usage.
      logout();

      // If already on login, just show the message there.
      if (location?.pathname === "/login") return;

      // Route to login and let Login page display the popup.
      navigate("/login", {
        replace: true,
        state: { reason: "deactivated" },
      });
    };

    const checkOnce = async () => {
      if (cancelled || kickedRef.current) return;

      try {
        const res = await userApi.getById(userId);
        const payload = res?.data?.data ?? res?.data;
        if (payload && isInactiveAccount(payload)) {
          kickToLogin();
        }
      } catch {
        // If the backend starts rejecting a deactivated user token, also kick.
        // Avoid kicking on transient network errors: only kick if we have a clear signal.
      }
    };

    // Check immediately, then poll.
    checkOnce();
    const intervalId = window.setInterval(checkOnce, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authUser?.userId, authUser?.id, role, logout, navigate, location?.pathname]);

  return null;
}
