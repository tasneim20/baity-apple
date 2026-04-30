import { Link, useNavigate, useLocation } from "react-router";
import {
  Home, Shield, MessageSquare, Handshake, Flag,
  FileText, LogOut, Menu, X, ChevronDown,
  ExternalLink, Bell, LayoutDashboard, Moon, Sun
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { useApp, supabase } from "../context/AppContext";

const ADMIN_NAV = [
  { label: "لوحة الإدارة",              labelEn: "Dashboard",        path: "/admin",               icon: LayoutDashboard },
  { label: "إدارة العقارات",             labelEn: "Properties",       path: "/admin/properties",    icon: Home },
  { label: "التحكم بالرسائل",           labelEn: "Msg Control",      path: "/admin/messages",      icon: MessageSquare },
  { label: "متابعة البيع والشراء",       labelEn: "Transactions",     path: "/admin/transactions",  icon: Handshake },
  { label: "البلاغات",                  labelEn: "Reports",          path: "/admin/reports",       icon: Flag },
  { label: "سجل العمليات",              labelEn: "Logs",             path: "/admin/logs",          icon: FileText },
];

export default function AdminNavbar({ pendingCount = 0 }: { pendingCount?: number }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, language, theme, setTheme } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isActive = (path: string) =>
    path === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(path);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed inset-x-0 top-0 z-[9999] bg-slate-900/95 backdrop-blur-md border-b border-slate-700/60 shadow-xl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">

          {/* ── Logo + Admin Badge */}
          <Link to="/admin" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-white font-black text-sm tracking-wide">بيتي</span>
              <span className="text-amber-400 text-[10px] font-bold uppercase tracking-widest">Admin Panel</span>
            </div>
          </Link>

          {/* ── Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1 overflow-x-auto">
            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                    active
                      ? "bg-amber-400/15 text-amber-400 border border-amber-400/30"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{language === "ar" ? item.label : item.labelEn}</span>
                  {item.path === "/admin/properties" && pendingCount > 0 && (
                    <span className="absolute -top-1.5 -end-1.5 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black animate-pulse shadow-md">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* ── Right Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Visit site */}
            <Link
              to="/"
              target="_blank"
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs font-bold"
              title="زيارة الموقع"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden xl:inline">{language === "ar" ? "زيارة الموقع" : "Visit Site"}</span>
            </Link>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* User menu */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-xs shadow">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white text-sm font-bold hidden sm:inline max-w-24 truncate">
                    {user.name}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      className="absolute end-0 mt-2 w-52 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50"
                    >
                      <div className="p-3 border-b border-slate-700 bg-slate-900/60">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest">مدير النظام</span>
                        </div>
                        <p className="text-sm font-bold text-white truncate">{user.name}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-start text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="font-bold text-sm">{language === "ar" ? "تسجيل الخروج" : "Logout"}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-all"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-slate-900 border-t border-slate-700/60"
          >
            <div className="px-4 py-3 space-y-1">
              {ADMIN_NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                      active
                        ? "bg-amber-400/15 text-amber-400 border border-amber-400/30"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{language === "ar" ? item.label : item.labelEn}</span>
                    {item.path === "/admin/properties" && pendingCount > 0 && (
                      <span className="ms-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                        {pendingCount} جديد
                      </span>
                    )}
                  </Link>
                );
              })}

              <div className="pt-2 border-t border-slate-700/60 flex gap-2">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-sm font-bold transition-all border border-slate-700/40"
                >
                  <ExternalLink className="w-4 h-4" />
                  زيارة الموقع
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 text-sm font-bold transition-all border border-red-500/20"
                >
                  <LogOut className="w-4 h-4" />
                  خروج
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
