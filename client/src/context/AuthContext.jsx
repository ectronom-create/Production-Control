import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext(null);

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds
const ALLOWED_ROLES = ["admin", "supervisor", "viewer"];

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem("ectron_token");
    const lastActive = localStorage.getItem("ectron_last_activity");
    if (savedToken && lastActive) {
      if (Date.now() - parseInt(lastActive, 10) > INACTIVITY_TIMEOUT_MS) {
        localStorage.removeItem("ectron_token");
        localStorage.removeItem("ectron_user");
        localStorage.removeItem("ectron_last_activity");
        return null;
      }
    }
    return savedToken || null;
  });

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("ectron_user");
      const lastActive = localStorage.getItem("ectron_last_activity");
      if (savedUser && lastActive) {
        if (Date.now() - parseInt(lastActive, 10) > INACTIVITY_TIMEOUT_MS) {
          return null;
        }
        const parsed = JSON.parse(savedUser);
        const role = (parsed?.access || "").toLowerCase();
        return ALLOWED_ROLES.includes(role) ? parsed : null;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [sessionExpired, setSessionExpired] = useState(false);
  const timeoutRef = useRef(null);

  const logout = useCallback((isExpired = false) => {
    localStorage.removeItem("ectron_token");
    localStorage.removeItem("ectron_user");
    localStorage.removeItem("ectron_last_activity");
    setToken(null);
    setUser(null);
    if (isExpired) {
      setSessionExpired(true);
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  // Update activity timestamp and reset 30-min timer
  const recordActivity = useCallback(() => {
    if (!token) return;
    const now = Date.now();
    localStorage.setItem("ectron_last_activity", String(now));

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      // If active downtime is currently being recorded, keep session alive and do not logout!
      const activeDowntime = localStorage.getItem("ectron_active_downtime");
      if (activeDowntime) {
        recordActivity();
        return;
      }
      logout(true);
    }, INACTIVITY_TIMEOUT_MS);
  }, [token, logout]);

  // Set up user interaction event listeners (clicks, typing, scroll, mouse movement)
  useEffect(() => {
    if (!token) return;

    recordActivity();

    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    const handleUserActivity = () => {
      recordActivity();
    };

    events.forEach((ev) =>
      window.addEventListener(ev, handleUserActivity, { passive: true }),
    );

    // Also periodic interval check in case tab is left inactive in background
    const intervalCheck = setInterval(() => {
      // If active downtime is recording, keep session alive
      const activeDowntime = localStorage.getItem("ectron_active_downtime");
      if (activeDowntime) {
        localStorage.setItem("ectron_last_activity", String(Date.now()));
        return;
      }
      const lastActive = localStorage.getItem("ectron_last_activity");
      if (
        lastActive &&
        Date.now() - parseInt(lastActive, 10) > INACTIVITY_TIMEOUT_MS
      ) {
        logout(true);
      }
    }, 15000); // Check every 15 seconds

    return () => {
      events.forEach((ev) =>
        window.removeEventListener(ev, handleUserActivity),
      );
      clearInterval(intervalCheck);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [token, recordActivity, logout]);

  const startSession = useCallback((userData, sessionToken) => {
    localStorage.setItem("ectron_token", sessionToken);
    localStorage.setItem("ectron_user", JSON.stringify(userData));
    localStorage.setItem("ectron_last_activity", String(Date.now()));
    setToken(sessionToken);
    setUser(userData);
    return { user: userData, token: sessionToken };
  }, []);

  // Login is checked inside the database (RPC `app_login`): the browser sends
  // the password and gets back the user row WITHOUT any password field.
  // There is no offline / emergency login — if the database can't be reached,
  // nobody can sign in (a fallback login can be forced by blocking the network).
  const login = useCallback(
    async (companyIdOrName, password) => {
      const trimmed = (companyIdOrName || "").trim();
      setSessionExpired(false);
      if (!trimmed || !password) {
        throw new Error("Company ID or password is incorrect.");
      }

      const { data, error } = await supabase.rpc("app_login", {
        p_login: trimmed,
        p_password: password,
      });
      if (error) {
        if (String(error.message || "").includes("too_many_attempts")) {
          throw new Error(
            "Too many wrong attempts for this account. Try again in 15 minutes.",
          );
        }
        console.warn("Login RPC failed:", error);
        throw new Error(
          "Cannot reach the server right now. Check the connection and try again.",
        );
      }

      const found = Array.isArray(data) ? data[0] : data;
      if (!found) {
        throw new Error("Company ID or password is incorrect.");
      }
      const access = (found.access || "").toLowerCase();
      if (!ALLOWED_ROLES.includes(access)) {
        throw new Error("This account does not have access to the system.");
      }

      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      const sessionToken = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

      return startSession(
        {
          id: found.id,
          name: found.name,
          access,
          team_name: found.team_name || "",
          company_id: found.company_id || "",
          email: found.email || "",
        },
        sessionToken,
      );
    },
    [startSession],
  );

  // Re-check the signed-in account against the database when the app opens:
  // a deleted user, or a changed role, takes effect immediately instead of
  // living on in localStorage.
  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    supabase
      .from("users")
      .select("id,name,access,team_name,company_id,email")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error) return; // offline: keep the session for now
        const access = (data?.access || "").toLowerCase();
        if (!data || !ALLOWED_ROLES.includes(access) || data.name !== user.name) {
          logout(true);
          return;
        }
        if (access !== user.access || data.team_name !== user.team_name) {
          const next = { ...user, access, team_name: data.team_name || "" };
          localStorage.setItem("ectron_user", JSON.stringify(next));
          setUser(next);
        }
      });
    return () => {
      cancelled = true;
    };
    // run once per signed-in account
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <AuthContext.Provider
      value={{ token, user, sessionExpired, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
