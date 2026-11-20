import { useEffect, useState, Suspense } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Target,
  Factory,
  Users as UsersIcon,
  IdCard,
  ClipboardCheck,
  Timer,
  CircleAlert,
  Package,
  Truck,
  ScanSearch,
  UserCog,
  LogOut,
  Menu,
  X,
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
  Download,
  Share,
  SquarePlus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { usePwaInstall } from "../hooks/usePwaInstall";

function PageLoader() {
  return (
    <div style={{ padding: 60, display: "flex", justifyContent: "center" }}>
      <span
        className="spinner"
        style={{ width: 28, height: 28, borderColor: "var(--gray-200)", borderTopColor: "var(--teal)" }}
      />
    </div>
  );
}

/*
 * Navigation map — one source of truth for the sidebar, the phone drawer,
 * the phone bottom bar and the page title shown in the phone top bar.
 * `short` labels are used where space is tight (bottom bar).
 */
const NAV_GROUPS = [
  {
    id: "overview",
    ar: "نظرة عامة",
    en: "Overview",
    items: [
      { to: "/dashboard", ar: "لوحة التحكم", en: "Dashboard", shortAr: "الرئيسية", shortEn: "Home", Icon: LayoutGrid, roles: ["admin", "supervisor"] },
      { to: "/management-dashboard", ar: "لوحة الإدارة", en: "Management", shortAr: "الإدارة", shortEn: "Management", Icon: Target, roles: ["admin", "viewer"] },
    ],
  },
  {
    id: "line",
    ar: "خط الإنتاج",
    en: "Production line",
    items: [
      { to: "/production", ar: "الإنتاج", en: "Production", shortAr: "الإنتاج", shortEn: "Production", Icon: Factory, roles: ["admin", "supervisor"] },
      { to: "/pre-production-checklist", ar: "فحص ما قبل الوردية", en: "Pre-Shift Checklist", shortAr: "الفحص", shortEn: "Checklist", Icon: ClipboardCheck, roles: ["admin", "supervisor"] },
      { to: "/downtime", ar: "أوقات التوقف", en: "Downtime", shortAr: "التوقفات", shortEn: "Downtime", Icon: Timer, roles: ["admin", "supervisor"] },
      { to: "/defect-meters", ar: "عدادات العيوب", en: "Defect Meters", shortAr: "العيوب", shortEn: "Defects", Icon: CircleAlert, roles: ["admin", "supervisor"] },
    ],
  },
  {
    id: "team",
    ar: "الفريق",
    en: "Team",
    items: [
      { to: "/crew", ar: "طاقم العمل والمحطات", en: "Line Crew", shortAr: "الطاقم", shortEn: "Crew", Icon: UsersIcon, roles: ["admin", "supervisor"] },
      { to: "/employees", ar: "بروفايل الموظفين", en: "Employee Profiles", shortAr: "الموظفين", shortEn: "Employees", Icon: IdCard, roles: ["admin", "supervisor"] },
    ],
  },
  {
    id: "supply",
    ar: "المخزون والشحن",
    en: "Supply & shipping",
    items: [
      { to: "/kit-meters", ar: "عدادات الكيت", en: "Kit Meters", shortAr: "الكيت", shortEn: "Kits", Icon: Package, roles: ["admin"] },
      { to: "/batches", ar: "دفعات الإنتاج", en: "Batches", shortAr: "الدفعات", shortEn: "Batches", Icon: Truck, roles: ["admin"] },
      { to: "/batch-lookup", ar: "البحث عن عداد", en: "Meter Lookup", shortAr: "بحث", shortEn: "Lookup", Icon: ScanSearch, roles: ["admin", "supervisor", "viewer"] },
    ],
  },
  {
    id: "admin",
    ar: "الإدارة",
    en: "Administration",
    items: [
      { to: "/users", ar: "المستخدمين", en: "Users", shortAr: "المستخدمين", shortEn: "Users", Icon: UserCog, roles: ["admin"] },
    ],
  },
];

/* Bottom bar on phones: the 4 most-used pages for each role, then "More". */
const BOTTOM_BAR = {
  admin: ["/dashboard", "/production", "/defect-meters", "/management-dashboard"],
  supervisor: ["/dashboard", "/production", "/pre-production-checklist", "/downtime"],
  viewer: ["/management-dashboard", "/batch-lookup"],
};

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
const RAIL_KEY = "ectron_sidebar_collapsed";

export default function Layout() {
  const { user, logout } = useAuth();
  const { isArabic, canChangeLanguage, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(RAIL_KEY) === "1";
    } catch {
      return false;
    }
  });

  const pwa = usePwaInstall();
  const [iosHelpOpen, setIosHelpOpen] = useState(false);

  const L = (ar, en) => (isArabic ? ar : en);
  const userRole = (user?.access || "viewer").toLowerCase();

  // Close the phone drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Lock page scroll behind the open drawer and close it on Escape.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(RAIL_KEY, next ? "1" : "0");
      } catch {
        /* storage unavailable — keep in memory only */
      }
      return next;
    });
  }

  async function handleInstall() {
    if (pwa.needsIosInstructions) {
      setDrawerOpen(false);
      setIosHelpOpen(true);
      return;
    }
    await pwa.install();
  }

  const installLabel = L("تثبيت التطبيق", "Install app");

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => it.roles.includes(userRole)),
  })).filter((g) => g.items.length > 0);

  const bottomItems = (BOTTOM_BAR[userRole] || BOTTOM_BAR.viewer)
    .map((to) => ALL_ITEMS.find((it) => it.to === to))
    .filter((it) => it && it.roles.includes(userRole));

  const current =
    ALL_ITEMS.find((it) => location.pathname === it.to || location.pathname.startsWith(`${it.to}/`)) || null;
  const currentTitle = current ? L(current.ar, current.en) : "ECTRON";

  // "More" is highlighted when the current page is not one of the bottom-bar shortcuts.
  const moreActive = drawerOpen || (current && !bottomItems.some((it) => it.to === current.to));

  const navList = (
    <nav className="shell-nav" aria-label={L("القائمة الرئيسية", "Main navigation")}>
      {groups.map((g) => (
        <div key={g.id} className="shell-nav-group">
          <div className="shell-nav-group-label">{L(g.ar, g.en)}</div>
          {g.items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              title={L(it.ar, it.en)}
              className={({ isActive }) => `shell-nav-item${isActive ? " active" : ""}`}
            >
              <it.Icon className="shell-nav-icon" size={19} strokeWidth={2} aria-hidden="true" />
              <span className="shell-nav-text">{L(it.ar, it.en)}</span>
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );

  const userBlock = (
    <div className="shell-user">
      <div className="shell-avatar" aria-hidden="true">{initials}</div>
      <div className="shell-user-text">
        <div className="shell-user-name">{user?.name}</div>
        <div className="shell-user-role">{user?.access}</div>
      </div>
    </div>
  );

  return (
    <div className={`shell${collapsed ? " shell--collapsed" : ""}`}>
      {/* ── Desktop / tablet sidebar ── */}
      <aside className="shell-sidebar" aria-label="Sidebar">
        <div className="shell-brand">
          <div className="shell-logo-badge">
            <img src="/ectron-logo.png" alt="ECTRON" className="shell-logo" />
          </div>
          <button
            type="button"
            className="shell-collapse-btn"
            onClick={toggleCollapsed}
            title={collapsed ? L("توسيع القائمة", "Expand menu") : L("تصغير القائمة", "Collapse menu")}
            aria-label={collapsed ? L("توسيع القائمة", "Expand menu") : L("تصغير القائمة", "Collapse menu")}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {navList}

        <div className="shell-sidebar-footer">
          {pwa.available && (
            <button
              type="button"
              className="shell-side-btn shell-side-btn--install"
              onClick={handleInstall}
              title={installLabel}
            >
              <Download size={17} aria-hidden="true" />
              <span className="shell-nav-text">{installLabel}</span>
            </button>
          )}
          {canChangeLanguage && (
            <button
              type="button"
              className="shell-side-btn"
              onClick={toggleLanguage}
              title={isArabic ? "Switch to English" : "التحويل إلى العربية"}
            >
              <Globe size={17} aria-hidden="true" />
              <span className="shell-nav-text">{isArabic ? "English" : "العربية"}</span>
            </button>
          )}
          {userBlock}
          <button type="button" className="shell-side-btn shell-side-btn--logout" onClick={handleLogout} title={t("logout", "Logout")}>
            <LogOut size={17} aria-hidden="true" />
            <span className="shell-nav-text">{t("logout", "Logout")}</span>
          </button>
        </div>
      </aside>

      {/* ── Phone top bar ── */}
      <header className="shell-topbar">
        <div className="shell-topbar-logo">
          <img src="/ectron-logo.png" alt="ECTRON" />
        </div>
        <div className="shell-topbar-title" title={currentTitle}>
          {currentTitle}
        </div>
        {canChangeLanguage && (
          <button
            type="button"
            className="shell-topbar-btn"
            onClick={toggleLanguage}
            title={isArabic ? "Switch to English" : "التحويل إلى العربية"}
            aria-label={isArabic ? "Switch to English" : "التحويل إلى العربية"}
          >
            <Globe size={16} aria-hidden="true" />
            <span>{isArabic ? "EN" : "ع"}</span>
          </button>
        )}
      </header>

      {/* ── Phone drawer ("More") ── */}
      <div
        className={`shell-drawer-backdrop${drawerOpen ? " open" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`shell-drawer${drawerOpen ? " open" : ""}`}
        aria-label={L("كل الصفحات", "All pages")}
        aria-hidden={!drawerOpen}
      >
        <div className="shell-drawer-head">
          {userBlock}
          <button
            type="button"
            className="shell-drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label={L("إغلاق", "Close")}
          >
            <X size={20} />
          </button>
        </div>
        {navList}
        {pwa.available && (
          <div className="shell-drawer-install">
            <button type="button" className="shell-side-btn shell-side-btn--install" onClick={handleInstall}>
              <Download size={17} aria-hidden="true" />
              <span>{installLabel}</span>
            </button>
          </div>
        )}
        <div className="shell-drawer-footer">
          {canChangeLanguage && (
            <button type="button" className="shell-side-btn" onClick={toggleLanguage}>
              <Globe size={17} aria-hidden="true" />
              <span>{isArabic ? "English" : "العربية"}</span>
            </button>
          )}
          <button type="button" className="shell-side-btn shell-side-btn--logout" onClick={handleLogout}>
            <LogOut size={17} aria-hidden="true" />
            <span>{t("logout", "Logout")}</span>
          </button>
        </div>
      </aside>

      {/* ── Page ── */}
      <main className="shell-main">
        <div className="page-container">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* ── Phone bottom bar ── */}
      <nav className="shell-bottombar" aria-label={L("اختصارات", "Shortcuts")}>
        {bottomItems.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) => `shell-bottombar-btn${isActive ? " active" : ""}`}
          >
            <it.Icon size={21} strokeWidth={2.1} aria-hidden="true" />
            <span>{L(it.shortAr, it.shortEn)}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={`shell-bottombar-btn${moreActive ? " active" : ""}`}
          onClick={() => setDrawerOpen((o) => !o)}
          aria-expanded={drawerOpen}
        >
          <Menu size={21} strokeWidth={2.1} aria-hidden="true" />
          <span>{L("المزيد", "More")}</span>
        </button>
      </nav>

      {/* ── iPhone / iPad: how to add the app to the home screen ── */}
      {iosHelpOpen && (
        <div className="modal-backdrop" onClick={() => setIosHelpOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2 className="modal-title">{installLabel}</h2>
              <button type="button" className="modal-close" onClick={() => setIosHelpOpen(false)} aria-label={L("إغلاق", "Close")}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <ol className="pwa-ios-steps">
                <li>
                  <Share size={20} aria-hidden="true" />
                  <span>{L("افتح الموقع في Safari واضغط زر المشاركة تحت.", "Open the site in Safari and tap the Share button.")}</span>
                </li>
                <li>
                  <SquarePlus size={20} aria-hidden="true" />
                  <span>{L("اختار \"إضافة إلى الشاشة الرئيسية\".", "Choose \"Add to Home Screen\".")}</span>
                </li>
                <li>
                  <img src="/apple-touch-icon.png" alt="" width="20" height="20" style={{ borderRadius: 5 }} />
                  <span>{L("اضغط \"إضافة\" — بتطلع أيقونة ECTRON وتفتح مثل أي تطبيق.", "Tap \"Add\" — the ECTRON icon opens like any other app.")}</span>
                </li>
              </ol>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-primary" onClick={() => setIosHelpOpen(false)}>
                {L("تمام", "Got it")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
