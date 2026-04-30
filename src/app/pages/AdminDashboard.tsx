import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { useEffect, useState, useCallback } from "react";
import {
  Shield, Home, Flag, MessageSquare, FileText,
  ChevronRight, Clock, CheckCircle, AlertTriangle,
  RefreshCw, TrendingUp, BarChart3,
  Handshake, Bell, Activity, FileSpreadsheet, Database, Users,
} from "lucide-react";
import AdminNavbar from "../components/AdminNavbar";
import { useApp, getValidToken } from "../context/AppContext";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b`;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, authReady } = useApp();

  const isAdmin = user?.email === "admin@baity.com";

  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    conversations: 0,
    transactions: 0,
    completedTx: 0,
    inProgressTx: 0,
    adminAdded: 0,
    totalUsers: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (!user) { navigate("/admin/login", { replace: true }); return; }
    if (!isAdmin) navigate("/", { replace: true });
  }, [user, isAdmin, authReady, navigate]);

  const fetchStats = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoadingStats(true);
    try {
      // getValidToken handles caching, expiry, and auto-refresh internally
      const token = await getValidToken();
      if (!token) return;

      const headers = {
        "Authorization": `Bearer ${publicAnonKey}`,
        "X-User-Token": token,
        "Content-Type": "application/json",
      };

      // Add cache-busting timestamp to ensure fresh data
      const timestamp = Date.now();
      const [pendingRes, approvedRes, convsRes, txRes, usersRes, reportsRes] = await Promise.all([
        fetch(`${API}/admin/pending?_t=${timestamp}`, { headers }),
        fetch(`${API}/admin/properties?_t=${timestamp}`, { headers }),
        fetch(`${API}/admin/conversations?_t=${timestamp}`, { headers }),
        fetch(`${API}/admin/transactions?_t=${timestamp}`, { headers }),
        fetch(`${API}/admin/users?_t=${timestamp}`, { headers }),
        fetch(`${API}/admin/reports?_t=${timestamp}`, { headers }),
      ]);

      // Helper to safely parse JSON with error handling
      const safeJsonParse = async (res: Response, name: string) => {
        try {
          // Check if response is ok first
          if (!res.ok) {
            console.error(`${name} response not ok:`, res.status, res.statusText);
            return { success: false, data: [] };
          }

          // Get the text first to check if it's valid JSON
          const text = await res.text();
          if (!text || text.trim() === '') {
            console.error(`${name} empty response`);
            return { success: false, data: [] };
          }

          // Try to parse as JSON
          return JSON.parse(text);
        } catch (e) {
          console.error(`${name} JSON parse error:`, e);
          return { success: false, data: [] };
        }
      };

      const [pendingData, approvedData, convsData, txData, usersData, reportsData] = await Promise.all([
        safeJsonParse(pendingRes, 'pending'),
        safeJsonParse(approvedRes, 'approved'),
        safeJsonParse(convsRes, 'conversations'),
        safeJsonParse(txRes, 'transactions'),
        safeJsonParse(usersRes, 'users'),
        safeJsonParse(reportsRes, 'reports'),
      ]);

      const txList = txData.success ? (txData.data || []) : [];
      const allProps = [
        ...(pendingData.success ? pendingData.data || [] : []),
        ...(approvedData.success ? approvedData.data || [] : []),
      ];
      const adminAdded = allProps.filter((p: any) =>
        p.uploadedByEmail === "admin@baity.com" ||
        p.ownerEmail === "admin@baity.com" ||
        (p.uploadedBy && (p.uploadedByEmail === "Admin" || p.uploadedByEmail))
      ).length;

      // Calculate users count - same logic as AdminUsers page for consistency
      const usersMap = new Map<string, boolean>();

      // 1. From primary users endpoint
      if (usersData.success && Array.isArray(usersData.data)) {
        usersData.data.forEach((u: any) => {
          if (u.id && u.email) usersMap.set(u.id, true);
        });
      }

      // 2. From pending properties
      if (pendingData.success && Array.isArray(pendingData.data)) {
        pendingData.data.forEach((p: any) => {
          if (p.ownerId && p.ownerEmail) usersMap.set(p.ownerId, true);
          if (p.uploadedBy && p.uploadedByEmail && p.uploadedBy !== p.ownerId) usersMap.set(p.uploadedBy, true);
        });
      }

      // 3. From approved properties
      if (approvedData.success && Array.isArray(approvedData.data)) {
        approvedData.data.forEach((p: any) => {
          if (p.ownerId && p.ownerEmail) usersMap.set(p.ownerId, true);
          if (p.uploadedBy && p.uploadedByEmail && p.uploadedBy !== p.ownerId) usersMap.set(p.uploadedBy, true);
        });
      }

      // 4. From conversations
      if (convsData.success && Array.isArray(convsData.data)) {
        convsData.data.forEach((c: any) => {
          if (c.sender_id && c.sender_email) usersMap.set(c.sender_id, true);
          if (c.receiver_id && c.receiver_email) usersMap.set(c.receiver_id, true);
        });
      }

      // 5. From reports
      if (reportsData.success && Array.isArray(reportsData.data)) {
        reportsData.data.forEach((r: any) => {
          if (r.reporterId && r.reporterEmail) usersMap.set(r.reporterId, true);
        });
      }

      const totalUsers = usersMap.size;

      setStats({
        pending: pendingData.success ? (pendingData.data?.length ?? 0) : 0,
        approved: approvedData.success ? (approvedData.data?.length ?? 0) : 0,
        conversations: convsData.success ? (convsData.data?.length ?? 0) : 0,
        transactions: txList.length,
        completedTx: txList.filter((t: any) => t.status === "completed").length,
        inProgressTx: txList.filter((t: any) => t.status === "in_progress").length,
        adminAdded,
        totalUsers,
      });
    } catch (e) {
      console.error("fetchStats error:", e);
    } finally {
      setIsLoadingStats(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin && authReady) fetchStats();
  }, [isAdmin, authReady, fetchStats]);

  if (!authReady || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400">جارٍ التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }
  if (!isAdmin) return null;

  const adminPages = [
    {
      title: "إدارة العقارات",
      description: "مراجعة طلبات العقارات الجديدة — موافقة أو رفض مع سبب",
      icon: Home,
      path: "/admin/properties",
      color: "blue",
      badge: stats.pending > 0 ? `${stats.pending} بانتظار المراجعة` : null,
      badgeColor: "amber",
      priority: stats.pending > 0,
    },
    {
      title: "العقارات المضافة بواسطة الأدمن",
      description: "عرض وإدارة جميع العقارات التي أضافها الأدمن — يدوياً أو عبر CSV — وتظهر مباشرة للمستخدمين",
      icon: Database,
      path: "/admin/added-properties",
      color: "amber",
      badge: stats.adminAdded > 0 ? `${stats.adminAdded} عقار` : null,
      badgeColor: "teal",
      priority: false,
    },
    {
      title: "إدارة المستخدمين",
      description: "عرض وحذف حسابات المستخدمين — مع حذف كامل للبيانات المرتبطة",
      icon: Users,
      path: "/admin/users",
      color: "violet",
      badge: stats.totalUsers > 0 ? `${stats.totalUsers} مستخدم` : null,
      badgeColor: "violet",
      priority: false,
    },
    {
      title: "متابعة عمليات البيع والشراء",
      description: "رصد جميع عمليات التفاوض بين المشترين والبائعين — التدخل عند الحاجة وتحديث الحالات",
      icon: Handshake,
      path: "/admin/transactions",
      color: "emerald",
      badge: stats.inProgressTx > 0 ? `${stats.inProgressTx} جارية` : (stats.transactions > 0 ? `${stats.transactions} عملية` : null),
      badgeColor: "emerald",
      priority: true,
    },
    {
      title: "التحكم بالرسائل",
      description: "مراقبة جميع محادثات المنصة — عرض وحذف وتعديل أي رسالة",
      icon: MessageSquare,
      path: "/admin/messages",
      color: "purple",
      badge: stats.conversations > 0 ? `${stats.conversations} محادثة` : null,
      badgeColor: "purple",
      priority: false,
    },
    {
      title: "البلاغات",
      description: "مراجعة بلاغات المستخدمين واتخاذ الإجراءات اللازمة",
      icon: Flag,
      path: "/admin/reports",
      color: "red",
      badge: null,
      badgeColor: "red",
      priority: false,
    },
    {
      title: "إدارة بيانات CSV",
      description: "رفع عقارات جماعي عبر ملف CSV وتصدير قاعدة البيانات الحالية",
      icon: FileSpreadsheet,
      path: "/admin/csv",
      color: "teal",
      badge: null,
      badgeColor: "teal",
      priority: false,
    },
    {
      title: "سجل العمليات",
      description: "تاريخ جميع إجراءات الأدمن ومتابعة النشاط",
      icon: FileText,
      path: "/admin/logs",
      color: "slate",
      badge: null,
      badgeColor: "slate",
      priority: false,
    },
  ];

  const colorMap: Record<string, string> = {
    blue:    "from-blue-500 to-blue-600",
    amber:   "from-amber-400 to-orange-500",
    emerald: "from-emerald-500 to-teal-600",
    purple:  "from-purple-500 to-purple-600",
    red:     "from-red-500 to-red-600",
    teal:    "from-teal-500 to-cyan-600",
    slate:   "from-slate-500 to-slate-600",
    violet:  "from-violet-500 to-purple-600",
  };
  const badgeMap: Record<string, string> = {
    amber:   "bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300",
    teal:    "bg-teal-100 dark:bg-teal-900/40 border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-300",
    emerald: "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300",
    purple:  "bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-300",
    red:     "bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300",
    slate:   "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300",
    violet:  "bg-violet-100 dark:bg-violet-900/40 border-violet-300 dark:border-violet-700 text-violet-800 dark:text-violet-300",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <AdminNavbar pendingCount={stats.pending} />

      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

        {/* ── Admin Identity Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-2xl border border-slate-700/50">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl text-white font-black text-2xl">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-400 text-xs font-black uppercase tracking-widest">لوحة تحكم الأدمن</span>
                  </div>
                  <p className="text-2xl font-black">{user.name}</p>
                  <p className="text-slate-400 text-sm">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchStats}
                  disabled={isLoadingStats}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-white/20 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all text-sm font-bold"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingStats ? "animate-spin" : ""}`} />
                  تحديث الإحصائيات
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Page Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 text-amber-600 dark:text-amber-400 px-4 py-1.5 rounded-full text-sm font-bold mb-3">
            <Activity className="w-4 h-4" />
            الإدارة الشاملة — منصة بيتي
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-primary dark:text-white">
            مرحباً بك في لوحة التحكم
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            إدارة شاملة لجميع عمليات منصة بيتي العقارية — مستخدمون، عقارات، رسائل، عمليات بيع وشراء
          </p>
        </motion.div>

        {/* ── Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 mb-8"
        >
          {[
            { label: "بانتظار المراجعة", value: stats.pending,       icon: Clock,        color: "amber",   urgent: stats.pending > 0 },
            { label: "عقارات منشورة",    value: stats.approved,      icon: CheckCircle,  color: "green" },
            { label: "المحادثات",        value: stats.conversations,  icon: MessageSquare,color: "blue" },
            { label: "عمليات البيع",     value: stats.transactions,   icon: Handshake,    color: "emerald" },
            { label: "عقارات الأدمن",   value: stats.adminAdded,     icon: Database,     color: "teal" },
            { label: "المستخدمون",       value: stats.totalUsers,     icon: Users,        color: "violet" },
            { label: "عمليات مكتملة",   value: stats.completedTx,    icon: BarChart3,    color: "purple" },
          ].map((stat, i) => {
            const Icon = stat.icon;
            const colorsBg: Record<string, string> = {
              amber:   "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
              green:   "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
              blue:    "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
              emerald: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
              purple:  "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
              teal:    "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800",
              violet:  "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800",
            };
            const colorsText: Record<string, string> = {
              amber: "text-amber-600", green: "text-green-600", blue: "text-blue-600",
              emerald: "text-emerald-600", purple: "text-purple-600", teal: "text-teal-600",
              violet: "text-violet-600",
            };
            const colorsNum: Record<string, string> = {
              amber: "text-amber-700 dark:text-amber-300", green: "text-green-700 dark:text-green-300",
              blue: "text-blue-700 dark:text-blue-300", emerald: "text-emerald-700 dark:text-emerald-300",
              purple: "text-purple-700 dark:text-purple-300", teal: "text-teal-700 dark:text-teal-300",
              violet: "text-violet-700 dark:text-violet-300",
            };
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * i }}
                className={`rounded-2xl border p-4 ${colorsBg[stat.color]} ${(stat as any).urgent ? "ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-slate-950" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${colorsText[stat.color]}`} />
                  {(stat as any).urgent && <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />}
                </div>
                {isLoadingStats ? (
                  <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <p className={`text-3xl font-black ${colorsNum[stat.color]}`}>{stat.value}</p>
                )}
                <p className={`text-xs font-bold mt-1 ${colorsText[stat.color]}`}>{stat.label}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ── Pending Alert */}
        {stats.pending > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-600 rounded-2xl p-5 mb-8 flex items-center justify-between gap-4 flex-wrap"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-black text-amber-800 dark:text-amber-200">
                  يوجد {stats.pending} عقار{stats.pending > 1 ? "ات" : ""} بانتظار مراجعتك!
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  انتقل إلى إدارة العقارات للموافقة أو الرفض
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/admin/properties")}
              className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold transition-colors text-sm"
            >
              مراجعة الآن
            </button>
          </motion.div>
        )}

        {/* ── Admin Sections */}
        <div className="mb-8">
          <h2 className="text-xl font-black text-primary dark:text-white mb-5 flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-500" />
            أقسام لوحة تحكم الأدمن
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {adminPages.map((page, index) => {
              const Icon = page.icon;
              return (
                <motion.button
                  key={page.path}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.07 * index }}
                  onClick={() => navigate(page.path)}
                  className={`bg-white dark:bg-slate-800 border rounded-3xl p-6 text-start hover:shadow-2xl hover:scale-[1.02] transition-all group relative overflow-hidden ${
                    page.priority
                      ? "border-amber-300 dark:border-amber-700 ring-2 ring-amber-300/50 dark:ring-amber-700/50"
                      : "border-border dark:border-slate-700"
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${colorMap[page.color]} opacity-0 group-hover:opacity-5 transition-opacity rounded-3xl`} />

                  <div className="flex items-start justify-between mb-4 relative">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorMap[page.color]} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    {page.badge && (
                      <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${badgeMap[page.badgeColor]} animate-pulse`}>
                        {page.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-black text-primary dark:text-white mb-1.5 relative flex items-center justify-between gap-2">
                    <span>{page.title}</span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed relative">
                    {page.description}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── Admin Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-3xl p-6"
        >
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-200 mb-2">ملاحظات هامة للأدمن</p>
              <ul className="space-y-1.5 text-sm text-amber-700 dark:text-amber-300">
                <li>• جميع العقارات تُحفظ بحالة "قيد المراجعة" ولا تُنشر إلا بعد موافقتك</li>
                <li>• قسم "متابعة عمليات البيع والشراء" يعرض كل استفسار وتفاوض بين المستخدمين</li>
                <li>• يمكنك حذف أي رسالة أو محادثة غير لائقة من قسم "التحكم بالرسائل"</li>
                <li>• قسم "إدارة بيانات CSV" يتيح لك رفع عقارات جماعية وتصدير قاعدة البيانات</li>
                <li>• جميع إجراءاتك مسجّلة في سجل العمليات</li>
              </ul>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}