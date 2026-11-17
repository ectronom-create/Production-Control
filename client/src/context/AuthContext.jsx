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

  const login = useCallback(
    async (companyIdOrName, password) => {
      const trimmed = (companyIdOrName || "").trim();
      setSessionExpired(false);
      if (!trimmed || !password) {
        throw new Error("Company ID or password is incorrect.");
      }

      // 1. Look the user up in Supabase (by company ID first, then by name)
      let dbReachable = false;
      let found = null;
      try {
        const byId = await supabase
          .from("users")
          .select("*")
          .eq("company_id", trimmed)
          .limit(1);
        if (byId.error) throw byId.error;
        found = byId.data?.[0] || null;
        if (!found) {
          const byName = await supabase
            .from("users")
            .select("*")
            .eq("name", trimmed)
            .limit(1);
          if (byName.error) throw byName.error;
          found = byName.data?.[0] || null;
        }
        dbReachable = true;
      } catch (e) {
        console.warn("Supabase auth check:", e);
      }

      if (found && found.password && found.password === password) {
        const access = (found.access || "").toLowerCase();
        if (!ALLOWED_ROLES.includes(access)) {
          throw new Error("This account does not have access to the system.");
        }
        return startSession(
          {
            id: found.id,
            name: found.name,
            access,
            team_name: found.team_name || "",
            company_id: found.company_id || "",
            email: found.email || "",
          },
          `supabase_${found.id}_${Date.now()}`,
        );
      }

      // 2. Emergency admin login — only when the database cannot be reached
      if (
        !dbReachable &&
        (trimmed.toUpperCase() === "ECTRON-001" ||
          trimmed.toLowerCase() === "admin") &&
        password === "Admin@1234"
      ) {
        return startSession(
          {
            id: 1,
            name: "Admin",
            access: "admin",
            team_name: "Management",
            company_id: "ECTRON-001",
            email: "admin@ectron.com",
          },
          `admin_session_${Date.now()}`,
        );
      }

      throw new Error("Company ID or password is incorrect.");
    },
    [startSession],
  );

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
