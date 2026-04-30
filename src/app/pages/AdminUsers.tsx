import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  Users, Search, RefreshCw, CheckCircle, XCircle,
  Trash2, User, Mail, Calendar, Shield, AlertTriangle, AlertCircle,
  Home, MessageSquare, Eye, Ban, ChevronRight, X, Filter,
} from "lucide-react";
import AdminNavbar from "../components/AdminNavbar";
import { useApp, getValidToken } from "../context/AppContext";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b`;

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

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteConfirmModal({
  user: targetUser,
  onClose,
  onConfirm,
  loading,
}: {
  user: any;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg">تأكيد الحذف</h3>
              <p className="text-red-100 text-sm">هذا الإجراء لا يمكن التراجع عنه</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* User Info */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center text-white font-black">
                {(targetUser.name || targetUser.email || "م").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-black text-primary dark:text-white">{targetUser.name || "—"}</p>
                <p className="text-sm text-muted-foreground">{targetUser.email}</p>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-2">
            <p className="font-bold text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              سيتم حذف ما يلي بشكل نهائي:
            </p>
            <ul className="space-y-1.5 text-sm text-amber-700 dark:text-amber-300">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                حساب المستخدم وبياناته الشخصية
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                جميع العقارات المرتبطة بهذا الحساب
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                جميع الرسائل والمحادثات
              </li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-border hover:bg-muted transition-colors font-bold text-primary dark:text-white"
            >
              إلغاء
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl font-bold transition-colors"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              حذف نهائي
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── User Detail Modal ─────────────────────────────────────────────────────
function UserDetailModal({
  user: targetUser,
  onClose,
  onDelete,
}: {
  user: any;
  onClose: () => void;
  onDelete: (u: any) => void;
}) {
  const properties = targetUser.properties || [];
  const hasProperties = properties.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full my-4 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-xl">
                {(targetUser.name || targetUser.email || "م").charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-black text-lg">{targetUser.name || "—"}</h3>
                <p className="text-slate-400 text-sm">{targetUser.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-black px-3 py-1 rounded-full ${
              targetUser.email === "admin@baity.com"
                ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                : "bg-green-400/20 text-green-300 border border-green-400/30"
            }`}>
              {targetUser.email === "admin@baity.com" ? "🛡️ أدمن" : "👤 مستخدم"}
            </span>
            <span className="text-slate-400 text-xs">
              تسجيل: {formatDate(targetUser.created_at || targetUser.createdAt)}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{targetUser.propertiesCount || 0}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">عقار</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-green-700 dark:text-green-300">{targetUser.messagesCount || 0}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">رسالة</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-amber-700 dark:text-amber-300">
                {targetUser.last_sign_in_at ? timeAgo(targetUser.last_sign_in_at) : "—"}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">آخر نشاط</p>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                <p className="font-bold text-sm text-primary dark:text-white">{targetUser.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">تاريخ التسجيل</p>
                <p className="font-bold text-sm text-primary dark:text-white">
                  {formatDate(targetUser.created_at || targetUser.createdAt)}
                </p>
              </div>
            </div>
            {targetUser.phone && (
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                  <p className="font-bold text-sm text-primary dark:text-white" dir="ltr">{targetUser.phone}</p>
                </div>
              </div>
            )}
          </div>

          {/* ✅ Properties List - Real data from database */}
          {hasProperties ? (
            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Home className="w-5 h-5 text-blue-600" />
                <h4 className="font-black text-primary dark:text-white">
                  عقارات المستخدم ({properties.length})
                </h4>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {properties.map((prop: any) => (
                  <div
                    key={prop.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-border hover:shadow-sm transition-shadow"
                  >
                    {prop.image && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-700">
                        <img
                          src={prop.image}
                          alt={prop.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-primary dark:text-white truncate">
                        {prop.title || "عقار بدون عنوان"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                          {prop.governorate || "—"}
                        </span>
                        <span>•</span>
                        <span className={`font-bold ${
                          prop.status === "approved"
                            ? "text-green-600 dark:text-green-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}>
                          {prop.status === "approved" ? "معتمد" : "قيد المراجعة"}
                        </span>
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <p className="font-black text-sm text-blue-600 dark:text-blue-400">
                        {prop.price ? `${prop.price.toLocaleString()} د.أ` : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {prop.operationType === "sale" ? "للبيع" : "للإيجار"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border-t border-border pt-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 text-center">
                <Home className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">لا توجد عقارات مسجلة لهذا المستخدم</p>
              </div>
            </div>
          )}

          {/* Actions */}
          {targetUser.email !== "admin@baity.com" && (
            <button
              onClick={() => { onClose(); onDelete(targetUser); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              حذف المستخدم وجميع بياناته
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════
export default function AdminUsers() {
  const navigate = useNavigate();
  const { user, authReady } = useApp();

  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const isAdmin = user?.email === "admin@baity.com";

  useEffect(() => {
    if (!authReady) return;
    if (!user) { navigate("/admin/login", { replace: true }); return; }
    if (!isAdmin) navigate("/", { replace: true });
  }, [user, isAdmin, authReady, navigate]);

  const showNotif = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchUsers = useCallback(async () => {
    console.log("🔄 [AdminUsers] Starting fetchUsers...");
    setIsLoading(true);
    setLoadError(null);
    try {
      const token = await getValidToken();
      if (!token) {
        console.error("❌ [AdminUsers] No token available");
        setLoadError("فشل الحصول على رمز المصادقة");
        setUsers([]);
        setIsLoading(false);
        return;
      }

      console.log("✅ [AdminUsers] Got token, making request...");

      const headers = {
        Authorization: `Bearer ${publicAnonKey}`,
        "X-User-Token": token,
        "Content-Type": "application/json",
      };

      // Add cache-busting timestamp to ensure fresh data
      const timestamp = Date.now();

      // ✅ Fetch users with full statistics from improved endpoint
      const response = await fetch(`${API}/admin/users?_t=${timestamp}`, { headers });

      console.log(`📡 [AdminUsers] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [AdminUsers] Response not OK:", errorText);
        throw new Error(`فشل جلب المستخدمين (${response.status})`);
      }

      const data = await response.json();
      console.log("📦 [AdminUsers] Response data:", {
        success: data.success,
        dataLength: data.data?.length,
        firstUser: data.data?.[0]
      });

      if (data.success && Array.isArray(data.data)) {
        // ✅ Data now comes with full statistics from server
        const usersList = data.data.map((u: any) => ({
          id: u.id,
          name: u.name || u.email?.split('@')[0] || "—",
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          phone: u.phone,
          // ✅ Real statistics from database (calculated server-side)
          propertiesCount: u.propertiesCount || 0,
          messagesCount: u.messagesCount || 0,
          properties: u.properties || [], // ✅ Full list of user's properties
        }));

        console.log(`✅ [AdminUsers] Successfully loaded ${usersList.length} users`);
        setUsers(usersList);
        setLoadError(null);
      } else {
        console.error("❌ [AdminUsers] Invalid response format:", data);
        throw new Error(data.error || "فشل تحميل البيانات");
      }
    } catch (e: any) {
      const errorMsg = e.message || "حدث خطأ أثناء جلب البيانات";
      console.error("❌ [AdminUsers] fetchUsers error:", e);
      setLoadError(errorMsg);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  // Refresh users when page becomes visible (e.g., navigating back from another page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAdmin) {
        fetchUsers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAdmin, fetchUsers]);

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const token = await getValidToken();
      if (!token) { setActionLoading(false); return; }

      const headers = {
        Authorization: `Bearer ${publicAnonKey}`,
        "X-User-Token": token,
        "Content-Type": "application/json",
      };

      const res = await fetch(`${API}/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();

      if (data.success) {
        setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
        const deletedInfo = data.deletedData
          ? ` (${data.deletedData.properties || 0} عقار، ${data.deletedData.threads || 0} محادثة، ${data.deletedData.reports || 0} بلاغ)`
          : "";
        showNotif(`تم حذف المستخدم "${deleteTarget.name || deleteTarget.email}" وجميع بياناته بنجاح${deletedInfo}`);
        setDeleteTarget(null);
      } else {
        showNotif(data.error || "تعذّر حذف المستخدم", "error");
      }
    } catch (e) {
      console.error("deleteUser error:", e);
      showNotif("حدث خطأ أثناء الحذف", "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400">جارٍ التحقق...</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").includes(q)
    );
  });

  const regularUsers = filteredUsers.filter(u => u.email !== "admin@baity.com");
  const adminUsers = filteredUsers.filter(u => u.email === "admin@baity.com");

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
            <div className={`${notification.type === "success" ? "bg-green-500" : "bg-red-500"} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-lg`}>
              {notification.type === "success"
                ? <CheckCircle className="w-6 h-6 shrink-0" />
                : <XCircle className="w-6 h-6 shrink-0" />}
              <span className="font-bold">{notification.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <UserDetailModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onDelete={u => setDeleteTarget(u)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirmModal
            user={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDeleteUser}
            loading={actionLoading}
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
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-primary dark:text-white">
                  إدارة المستخدمين
                </h1>
                <p className="text-muted-foreground">
                  التحكم الكامل بحسابات مستخدمي منصة بيتي
                </p>
              </div>
            </div>
            <button
              onClick={fetchUsers}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-border rounded-xl hover:shadow-md transition-all text-sm font-bold"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              تحديث
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-muted-foreground">إجمالي المستخدمين</p>
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
              {isLoading ? (
                <div className="w-8 h-8 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <p className="text-4xl font-black text-primary dark:text-white">{users.length}</p>
              )}
            </div>
            <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-violet-600">مستخدمون عاديون</p>
                <User className="w-4 h-4 text-violet-600" />
              </div>
              {isLoading ? (
                <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <p className="text-4xl font-black text-violet-700 dark:text-violet-300">
                  {users.filter(u => u.email !== "admin@baity.com").length}
                </p>
              )}
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-amber-600">مسؤولون</p>
                <Shield className="w-4 h-4 text-amber-600" />
              </div>
              {isLoading ? (
                <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <p className="text-4xl font-black text-amber-700 dark:text-amber-300">
                  {users.filter(u => u.email === "admin@baity.com").length}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث باسم المستخدم، البريد الإلكتروني، أو رقم الهاتف..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full ps-12 pe-12 py-3 rounded-2xl border border-border bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-sm transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute top-1/2 -translate-y-1/2 end-4 p-1.5 rounded-lg hover:bg-muted transition-colors"
              title="مسح البحث"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Search results indicator */}
        {searchTerm && (
          <div className="mb-4 text-sm text-muted-foreground">
            {filteredUsers.length > 0 ? (
              <span>تم العثور على <span className="font-bold text-violet-600 dark:text-violet-400">{filteredUsers.length}</span> نتيجة</span>
            ) : (
              <span className="text-red-600 dark:text-red-400">لا توجد نتائج للبحث "{searchTerm}"</span>
            )}
          </div>
        )}

        {/* Warning Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 mb-6 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <span className="font-black">تحذير:</span> ح��ف المستخدم يؤدي إلى حذف جميع بياناته بشكل نهائي (العقارات، الرسائل، المفضلة). هذا الإجراء لا يمكن التراجع عنه.
          </p>
        </motion.div>

        {/* Error State */}
        {loadError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 mb-6"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-red-900 dark:text-red-200 mb-1">
                  خطأ في تحميل البيانات
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                  {loadError}
                </p>
                <button
                  onClick={fetchUsers}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  إعادة المحاولة
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-14 h-14 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground font-bold">جارٍ تحميل المستخدمين...</p>
            </div>
          </div>
        ) : !loadError && filteredUsers.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-16 text-center border border-border">
            <div className="w-20 h-20 bg-violet-50 dark:bg-violet-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-violet-500" />
            </div>
            <h3 className="text-xl font-bold text-primary dark:text-white mb-2">
              {searchTerm ? "لا توجد نتائج" : "لا يوجد مستخدمون"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? `لم يتم العثور على مستخدمين بكلمة البحث "${searchTerm}"`
                : "لا يوجد مستخدمون مسجلون في المنصة حالياً"}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-bold transition-colors"
              >
                <X className="w-4 h-4" />
                مسح البحث
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Total count indicator */}
            {!searchTerm && users.length > 0 && (
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 border border-border rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-50 dark:bg-violet-900/20 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-violet-500" />
                  </div>
                  <div>
                    <p className="font-bold text-primary dark:text-white">
                      عرض جميع المستخدمين
                    </p>
                    <p className="text-sm text-muted-foreground">
                      إجمالي {users.length} مستخدم مسجل • مرتبة من الأحدث للأقدم
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Users */}
            {adminUsers.length > 0 && (
              <div>
                <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" /> المسؤولون
                </h2>
                <div className="grid gap-3">
                  {adminUsers.map(u => (
                    <UserRow
                      key={u.id}
                      user={u}
                      onView={() => setSelectedUser(u)}
                      onDelete={() => setDeleteTarget(u)}
                      isAdmin={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Regular Users */}
            {regularUsers.length > 0 && (
              <div>
                <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-violet-500" /> المستخدمون ({regularUsers.length})
                </h2>
                <div className="grid gap-3">
                  <AnimatePresence>
                    {regularUsers.map(u => (
                      <UserRow
                        key={u.id}
                        user={u}
                        onView={() => setSelectedUser(u)}
                        onDelete={() => setDeleteTarget(u)}
                        isAdmin={false}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── User Row ─────────────────────────────────────────────────────────────────
function UserRow({
  user: u,
  onView,
  onDelete,
  isAdmin: isAdminUser,
}: {
  user: any;
  onView: () => void;
  onDelete: () => void;
  isAdmin: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={`bg-white dark:bg-slate-800 rounded-2xl border overflow-hidden hover:shadow-md transition-all ${
        isAdminUser
          ? "border-amber-200 dark:border-amber-700"
          : "border-border dark:border-slate-700"
      }`}
    >
      <div className="flex items-center gap-4 p-4">
        {/* Avatar */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-black text-white text-lg ${
          isAdminUser
            ? "bg-gradient-to-br from-amber-400 to-orange-500"
            : "bg-gradient-to-br from-violet-500 to-purple-600"
        }`}>
          {(u.name || u.email || "م").charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-primary dark:text-white truncate">{u.name || "—"}</h3>
            {isAdminUser && (
              <span className="text-[10px] font-black bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full shrink-0">
                🛡️ أدمن
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" /> {u.email}
            </span>
            {u.created_at && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {timeAgo(u.created_at)}
                </span>
              </>
            )}
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Home className="w-3 h-3" />
                <span className={u.propertiesCount > 0 ? "text-blue-600 dark:text-blue-400 font-bold" : ""}>
                  {u.propertiesCount || 0}
                </span>
                {" عقار"}
              </span>
            </>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onView}
            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" /> عرض
          </button>
          {!isAdminUser && (
            <button
              onClick={onDelete}
              className="px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-500 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> حذف
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}