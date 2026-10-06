import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('ectron_token');
    const lastActive = localStorage.getItem('ectron_last_activity');
    if (savedToken && lastActive) {
      if (Date.now() - parseInt(lastActive, 10) > INACTIVITY_TIMEOUT_MS) {
        localStorage.removeItem('ectron_token');
        localStorage.removeItem('ectron_user');
        localStorage.removeItem('ectron_last_activity');
        return null;
      }
    }
    return savedToken || null;
  });

  const [user, setUser] = useState(() => {
    try { 
      const savedUser = localStorage.getItem('ectron_user');
      const lastActive = localStorage.getItem('ectron_last_activity');
      if (savedUser && lastActive) {
        if (Date.now() - parseInt(lastActive, 10) > INACTIVITY_TIMEOUT_MS) {
          return null;
        }
        return JSON.parse(savedUser);
      }
      return null;
    } catch { 
      return null; 
    }
  });

  const [sessionExpired, setSessionExpired] = useState(false);
  const timeoutRef = useRef(null);

  const logout = useCallback((isExpired = false) => {
    localStorage.removeItem('ectron_token');
    localStorage.removeItem('ectron_user');
    localStorage.removeItem('ectron_last_activity');
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
    localStorage.setItem('ectron_last_activity', String(now));

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      logout(true);
    }, INACTIVITY_TIMEOUT_MS);
  }, [token, logout]);

  // Set up user interaction event listeners (clicks, typing, scroll, mouse movement)
  useEffect(() => {
    if (!token) return;

    recordActivity();

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleUserActivity = () => {
      recordActivity();
    };

    events.forEach(ev => window.addEventListener(ev, handleUserActivity, { passive: true }));

    // Also periodic interval check in case tab is left inactive in background
    const intervalCheck = setInterval(() => {
      const lastActive = localStorage.getItem('ectron_last_activity');
      if (lastActive && Date.now() - parseInt(lastActive, 10) > INACTIVITY_TIMEOUT_MS) {
        logout(true);
      }
    }, 15000); // Check every 15 seconds

    return () => {
      events.forEach(ev => window.removeEventListener(ev, handleUserActivity));
      clearInterval(intervalCheck);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [token, recordActivity, logout]);

  const login = useCallback(async (companyIdOrName, password) => {
    const trimmed = companyIdOrName.trim();
    setSessionExpired(false);

    // 1. Check Supabase users table by company_id OR name
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`company_id.eq.${trimmed},name.eq.${trimmed}`)
        .maybeSingle();

      // Check password: match stored password, or if user in DB has empty password, or master passwords
      const passwordMatches = 
        !data.password || 
        data.password.trim() === '' || 
        data.password === password ||
        password === 'Admin@1234' ||
        password === 'admin';

      if (data && passwordMatches) {
        const userData = {
          id: data.id,
          name: data.name,
          access: data.access || 'admin',
          team_name: data.team_name || '',
          company_id: data.company_id || '',
          email: data.email || ''
        };
        const sessionToken = `supabase_${data.id}_${Date.now()}`;
        const now = Date.now();
        localStorage.setItem('ectron_token', sessionToken);
        localStorage.setItem('ectron_user', JSON.stringify(userData));
        localStorage.setItem('ectron_last_activity', String(now));
        setToken(sessionToken);
        setUser(userData);
        return { user: userData, token: sessionToken };
      }
    } catch (e) {
      console.warn('Supabase auth check:', e);
    }

    // 2. Default Admin fallback for ECTRON-001 or Admin
    if (
      (trimmed.toUpperCase() === 'ECTRON-001' || trimmed.toLowerCase() === 'admin') &&
      (password === 'Admin@1234' || password === 'admin')
    ) {
      const adminData = {
        id: 1,
        name: 'Admin',
        access: 'admin',
        team_name: 'Management',
        company_id: 'ECTRON-001',
        email: 'admin@ectron.com'
      };
      const sessionToken = `admin_session_${Date.now()}`;
      const now = Date.now();
      localStorage.setItem('ectron_token', sessionToken);
      localStorage.setItem('ectron_user', JSON.stringify(adminData));
      localStorage.setItem('ectron_last_activity', String(now));
      setToken(sessionToken);
      setUser(adminData);
      return { user: adminData, token: sessionToken };
    }

    throw new Error('Company ID or password is incorrect.');
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, sessionExpired, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
