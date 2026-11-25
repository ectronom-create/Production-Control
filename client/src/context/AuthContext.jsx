import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { supabase } from "../supabaseClient";

/*
 * Sign-in = Supabase Auth.
 *  • The user types a company ID (or name) + password. The database turns the
 *    company ID into the hidden Auth e-mail (RPC auth_login_email), then
 *    Supabase Auth checks the password and issues a signed session.
 *  • Every database request carries that session; the database decides what
 *    each role may read and change (Row Level Security). Editing localStorage
 *    can no longer make anyone an admin.
 *  • The app user (name, role, team) is read from the users table through
 *    my_app_user() on every start, so a role change or a deleted account
 *    applies immediately.
 */

const AuthContext = createContext(null);

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_KEY = "ectron_last_activity";
const ALLOWED_ROLES = ["admin", "supervisor", "viewer", "operator"];
const LEGACY_KEYS = ["ectron_token", "ectron_user"];

function isInactive() {
  const last = Number(localStorage.getItem(ACTIVITY_KEY) || 0);
  return last > 0 && Date.now() - last > INACTIVITY_TIMEOUT_MS;
}

function downtimeRecording() {
  // A live downtime timer keeps the session open (see Downtime page).
  return Object.keys(localStorage).some((k) => k.startsWith("ectron_live_downtime_"));
}

async function loadAppUser() {
  const { data, error } = await supabase.rpc("my_app_user");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  const access = (row.access || "").toLowerCase();
  if (!ALLOWED_ROLES.includes(access)) return null;
  return {
    id: row.id,
    name: row.name,
    access,
    team_name: row.team_name || "",
    company_id: row.company_id || "",
    email: row.email || "",
    phone: row.phone || "",
    must_change_password: Boolean(row.must_change_password),
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const timeoutRef = useRef(null);

  // Old browser-only session keys are meaningless now.
  useEffect(() => {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  }, []);

  const clearState = useCallback(() => {
    setSession(null);
    setUser(null);
    localStorage.removeItem(ACTIVITY_KEY);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const logout = useCallback(
    async (isExpired = false) => {
      if (isExpired === true) setSessionExpired(true);
      clearState();
      try {
        await supabase.auth.signOut();
      } catch {
        /* offline: the local session is cleared anyway */
      }
    },
    [clearState],
  );

  // ── Restore the session on start + follow Supabase auth events ─────────────
  useEffect(() => {
    let cancelled = false;

    async function adopt(nextSession) {
      if (!nextSession) {
        clearState();
        return;
      }
      if (isInactive() && !downtimeRecording()) {
        setSessionExpired(true);
        await supabase.auth.signOut().catch(() => {});
        clearState();
        return;
      }
      try {
        const appUser = await loadAppUser();
        if (cancelled) return;
        if (!appUser) {
          // The login exists but the app account was removed or has no role.
          await supabase.auth.signOut().catch(() => {});
          clearState();
          return;
        }
        setSession(nextSession);
        setUser(appUser);
      } catch (e) {
        // Offline at start: keep the session; data calls will retry later.
        console.warn("Could not load the signed-in user:", e);
        if (!cancelled) setSession(nextSession);
      }
    }

    supabase.auth.getSession().then(async ({ data }) => {
      await adopt(data?.session || null);
      if (!cancelled) setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT") clearState();
      if (event === "TOKEN_REFRESHED" && nextSession) setSession(nextSession);
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
    };
  }, [clearState]);

  // ── 30-minute inactivity logout (kept from the old version) ─────────────────
  const recordActivity = useCallback(() => {
    if (!session) return;
    localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (downtimeRecording()) {
        recordActivity();
        return;
      }
      logout(true);
    }, INACTIVITY_TIMEOUT_MS);
  }, [session, logout]);

  useEffect(() => {
    if (!session) return undefined;
    recordActivity();
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    const onActivity = () => recordActivity();
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    const interval = setInterval(() => {
      if (downtimeRecording()) {
        localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
        return;
      }
      if (isInactive()) logout(true);
    }, 15000);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      clearInterval(interval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [session, recordActivity, logout]);

  // ── Login ───────────────────────────────────────────────────────────────────
  const login = useCallback(async (companyIdOrName, password) => {
    const trimmed = (companyIdOrName || "").trim();
    setSessionExpired(false);
    if (!trimmed || !password) {
      throw new Error("Company ID or password is incorrect.");
    }

    const { data: email, error: lookupError } = await supabase.rpc("auth_login_email", {
      p_login: trimmed,
    });
    if (lookupError) {
      console.warn("Login lookup failed:", lookupError);
      throw new Error("Cannot reach the server right now. Check the connection and try again.");
    }
    if (!email) {
      throw new Error("Company ID or password is incorrect.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.status === 429) {
        throw new Error("Too many attempts. Wait a few minutes and try again.");
      }
      if (error.status && error.status >= 500) {
        throw new Error("Cannot reach the server right now. Check the connection and try again.");
      }
      throw new Error("Company ID or password is incorrect.");
    }

    const appUser = await loadAppUser().catch(() => null);
    if (!appUser) {
      await supabase.auth.signOut().catch(() => {});
      throw new Error("This account does not have access to the system.");
    }
    localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    setSession(data.session);
    setUser(appUser);
    return { user: appUser };
  }, []);

  // ── Change own password (first login, or from My Profile) ──────────────────
  const changePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message || "Could not change the password.");
    const { error: flagError } = await supabase.rpc("clear_must_change_password");
    if (flagError) console.warn("Could not clear must_change_password:", flagError);
    setUser((u) => (u ? { ...u, must_change_password: false } : u));
  }, []);

  const refreshUser = useCallback(async () => {
    const appUser = await loadAppUser().catch(() => null);
    if (appUser) setUser(appUser);
    return appUser;
  }, []);

  // `token` kept for existing components: truthy while signed in.
  const token = session?.access_token || null;

  return (
    <AuthContext.Provider
      value={{ token, user, ready, sessionExpired, login, logout, changePassword, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
