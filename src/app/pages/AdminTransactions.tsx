import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  Handshake, Search, RefreshCw, CheckCircle, XCircle,
  Clock, User, MessageSquare, ChevronLeft, Filter,
  AlertTriangle, X, Check, Edit3, TrendingUp,
  Activity, Calendar, Home, ArrowRight
} from "lucide-react";
import AdminNavbar from "../components/AdminNavbar";
import { useApp, getValidToken } from "../context/AppContext";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b`;

type TxStatus = "pending" | "in_progress" | "completed" | "cancelled";

const STATUS_CONFIG: Record<TxStatus, {
  label: string; color: string; bg: string; border: string; icon: any;
}> = {
  pending: {
    label: "قيد الاستفسار",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-700",
    icon: Clock,
  },
  in_progress: {
    label: "جارٍ التفاوض",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-700",
    icon: TrendingUp,
  },
  completed: {
    label: "اكتملت الصفقة",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-700",
    icon: CheckCircle,
  },
  cancelled: {
    label: "ملغاة / متوقفة",
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-700",
    icon: XCircle,
  },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("ar-JO", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function timeAgo(dateStr: string): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "منذ لحظات";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  return `منذ ${Math.floor(hrs / 24)} يوم`;
}

// ─── Update Status Modal
function UpdateStatusModal({
  tx,
  onClose,
  onSave,
  loading,
}: {
  tx: any;
  onClose: () => void;
  onSave: (txId: string, status: TxStatus, note: string) => void;
  loading: boolean;
}) {
  const [status, setStatus] = useState<TxStatus>(tx.status || "pending");
  const [note, setNote] = useState(tx.adminNote || "");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black">تحديث حالة العملية</h3>
                <p className="text-emerald-100 text-xs truncate max-w-48">{tx.propertyTitle}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Participants Info */}
          <div className="bg-muted/40 rounded-2xl p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" />
              <span className="text-muted-foreground">المشتري / المستفسر:</span>
              <span className="font-bold">{tx.buyerName}</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-green-500" />
              <span className="text-muted-foreground">البائع / المالك:</span>
              <span className="font-bold">{tx.sellerName}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-500" />
              <span className="text-muted-foreground">عدد الرسائل:</span>
              <span className="font-bold">{tx.messageCount}</span>
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-3">حالة العملية:</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(STATUS_CONFIG) as [TxStatus, any][]).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setStatus(key)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-bold ${
                      status === key
                        ? `${cfg.bg} ${cfg.border} ${cfg.color} shadow-sm`
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Admin Note */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">ملاحظة الأدمن (اختياري):</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="أضف ملاحظة حول هذه العملية..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => onSave(tx.id, status, note)}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              حفظ الحالة
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-border hover:bg-muted transition-colors font-bold"
            >
              إلغاء
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════
export default function AdminTransactions() {
  const navigate = useNavigate();
  const { user, authReady } = useApp();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<TxStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const isAdmin = user?.email === "admin@baity.com";

  useEffect(() => {
    if (!authReady) return;
    if (!user) { navigate("/admin/login", { replace: true }); return; }
    if (user && !isAdmin) navigate("/", { replace: true });
  }, [user, isAdmin, authReady, navigate]);

  const getToken = getValidToken;

  const showNotif = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const adminHeaders = async () => {
    const token = await getToken();
    return {
      "Authorization": `Bearer ${publicAnonKey}`,
      "X-User-Token": token || "",
      "Content-Type": "application/json",
    };
  };

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = await adminHeaders();
      const res = await fetch(`${API}/admin/transactions`, { headers });
      const data = await res.json();
      if (data.success) setTransactions(data.data || []);
      else showNotif("تعذّر جلب العمليات", "error");
    } catch {
      showNotif("خطأ في الاتصال", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin && authReady) fetchTransactions();
  }, [isAdmin, authReady, fetchTransactions]);

  const handleUpdateStatus = async (txId: string, status: TxStatus, adminNote: string) => {
    setActionLoading(true);
    try {
      const headers = await adminHeaders();
      const encodedId = encodeURIComponent(txId);
      const res = await fetch(`${API}/admin/transactions/${encodedId}/status`, {
        method: "POST", headers,
        body: JSON.stringify({ status, adminNote }),
      });
      const data = await res.json();
      if (data.success) {
        showNotif("✅ تم تحديث حالة العملية");
        setSelectedTx(null);
        await fetchTransactions();
      } else showNotif(data.error || "حدث خطأ", "error");
    } catch {
      showNotif("تعذّر تحديث الحالة", "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (!authReady || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400">جارٍ التحقق...</p>
        </div>
      </div>
    );
  }
  if (!isAdmin) return null;

  // Stats
  const counts = {
    all: transactions.length,
    pending: transactions.filter((t) => t.status === "pending").length,
    in_progress: transactions.filter((t) => t.status === "in_progress").length,
    completed: transactions.filter((t) => t.status === "completed").length,
    cancelled: transactions.filter((t) => t.status === "cancelled").length,
  };

  // Filter + Search
  const filtered = transactions
    .filter((t) => filterStatus === "all" || t.status === filterStatus)
    .filter((t) =>
      (t.buyerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.sellerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.propertyTitle || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-950 dark:to-slate-900">
      <AdminNavbar />

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -80 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -80 }}
            className="fixed top-24 inset-x-0 z-[60] flex justify-center px-4"
          >
            <div className={`${notification.type === "success" ? "bg-green-500" : "bg-red-500"} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3`}>
              {notification.type === "success" ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              <span className="font-bold">{notification.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update Modal */}
      <AnimatePresence>
        {selectedTx && (
          <UpdateStatusModal
            tx={selectedTx}
            onClose={() => setSelectedTx(null)}
            onSave={handleUpdateStatus}
            loading={actionLoading}
          />
        )}
      </AnimatePresence>

      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate("/admin")}
              className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                <Handshake className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-primary dark:text-white">
                  متابعة عمليات البيع والشراء
                </h1>
                <p className="text-muted-foreground text-sm">لوحة تحكم الأدمن — بيتي</p>
              </div>
            </div>
            <button
              onClick={fetchTransactions}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-border rounded-xl hover:shadow-md transition-all text-sm font-bold"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              تحديث
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "قيد الاستفسار", count: counts.pending,     color: "amber" },
              { label: "جارٍ التفاوض",  count: counts.in_progress, color: "blue" },
              { label: "مكتملة",        count: counts.completed,   color: "emerald" },
              { label: "ملغاة",         count: counts.cancelled,   color: "red" },
            ].map((stat) => {
              const colorBg: Record<string, string> = {
                amber:   "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
                blue:    "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
                emerald: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
                red:     "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
              };
              const colorText: Record<string, string> = {
                amber: "text-amber-700 dark:text-amber-300", blue: "text-blue-700 dark:text-blue-300",
                emerald: "text-emerald-700 dark:text-emerald-300", red: "text-red-700 dark:text-red-300",
              };
              return (
                <div key={stat.label} className={`border rounded-2xl p-4 text-center ${colorBg[stat.color]}`}>
                  <p className={`text-4xl font-black ${colorText[stat.color]}`}>
                    {isLoading ? "—" : stat.count}
                  </p>
                  <p className={`text-xs font-bold mt-1 ${colorText[stat.color]}`}>{stat.label}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-blue-800 dark:text-blue-200 text-sm mb-1">ما هي عمليات البيع والشراء؟</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              كل استفسار بين مشترٍ ومالك عقار يُسجَّل هنا. يمكنك رصد حالة التفاوض، التدخل عند وجود مشاكل، وتحديث الحالة يدوياً.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="ابحث عن مشترٍ أو بائع أو عقار..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full ps-12 pe-4 py-3 rounded-2xl border border-border bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-border rounded-2xl px-3 py-2 shadow-sm">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-transparent text-sm font-bold focus:outline-none text-foreground"
            >
              <option value="all">كل الحالات ({counts.all})</option>
              <option value="pending">قيد الاستفسار ({counts.pending})</option>
              <option value="in_progress">جارٍ التفاوض ({counts.in_progress})</option>
              <option value="completed">مكتملة ({counts.completed})</option>
              <option value="cancelled">ملغاة ({counts.cancelled})</option>
            </select>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-14 h-14 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground font-bold">جارٍ تحميل العمليات...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-16 text-center border border-border">
            <Handshake className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-primary dark:text-white mb-2">
              {searchTerm || filterStatus !== "all" ? "لا توجد نتائج مطابقة" : "لا توجد عمليات بعد"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {searchTerm || filterStatus !== "all"
                ? "جرّب تعديل معايير البحث"
                : "ستظهر هنا تلقائياً عند بدء المستخدمين بالتفاوض على العقارات"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((tx, i) => (
              <TransactionCard
                key={tx.id}
                tx={tx}
                index={i}
                onUpdate={() => setSelectedTx(tx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Transaction Card
function TransactionCard({
  tx, index, onUpdate,
}: {
  tx: any; index: number; onUpdate: () => void;
}) {
  const cfg = STATUS_CONFIG[tx.status as TxStatus] || STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index }}
      className={`bg-white dark:bg-slate-800 rounded-2xl border ${cfg.border} shadow-sm hover:shadow-md transition-shadow overflow-hidden`}
    >
      {/* Status bar at top */}
      <div className={`h-1 w-full ${
        tx.status === "completed" ? "bg-emerald-400" :
        tx.status === "in_progress" ? "bg-blue-400" :
        tx.status === "cancelled" ? "bg-red-400" : "bg-amber-400"
      }`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Property image or icon */}
            {tx.propertyImage ? (
              <img
                src={tx.propertyImage}
                alt={tx.propertyTitle}
                className="w-14 h-14 rounded-xl object-cover shrink-0"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Home className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-black text-primary dark:text-white truncate">{tx.propertyTitle}</h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-blue-500" />
                  <span className="font-bold">{tx.buyerName}</span>
                  <span className="text-xs">(مشترٍ)</span>
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-green-500" />
                  <span className="font-bold">{tx.sellerName}</span>
                  <span className="text-xs">(بائع)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 ${cfg.bg} ${cfg.border} ${cfg.color}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {cfg.label}
          </div>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {tx.messageCount} رسالة
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            آخر نشاط: {timeAgo(tx.lastActivity)}
          </span>
          {tx.updatedAt && (
            <span className="flex items-center gap-1 text-accent">
              <Activity className="w-3 h-3" />
              آخر تحديث: {timeAgo(tx.updatedAt)}
            </span>
          )}
        </div>

        {/* Admin Note */}
        {tx.adminNote && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 mb-3">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300">ملاحظة الأدمن:</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{tx.adminNote}</p>
          </div>
        )}

        {/* Actions */}
        <button
          onClick={onUpdate}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md"
        >
          <Edit3 className="w-3.5 h-3.5" />
          تحديث الحالة / إضافة ملاحظة
        </button>
      </div>
    </motion.div>
  );
}