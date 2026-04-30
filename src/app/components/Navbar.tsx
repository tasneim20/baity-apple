import { Link, useNavigate, useLocation } from "react-router";
import { Home, Plus, User, Menu, X, Moon, Sun, Languages, Heart, Settings, LayoutDashboard, MessageCircle, LogOut, ChevronDown, Search, Shield, Bell, Flag, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { useApp, supabase } from "../context/AppContext";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { language, setLanguage, theme, setTheme, t, user, isAuthenticated, threads, unreadNotificationsCount } = useApp();

  const isActive = (path: string) => location.pathname === path;
  const getLinkClasses = (path: string) => {
    const baseClasses = "flex items-center gap-2 text-foreground transition-colors px-3 py-2 rounded-lg font-medium text-sm";
    const activeClasses = isActive(path) ? "text-accent bg-accent/10" : "hover:text-accent hover:bg-muted";
    return `${baseClasses} ${activeClasses}`;
  };
  const getSimpleLinkClasses = (path: string) => {
    const baseClasses = "text-foreground transition-colors px-4 py-2 rounded-lg font-medium text-sm";
    const activeClasses = isActive(path) ? "text-accent bg-accent/10" : "hover:text-accent hover:bg-muted";
    return `${baseClasses} ${activeClasses}`;
  };

  const toggleLanguage = () => setLanguage(language === "ar" ? "en" : "ar");
  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");
  const handleLogout = async () => {
    setUserMenuOpen(false);
    const isAdmin = user?.email === "admin@baity.com";
    await supabase.auth.signOut();
    navigate(isAdmin ? "/admin/login" : "/");
  };

  // Check if user is admin
  const isAdmin = user?.role === "admin" || user?.email === "admin@baity.com";

  // Real unread messages count from threads
  const unreadMessages = (threads || []).reduce((sum: number, t: any) => {
    return sum + (t.messages || []).filter((m: any) => !m.isRead && m.senderId !== user?.id).length;
  }, 0);

  // If admin is on the user-facing site, show an admin-mode banner
  if (isAdmin) {
    return (
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed inset-x-0 top-0 z-[9999] bg-slate-900/98 backdrop-blur-md border-b border-amber-500/40 shadow-xl"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent-blue flex items-center justify-center shadow-lg">
                <Home className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white hidden sm:inline">{t("logoName")}</span>
            </Link>

            {/* Admin Mode Badge */}
            <div className="hidden md:flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 rounded-xl px-4 py-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 text-xs font-black uppercase tracking-widest">
                {language === "ar" ? "وضع الأدمن — أنت مسجّل كمدير النظام" : "Admin Mode — You are logged in as Admin"}
              </span>
            </div>

            {/* Right: site links + admin panel btn */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/"
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
              >
                <Home className="w-4 h-4" />
                {language === "ar" ? "الرئيسية" : "Home"}
              </Link>
              <Link
                to="/properties"
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
              >
                <Search className="w-4 h-4" />
                {language === "ar" ? "تصفح" : "Browse"}
              </Link>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                aria-label="Toggle theme"
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>

              {/* Language toggle */}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-bold"
              >
                <Languages className="w-4 h-4" />
                <span>{language === "ar" ? "EN" : "ع"}</span>
              </button>

              {/* Go to Admin Panel — prominent CTA */}
              <Link
                to="/admin"
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white px-4 py-2 rounded-xl font-black text-sm shadow-lg hover:shadow-amber-500/40 hover:scale-105 transition-all"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">{language === "ar" ? "لوحة الأدمن" : "Admin Panel"}</span>
              </Link>

              {/* User dropdown */}
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-xs shadow">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        className="absolute end-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50"
                      >
                        <div className="p-3 border-b border-slate-700 bg-slate-900/60">
                          <div className="flex items-center gap-2 mb-1">
                            <Shield className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest">مدير النظام</span>
                          </div>
                          <p className="text-sm font-bold text-white truncate">{user.name}</p>
                          <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        </div>
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-start text-amber-400 hover:bg-amber-400/10 transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          <span className="font-bold text-sm">{language === "ar" ? "لوحة تحكم الأدمن" : "Admin Dashboard"}</span>
                        </Link>
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

              {/* Mobile menu btn */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-all"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Admin mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-slate-900 border-t border-slate-700/60"
            >
              <div className="px-4 py-3 space-y-1">
                <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-2 mb-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300 text-xs font-bold">{language === "ar" ? "أنت مسجّل كمدير النظام" : "Logged in as Admin"}</span>
                </div>
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all text-sm">
                  <Home className="w-4 h-4" />
                  {language === "ar" ? "الرئيسية" : "Home"}
                </Link>
                <Link to="/properties" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all text-sm">
                  <Search className="w-4 h-4" />
                  {language === "ar" ? "تصفح العقارات" : "Browse Properties"}
                </Link>
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-bold text-sm"
                >
                  <Shield className="w-4 h-4" />
                  {language === "ar" ? "لوحة تحكم الأدمن" : "Admin Dashboard"}
                </Link>
                <div className="pt-2 border-t border-slate-700/60 flex gap-2">
                  <button onClick={toggleTheme} className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-sm transition-all border border-slate-700/40">
                    {theme === "light" ? <><Moon className="w-4 h-4" /><span className="text-xs">{language === "ar" ? "داكن" : "Dark"}</span></> : <><Sun className="w-4 h-4" /><span className="text-xs">{language === "ar" ? "فاتح" : "Light"}</span></>}
                  </button>
                  <button onClick={toggleLanguage} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-sm transition-all border border-slate-700/40">
                    <Languages className="w-4 h-4" />
                    <span className="font-bold text-xs">{language === "ar" ? "English" : "عربي"}</span>
                  </button>
                  <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 text-sm font-bold transition-all border border-red-500/20">
                    <LogOut className="w-4 h-4" />
                    {language === "ar" ? "خروج" : "Logout"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    );
  }

  // ─── Normal User Navbar ───
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed inset-x-0 top-0 z-[9999] bg-background/80 backdrop-blur-md border-b border-border"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent-blue flex items-center justify-center shadow-lg">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-primary hidden sm:inline">{t("logoName")}</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/" className={getLinkClasses("/")} title={language === "ar" ? "الرئيسية" : "Home"}>
              <Home className="w-5 h-5" />
              <span>{t("home")}</span>
            </Link>
            <Link to="/properties" className={getLinkClasses("/properties")} title={language === "ar" ? "تصفح العقارات" : "Browse Properties"}>
              <Search className="w-5 h-5" />
              <span>{language === "ar" ? "تصفح العقارات" : "Browse Properties"}</span>
            </Link>
            {isAuthenticated && (
              <Link to="/dashboard" className={getLinkClasses("/dashboard")} title={language === "ar" ? "لوحة التحكم" : "Dashboard"}>
                <LayoutDashboard className="w-5 h-5" />
                <span>{language === "ar" ? "لوحة التحكم" : "Dashboard"}</span>
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/notifications" className={`${getLinkClasses("/notifications")} relative`} title={language === "ar" ? "الإشعارات" : "Notifications"}>
                <Bell className="w-5 h-5" />
                <span>{language === "ar" ? "الإشعارات" : "Notifications"}</span>
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -end-1 bg-amber-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/messages" className={`${getLinkClasses("/messages")} relative`} title={language === "ar" ? "الرسائل" : "Messages"}>
                <MessageCircle className="w-5 h-5" />
                <span>{language === "ar" ? "الرسائل" : "Messages"}</span>
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -end-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse">
                    {unreadMessages}
                  </span>
                )}
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/favorites" className={getLinkClasses("/favorites")} title={language === "ar" ? "المفضلة" : "Favorites"}>
                <Heart className={`w-5 h-5 ${isActive("/favorites") ? "fill-red-500" : ""} transition-all`} />
                <span>{language === "ar" ? "المفضلة" : "Favorites"}</span>
              </Link>
            )}
            <Link to="/settings" className={getLinkClasses("/settings")} title={language === "ar" ? "الإعدادات" : "Settings"}>
              <Settings className="w-5 h-5" />
              <span>{language === "ar" ? "الإعدادات" : "Settings"}</span>
            </Link>

            {isAuthenticated ? (
              <div className="relative ms-2">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-foreground hover:text-accent transition-colors px-3 py-2 rounded-lg hover:bg-muted font-medium text-sm"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-accent-blue flex items-center justify-center text-white font-bold text-xs">
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                  <span>{user?.name}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute start-0 mt-2 w-48 bg-background border border-border rounded-xl shadow-2xl overflow-hidden z-50"
                    >
                      <div className="p-3 border-b border-border bg-muted">
                        <p className="text-sm font-bold text-foreground">{user?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-end hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 transition-colors"
                      >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">{language === "ar" ? "تسجيل الخروج" : "Logout"}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => navigate("/auth")}
                className="flex items-center gap-2 text-foreground hover:text-accent transition-colors px-3 py-2 rounded-lg hover:bg-muted font-medium text-sm"
              >
                <User className="w-5 h-5" />
                <span>{t("myAccount")}</span>
              </button>
            )}

            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted transition-all" aria-label="Toggle theme">
              {theme === "light" ? <Moon className="w-5 h-5 text-foreground" /> : <Sun className="w-5 h-5 text-foreground" />}
            </button>

            <button onClick={toggleLanguage} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-all text-foreground font-bold text-sm">
              <Languages className="w-5 h-5" />
              <span>{language === "ar" ? "EN" : "ع"}</span>
            </button>

            {/* أضف عقارك — للمستخدمين العاديين فقط */}
            <Link to="/add-property" className="flex items-center gap-2 bg-gradient-to-r from-accent to-accent-blue text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-accent/50 hover:scale-105 transition-all font-bold text-sm ms-2">
              <Plus className="w-5 h-5" />
              <span>{t("addProperty")}</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-t border-border"
          >
            <div className="px-4 py-3 space-y-1">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 ${getSimpleLinkClasses("/")}`}>
                <Home className="w-5 h-5" />
                <span>{t("home")}</span>
              </Link>
              <Link to="/properties" onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 ${getSimpleLinkClasses("/properties")}`}>
                <Search className="w-5 h-5" />
                <span>{language === "ar" ? "تصفح العقارات" : "Browse Properties"}</span>
              </Link>
              {isAuthenticated && (
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 ${getSimpleLinkClasses("/dashboard")}`}>
                  <LayoutDashboard className="w-5 h-5" />
                  <span>{language === "ar" ? "لوحة التحكم" : "Dashboard"}</span>
                </Link>
              )}
              {isAuthenticated && (
                <Link to="/notifications" onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 relative ${getSimpleLinkClasses("/notifications")}`}>
                  <Bell className="w-5 h-5" />
                  <span>{language === "ar" ? "الإشعارات" : "Notifications"}</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="ms-auto bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </Link>
              )}
              {isAuthenticated && (
                <Link to="/messages" onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 relative ${getSimpleLinkClasses("/messages")}`}>
                  <MessageCircle className="w-5 h-5" />
                  <span>{language === "ar" ? "الرسائل" : "Messages"}</span>
                  {unreadMessages > 0 && (
                    <span className="ms-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
              )}
              {isAuthenticated && (
                <Link to="/favorites" onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 ${getSimpleLinkClasses("/favorites")}`}>
                  <Heart className={`w-5 h-5 ${isActive("/favorites") ? "fill-red-500" : ""} transition-all`} />
                  <span>{language === "ar" ? "المفضلة" : "Favorites"}</span>
                </Link>
              )}
              <Link to="/settings" onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 ${getSimpleLinkClasses("/settings")}`}>
                <Settings className="w-5 h-5" />
                <span>{language === "ar" ? "الإعدادات" : "Settings"}</span>
              </Link>

              {/* أضف عقارك — للمستخدمين العاديين فقط */}
              <Link to="/add-property" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-accent-blue text-white px-6 py-2 rounded-lg mt-2">
                <Plus className="w-5 h-5" />
                <span>{t("addProperty")}</span>
              </Link>

              {!isAuthenticated && (
                <button
                  onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-center gap-2 ${getSimpleLinkClasses("/auth")}`}
                >
                  <User className="w-5 h-5" />
                  <span>{t("myAccount")}</span>
                </button>
              )}
              {isAuthenticated && (
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors text-sm font-medium mt-1"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{language === "ar" ? "تسجيل الخروج" : "Logout"}</span>
                </button>
              )}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button onClick={toggleTheme} className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg hover:bg-muted transition-all">
                  {theme === "light" ? (
                    <><Moon className="w-5 h-5" /><span className="text-xs">{language === "ar" ? "داكن" : "Dark"}</span></>
                  ) : (
                    <><Sun className="w-5 h-5" /><span className="text-xs">{language === "ar" ? "فاتح" : "Light"}</span></>
                  )}
                </button>
                <button onClick={toggleLanguage} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-all">
                  <Languages className="w-5 h-5" />
                  <span className="font-bold text-xs">{language === "ar" ? "English" : "عربي"}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}