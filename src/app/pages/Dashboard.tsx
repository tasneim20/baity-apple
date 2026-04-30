import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate, Link } from "react-router";
import {
  Eye, MessageCircle, Edit, Trash2,
  TrendingUp, Home, DollarSign, Heart, FileText,
  LayoutDashboard, Plus, User, LogIn, Bell, Globe,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { useApp } from "../context/AppContext";
import PropertyCard from "../components/PropertyCard";
import OwnerPropertyCard from "../components/OwnerPropertyCard";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, setUser, properties, language, isAuthenticated, favorites, threads, unreadNotificationsCount } = useApp();
  const ar = language === "ar";

  // Set page title
  useEffect(() => {
    document.title = ar ? "بيتي - لوحة التحكم" : "Baity - Dashboard";
  }, [ar]);

  // ─── Redirect admin to admin panel
  const isAdmin = user?.email === "admin@baity.com";
  useEffect(() => {
    if (isAdmin) navigate("/admin", { replace: true });
  }, [isAdmin, navigate]);

  // Real user properties filtered by userId
  const userProperties = properties.filter((p: any) => p.userId === user?.id);
  const totalViews = userProperties.reduce((sum: number, p: any) => sum + (p.views || 0), 0);
  const totalInquiries = userProperties.reduce((sum: number, p: any) => sum + (p.inquiries || 0), 0);
  const unreadMessages = (threads || []).reduce((sum: number, t: any) => {
    return sum + (t.messages || []).filter((m: any) => !m.isRead && m.senderId !== user?.id).length;
  }, 0);

  // Total properties on the platform (all approved)
  const totalPlatformProperties = properties.length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background dark:bg-slate-950">
        <Navbar />
        <div className="pt-24 flex items-center justify-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md mx-auto px-4"
          >
            <div className="w-24 h-24 bg-muted dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <LayoutDashboard className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-primary dark:text-slate-100 mb-2">
              {language === "ar" ? "يجب تسجيل الدخول" : "Login Required"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {language === "ar" ? "سجل دخولك للوصول إلى لوحة التحكم" : "Please login to access the dashboard"}
            </p>
            <button
              onClick={() => navigate("/auth")}
              className="inline-flex items-center gap-2 bg-accent text-white px-8 py-3 rounded-xl font-bold hover:bg-accent/90 transition-colors"
            >
              <LogIn className="w-5 h-5" />
              {language === "ar" ? "تسجيل الدخول" : "Login Now"}
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <div className="pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent-blue flex items-center justify-center shadow-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-primary dark:text-slate-100">
                  {language === "ar" ? `أهلاً، ${user?.name || user?.email?.split("@")[0] || ""}` : `Welcome, ${user?.name || user?.email?.split("@")[0] || ""}`}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {language === "ar" ? "إدارة عقاراتك ومتابعة الإحصائيات" : "Manage your properties and track statistics"}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Link
              to="/my-properties"
              className="bg-card dark:bg-slate-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all group border border-border dark:border-slate-700"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <span className="font-bold text-primary dark:text-slate-100">
                  {language === "ar" ? "عقاراتي" : "My Properties"}
                </span>
              </div>
            </Link>

            <Link
              to="/favorites"
              className="bg-card dark:bg-slate-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all group border border-border dark:border-slate-700"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                  <Heart className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <span className="font-bold text-primary dark:text-slate-100">
                    {language === "ar" ? "المفضلة" : "Favorites"}
                  </span>
                  {favorites.length > 0 && (
                    <span className="ms-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-500 px-1.5 py-0.5 rounded-full">
                      {favorites.length}
                    </span>
                  )}
                </div>
              </div>
            </Link>

            <Link
              to="/notifications"
              className="bg-card dark:bg-slate-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all group border border-border dark:border-slate-700 relative"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                  <Bell className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <span className="font-bold text-primary dark:text-slate-100">
                    {language === "ar" ? "الإشعارات" : "Notifications"}
                  </span>
                  {unreadNotificationsCount > 0 && (
                    <span className="ms-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-1.5 py-0.5 rounded-full">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </div>
              </div>
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-2 end-2 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
              )}
            </Link>

            <Link
              to="/add-property"
              className="bg-gradient-to-br from-accent to-amber-500 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-white">
                  {language === "ar" ? "أضف عقار" : "Add Property"}
                </span>
              </div>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-gradient-to-br from-accent to-amber-500 rounded-2xl p-6 text-white shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Home className="w-6 h-6" />
                </div>
                <TrendingUp className="w-6 h-6 opacity-70" />
              </div>
              <h3 className="text-sm opacity-90 mb-1">
                {language === "ar" ? "عقاراتي" : "My Properties"}
              </h3>
              <p className="text-4xl font-bold">{userProperties.length}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              whileHover={{ y: -4 }}
              className="bg-card dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-border dark:border-slate-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-accent-blue/10 rounded-xl flex items-center justify-center">
                  <Eye className="w-6 h-6 text-accent-blue" />
                </div>
              </div>
              <h3 className="text-sm text-muted-foreground mb-1">
                {language === "ar" ? "إجمالي المشاهدات" : "Total Views"}
              </h3>
              <p className="text-4xl font-bold text-primary dark:text-slate-100">{totalViews.toLocaleString()}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ y: -4 }}
              className="bg-card dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-border dark:border-slate-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                  <Heart className="w-6 h-6 text-red-500" />
                </div>
              </div>
              <h3 className="text-sm text-muted-foreground mb-1">
                {language === "ar" ? "المفضلة" : "Favorites"}
              </h3>
              <p className="text-4xl font-bold text-primary dark:text-slate-100">{favorites.length}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              whileHover={{ y: -4 }}
              className="bg-card dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-border dark:border-slate-700 relative overflow-hidden"
            >
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-3 end-3 w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
              )}
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                  <Bell className="w-6 h-6 text-amber-500" />
                </div>
                {unreadNotificationsCount > 0 && (
                  <span className="bg-amber-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                    {unreadNotificationsCount}
                  </span>
                )}
              </div>
              <h3 className="text-sm text-muted-foreground mb-1">
                {language === "ar" ? "الإشعارات الجديدة" : "New Notifications"}
              </h3>
              <p className="text-4xl font-bold text-primary dark:text-slate-100">{unreadNotificationsCount}</p>
            </motion.div>
          </div>

          {/* Platform Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
          >
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">
                  {language === "ar" ? "إجمالي عقارات المنصة" : "Total Platform Properties"}
                </p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                  {totalPlatformProperties.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-200 dark:border-green-800/50 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center shrink-0">
                <MessageCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">
                  {language === "ar" ? "رسائل غير مقروءة" : "Unread Messages"}
                </p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{unreadMessages}</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-200 dark:border-purple-800/50 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">
                  {language === "ar" ? "إجمالي الاستفسارات" : "Total Inquiries"}
                </p>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{totalInquiries}</p>
              </div>
            </div>
          </motion.div>

          {/* Properties List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card dark:bg-slate-800 rounded-2xl shadow-lg border border-border dark:border-slate-700 overflow-hidden"
          >
            <div className="p-6 border-b border-border dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-primary dark:text-slate-100">
                {language === "ar" ? "عقاراتي" : "My Properties"}
              </h2>
              <div className="flex gap-2">
                <Link
                  to="/my-properties"
                  className="px-4 py-2 bg-muted dark:bg-slate-700 text-foreground dark:text-slate-100 rounded-xl hover:bg-muted/80 transition-all text-sm"
                >
                  {language === "ar" ? "عرض الكل" : "View All"}
                </Link>
                <button
                  onClick={() => navigate("/add-property")}
                  className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-all text-sm"
                >
                  {language === "ar" ? "إضافة عقار" : "Add Property"}
                </button>
              </div>
            </div>

            <div className="p-6">
              {userProperties.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="text-4xl mb-3">🏠</div>
                  <p className="text-muted-foreground mb-4">
                    {language === "ar" ? "لا توجد عقارات منشورة بعد" : "No properties published yet"}
                  </p>
                  <Link
                    to="/add-property"
                    className="inline-flex items-center gap-2 bg-accent text-white px-6 py-2 rounded-xl font-bold hover:bg-accent/90 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    {language === "ar" ? "أضف أول عقار" : "Add First Property"}
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {userProperties.slice(0, 3).map((property: any, index: number) => (
                    <OwnerPropertyCard key={property.id} property={property} index={index} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}