import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  FileText, Search, RefreshCw, CheckCircle, XCircle, Shield,
  Clock, User, Check, X, Trash2, Edit3, Eye, EyeOff, AlertTriangle
} from "lucide-react";
import AdminNavbar from "../components/AdminNavbar";
import { useApp, getValidToken } from "../context/AppContext";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b`;

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("ar-JO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "—";
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "منذ لحظات";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `منذ ${days} يوم`;
  const weeks = Math.floor(days / 7);
  return `منذ ${weeks} أسبوع`;
}

// ─── Action Labels
const ACTION_LABELS: Record<string, { ar: string; icon: any; color: string }> = {
  approve: { ar: "✅ موافقة على عقار", icon: Check, color: "green" },
  reject: { ar: "❌ رفض عقار", icon: X, color: "red" },
  delete: { ar: "🗑️ حذف", icon: Trash2, color: "red" },
  hide: { ar: "🚫 إخفاء", icon: EyeOff, color: "orange" },
  edit: { ar: "✏️ تعديل", icon: Edit3, color: "blue" },
  report_action: { ar: "⚠️ إجراء على بلاغ", icon: AlertTriangle, color: "amber" },
  message_edit: { ar: "💬 تعديل رسالة", icon: Edit3, color: "purple" },
  message_delete: { ar: "🗑️ حذف رسالة", icon: Trash2, color: "red" },
};

const ENTITY_LABELS: Record<string, string> = {
  property: "عقار",
  message: "رسالة",
  report: "بلاغ",
  user: "مستخدم",
};

// ─── Log Detail Modal
function LogDetailModal({
  log,
  onClose,
}: {
  log: any;
  onClose: () => void;
}) {
  const actionInfo = ACTION_LABELS[log.action] || {
    ar: log.action,
    icon: FileText,
    color: "gray",
  };
  const Icon = actionInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full my-4 overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border dark:border-slate-700 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800 dark:to-slate-900">
          <div>
            <h3 className="text-xl font-bold text-primary dark:text-white flex items-center gap-2">
              <Icon className={`w-6 h-6 text-${actionInfo.color}-500`} />
              تفاصيل العملية
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDate(log.created_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Action Info */}
          <div className={`bg-${actionInfo.color}-50 dark:bg-${actionInfo.color}-900/20 border border-${actionInfo.color}-200 dark:border-${actionInfo.color}-800 rounded-xl p-4`}>
            <p className="text-sm font-bold text-muted-foreground mb-3">
              نوع العملية:
            </p>
            <p className={`text-xl font-bold text-${actionInfo.color}-700 dark:text-${actionInfo.color}-300 mb-2`}>
              {actionInfo.ar}
            </p>
            <p className="text-sm text-muted-foreground">
              على <span className="font-bold">{ENTITY_LABELS[log.entity_type] || log.entity_type}</span>
            </p>
          </div>

          {/* Admin Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
            <p className="text-sm font-bold text-blue-800 dark:text-blue-200 mb-2">
              معلومات الأدمن:
            </p>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" />
              <span className="font-bold">{log.admin_email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm">{formatDate(log.created_at)}</span>
              <span className="text-xs text-muted-foreground">
                ({timeAgo(log.created_at)})
              </span>
            </div>
          </div>

          {/* Entity ID */}
          <div className="bg-muted/40 rounded-xl p-4">
            <p className="text-xs font-bold text-muted-foreground mb-2">
              معرف العنصر (Entity ID):
            </p>
            <p className="font-mono text-sm text-primary dark:text-white break-all">
              {log.entity_id}
            </p>
          </div>

          {/* Details */}
          {log.details && Object.keys(log.details).length > 0 && (
            <div className="bg-muted/40 rounded-xl p-4">
              <p className="text-xs font-bold text-muted-foreground mb-3">
                تفاصيل إضافية:
              </p>
              <div className="space-y-2">
                {Object.entries(log.details).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="font-bold text-sm min-w-[100px]">
                      {key}:
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {typeof value === "object"
                        ? JSON.stringify(value, null, 2)
                        : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════

export default function AdminLogs() {
  const navigate = useNavigate();
  const { user, authReady } = useApp();

  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "property" | "message" | "report">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [notification, setNotification] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // ── إحصائيات النظام الفعلية (من قواعد البيانات الحقيقية)
  const [sysStats, setSysStats] = useState<{
    approvedProps: number | null;   // property_*
    pendingProps:  number | null;   // pending_property_*
    threads:       number | null;   // thread_*
    reports:       number | null;   // report_*
  }>({ approvedProps: null, pendingProps: null, threads: null, reports: null });

  const isAdmin = user?.email === "admin@baity.com";

  useEffect(() => {
    if (!authReady) return;
    if (!user) { navigate("/admin/login", { replace: true }); return; }
    if (user && !isAdmin) navigate("/", { replace: true });
  }, [user, isAdmin, authReady, navigate]);

  const getAdminToken = getValidToken;

  const showNotif = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getAdminToken();
      if (!token) { setIsLoading(false); return; }

      const headers = {
        Authorization: `Bearer ${publicAnonKey}`,
        "X-User-Token": token,
        "Content-Type": "application/json",
      };

      // ✅ جلب 5 مصادر بالتوازي للحصول على الأرقام الحقيقية
      const [logsRes, approvedRes, pendingRes, threadsRes, reportsRes] = await Promise.all([
        fetch(`${API}/admin/logs`,          { headers }),
        fetch(`${API}/admin/properties`,    { headers }),   // property_*   (مقبولة)
        fetch(`${API}/admin/pending`,       { headers }),   // pending_property_* (قيد المراجعة)
        fetch(`${API}/admin/conversations`, { headers }),   // thread_*     (المحادثات)
        fetch(`${API}/admin/reports`,       { headers }),   // report_*     (البلاغات)
      ]);

      const [logsData, approvedData, pendingData, threadsData, reportsData] = await Promise.all([
        logsRes.json(),
        approvedRes.json(),
        pendingRes.json(),
        threadsRes.json(),
        reportsRes.json(),
      ]);

      if (logsData.success) setLogs(logsData.data || []);

      setSysStats({
        approvedProps: approvedData.success ? (approvedData.data || []).length : null,
        pendingProps:  pendingData.success  ? (pendingData.data  || []).length : null,
        threads:       threadsData.success  ? (threadsData.data  || []).length : null,
        reports:       reportsData.success  ? (reportsData.data  || []).length : null,
      });

    } catch (e) {
      console.error("fetchLogs error:", e);
      showNotif("تعذّر جلب السجلات، يرجى المحاولة مجدداً", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchLogs();
  }, [isAdmin, fetchLogs]);

  // Auth check
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">جارٍ التحقق...</p>
        </div>
      </div>
    );
  }
  if (!isAdmin) return null;

  const filteredLogs = logs.filter((log) => {
    const matchesTab = activeTab === "all" || log.entity_type === activeTab;
    const matchesSearch =
      (log.admin_email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.action || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entity_type || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // ── أعداد السجلات حسب النوع (للتبويبات فقط)
  const propertyLogsCount = logs.filter((l) => l.entity_type === "property").length;
  const messageLogsCount  = logs.filter((l) => l.entity_type === "message").length;
  const reportLogsCount   = logs.filter((l) => l.entity_type === "report").length;

  // ── الأرقام الفعلية للنظام
  const totalPropsReal =
    sysStats.approvedProps !== null && sysStats.pendingProps !== null
      ? sysStats.approvedProps + sysStats.pendingProps
      : null;

  // مساعد لعرض رقم أو مؤشر تحميل
  const Num = ({ v }: { v: number | null }) =>
    v !== null ? <>{v}</> : <span className="text-2xl opacity-40 animate-pulse">…</span>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
      <AdminNavbar />

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -80 }}
            className="fixed top-24 inset-x-0 z-[60] flex justify-center px-4"
          >
            <div
              className={`${
                notification.type === "success"
                  ? "bg-green-500"
                  : "bg-red-500"
              } text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-lg`}
            >
              {notification.type === "success" ? (
                <CheckCircle className="w-6 h-6 shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 shrink-0" />
              )}
              <span className="font-bold">{notification.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <LogDetailModal
            log={selectedLog}
            onClose={() => setSelectedLog(null)}
          />
        )}
      </AnimatePresence>

      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-primary dark:text-white">
                  سجل العمليات
                </h1>
                <p className="text-muted-foreground">
                  تتبع جميع عمليات الأدمن — بيتي
                </p>
              </div>
            </div>
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-border rounded-xl hover:shadow-md transition-all text-sm font-bold"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              تحديث
            </button>
          </div>

          {/* Stats – أرقام حقيقية من قواعد البيانات */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {/* 1 – إجمالي العمليات المسجّلة = logs.length الحقيقي */}
            <div className="bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">إجمالي العمليات</p>
              <p className="text-4xl font-black text-slate-700 dark:text-slate-200">{logs.length}</p>
              <p className="text-[10px] text-slate-400 mt-1">إجراء مسجّل</p>
            </div>
            {/* 2 – العقارات الفعلية (مقبولة + قيد المراجعة) */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">إجمالي العقارات</p>
              <p className="text-4xl font-black text-blue-700 dark:text-blue-300">
                <Num v={totalPropsReal} />
              </p>
              <p className="text-[10px] text-blue-400 mt-1">
                {sysStats.approvedProps !== null && sysStats.pendingProps !== null
                  ? `${sysStats.approvedProps} مقبول · ${sysStats.pendingProps} معلّق`
                  : "مقبولة + قيد المراجعة"}
              </p>
            </div>
            {/* 3 – المحادثات الفعلية */}
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-4">
              <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mb-1">المحادثات</p>
              <p className="text-4xl font-black text-purple-700 dark:text-purple-300">
                <Num v={sysStats.threads} />
              </p>
              <p className="text-[10px] text-purple-400 mt-1">محادثة في النظام</p>
            </div>
            {/* 4 – البلاغات الفعلية */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">البلاغات</p>
              <p className="text-4xl font-black text-amber-700 dark:text-amber-300">
                <Num v={sysStats.reports} />
              </p>
              <p className="text-[10px] text-amber-400 mt-1">بلاغ مقدّم</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs – عدد سجلات العمليات لكل نوع */}
        <div className="flex gap-2 border-b border-border dark:border-slate-700 mb-6 overflow-x-auto">
          {(
            [
              ["all",      `📋 الكل`,    logs.length],
              ["property", `🏠 عقارات`,  propertyLogsCount],
              ["message",  `💬 رسائل`,   messageLogsCount],
              ["report",   `⚠️ بلاغات`,  reportLogsCount],
            ] as const
          ).map(([tab, label, count]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-6 py-3 font-bold text-sm transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                {label}
                {(count as number) > 0 && (
                  <span className="text-xs font-black px-2 py-0.5 rounded-full text-white bg-slate-500">
                    {count}
                  </span>
                )}
              </span>
              {activeTab === tab && (
                <motion.div
                  layoutId="adminLogTab"
                  className="absolute bottom-0 inset-x-0 h-0.5 bg-accent"
                />
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="ابحث عن عملية أو أدمن أو نوع..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full ps-12 pe-4 py-3 rounded-2xl border border-border bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-14 h-14 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground font-bold">
                جارٍ تحميل السجلات...
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {filteredLogs.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-16 text-center border border-border">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-primary dark:text-white mb-2">
                    لا توجد سجلات
                  </h3>
                  <p className="text-muted-foreground">
                    لا توجد عمليات مسجلة في هذه الفئة
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredLogs.map((log) => (
                    <LogRow
                      key={log.id}
                      log={log}
                      onView={() => setSelectedLog(log)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ─── Log Row
function LogRow({ log, onView }: { log: any; onView: () => void }) {
  const actionInfo = ACTION_LABELS[log.action] || {
    ar: log.action,
    icon: FileText,
    color: "gray",
  };
  const Icon = actionInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="flex gap-3 p-3">
        <div className={`w-10 h-10 rounded-lg bg-${actionInfo.color}-100 dark:bg-${actionInfo.color}-900/20 flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 text-${actionInfo.color}-500`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-primary dark:text-white truncate">
                {actionInfo.ar}
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <User className="w-3 h-3" />
                <span>{log.admin_email}</span>
                <span>•</span>
                <span>{ENTITY_LABELS[log.entity_type] || log.entity_type}</span>
                <span>•</span>
                <Clock className="w-3 h-3" />
                <span>{timeAgo(log.created_at)}</span>
              </div>
            </div>
            <button
              onClick={onView}
              className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors shrink-0"
            >
              عرض
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}