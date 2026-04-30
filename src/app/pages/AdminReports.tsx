import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  AlertTriangle, Eye, Check, X, Clock, MapPin, User,
  Shield, Search, CheckCircle, XCircle, RefreshCw,
  Flag, MessageSquare, Trash2, EyeOff, FileText
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
  return `منذ ${days} يوم`;
}

// ─── Report Detail Modal
function ReportDetailModal({
  report,
  onClose,
  onAction,
  loading,
}: {
  report: any;
  onClose: () => void;
  onAction: (reportId: string, action: string, notes: string) => void;
  loading: boolean;
}) {
  const [selectedAction, setSelectedAction] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [showActionForm, setShowActionForm] = useState(false);

  const actions = [
    { value: "delete_property", label: "❌ حذف العقار", color: "red" },
    { value: "hide_property", label: "🚫 إخفاء العقار", color: "orange" },
    { value: "warn_user", label: "⚠️ تحذير المستخدم", color: "yellow" },
    { value: "dismiss", label: "✅ تجاهل البلاغ", color: "green" },
  ];

  const handleSubmit = () => {
    if (!selectedAction) {
      alert("يرجى اختيار إجراء");
      return;
    }
    onAction(report.id, selectedAction, adminNotes);
  };

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
        <div className="flex items-center justify-between p-6 border-b border-border dark:border-slate-700 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
          <div>
            <h3 className="text-xl font-bold text-primary dark:text-white flex items-center gap-2">
              <Flag className="w-6 h-6 text-red-500" />
              تفاصيل البلاغ
            </h3>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full mt-1 inline-block ${
                report.status === "pending"
                  ? "bg-amber-100 text-amber-700"
                  : report.status === "reviewed"
                  ? "bg-blue-100 text-blue-700"
                  : report.status === "action_taken"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {report.status === "pending"
                ? "⏳ قيد المراجعة"
                : report.status === "reviewed"
                ? "👁️ تمت المراجعة"
                : report.status === "action_taken"
                ? "✅ تم اتخاذ إجراء"
                : "❌ مُهمل"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Report Info */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-xs font-bold text-red-800 dark:text-red-200 mb-1">
                سبب البلاغ:
              </p>
              <p className="font-bold text-red-700 dark:text-red-300">
                {report.reason}
              </p>
            </div>

            {report.description && (
              <div>
                <p className="text-xs font-bold text-red-800 dark:text-red-200 mb-1">
                  تفاصيل إضافية:
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {report.description}
                </p>
              </div>
            )}
          </div>

          {/* Reporter Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-blue-800 dark:text-blue-200 mb-2">
              معلومات المُبلِّغ:
            </p>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" />
              <span className="font-bold">{report.reporter_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm">{formatDate(report.created_at)}</span>
            </div>
          </div>

          {/* Property Info */}
          {report.property && (
            <div className="bg-muted/40 rounded-xl p-4">
              <p className="text-xs font-bold text-muted-foreground mb-3">
                العقار المُبلَّغ عنه:
              </p>
              <div className="space-y-2">
                <p className="font-bold text-primary dark:text-white">
                  {report.property.title}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{report.property.governorate}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span>صاحب العقار: {report.property.ownerName}</span>
                </div>
              </div>
            </div>
          )}

          {/* Admin Action History */}
          {report.status !== "pending" && report.admin_action && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <p className="text-xs font-bold text-green-800 dark:text-green-200 mb-2">
                الإجراء المتخذ:
              </p>
              <p className="text-sm font-bold text-green-700 dark:text-green-300 mb-2">
                {report.admin_action === "delete_property"
                  ? "❌ تم حذف العقار"
                  : report.admin_action === "hide_property"
                  ? "🚫 تم إخفاء العقار"
                  : report.admin_action === "warn_user"
                  ? "⚠️ تم تحذير المستخدم"
                  : "✅ تم تجاهل البلاغ"}
              </p>
              {report.admin_notes && (
                <div>
                  <p className="text-xs font-bold text-green-800 dark:text-green-200 mb-1">
                    ملاحظات الأدمن:
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {report.admin_notes}
                  </p>
                </div>
              )}
              {report.reviewed_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  تم المراجعة: {formatDate(report.reviewed_at)}
                </p>
              )}
            </div>
          )}

          {/* Action Form */}
          {report.status === "pending" && (
            <div className="space-y-3 pt-2">
              {!showActionForm ? (
                <button
                  onClick={() => setShowActionForm(true)}
                  className="w-full bg-accent hover:bg-accent/90 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Shield className="w-5 h-5" />
                  اتخاذ إجراء على البلاغ
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                      ⚠️ اختر الإجراء المناسب
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-bold text-muted-foreground">
                      اختر إجراءاً:
                    </p>
                    <div className="grid gap-2">
                      {actions.map((action) => (
                        <button
                          key={action.value}
                          onClick={() => setSelectedAction(action.value)}
                          className={`text-start px-4 py-3 rounded-xl border transition-all text-sm ${
                            selectedAction === action.value
                              ? `border-${action.color}-500 bg-${action.color}-50 dark:bg-${action.color}-900/20 font-bold`
                              : "border-border hover:bg-muted"
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-bold text-muted-foreground">
                      ملاحظات إضافية (اختياري):
                    </p>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="أضف ملاحظاتك حول القرار المتخذ..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSubmit}
                      disabled={loading || !selectedAction}
                      className="flex-1 bg-accent hover:bg-accent/90 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      تنفيذ الإجراء
                    </button>
                    <button
                      onClick={() => {
                        setShowActionForm(false);
                        setSelectedAction("");
                        setAdminNotes("");
                      }}
                      className="px-4 py-3 rounded-xl border border-border hover:bg-muted transition-colors text-sm"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
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

export default function AdminReports() {
  const navigate = useNavigate();
  const { user } = useApp();

  const [reports, setReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<
    "pending" | "reviewed" | "action_taken" | "dismissed"
  >("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [notification, setNotification] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const isAdmin = user?.email === "admin@baity.com";

  useEffect(() => {
    if (!user) {
      navigate("/admin/login", { replace: true });
      return;
    }
    if (user && !isAdmin) {
      navigate("/", { replace: true });
    }
  }, [user, isAdmin, navigate]);

  const getAdminToken = getValidToken;

  const showNotif = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getAdminToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const headers = {
        Authorization: `Bearer ${publicAnonKey}`,
        "X-User-Token": token,
        "Content-Type": "application/json",
      };

      const res = await fetch(`${API}/admin/reports`, { headers });
      const data = await res.json();

      if (data.success) {
        const reportsList = data.data || [];
        setReports(reportsList);

        // فحص تلقائي للعقارات التي حصلت على بلاغات كثيرة
        await checkHighlyReportedProperties(reportsList, token);
      }
    } catch (e) {
      console.error("fetchReports error:", e);
      showNotif("تعذّر جلب البلاغات، يرجى المحاولة مجدداً", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchReports();
  }, [isAdmin, fetchReports]);

  const handleReportAction = async (
    reportId: string,
    action: string,
    notes: string
  ) => {
    setActionLoading(true);
    try {
      const token = await getAdminToken();
      if (!token) return;

      const res = await fetch(`${API}/admin/reports/${reportId}/action`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "X-User-Token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, notes }),
      });

      const data = await res.json();
      if (data.success) {
        showNotif("✅ تم تنفيذ الإجراء بنجاح", "success");

        // إرسال إشعار لصاحب العقار
        await sendPropertyOwnerNotification(selectedReport, action, notes, token);

        setSelectedReport(null);
        await fetchReports();
      } else {
        showNotif(data.error || "حدث خطأ", "error");
      }
    } catch (e) {
      console.error("handleReportAction error:", e);
      showNotif("تعذّر تنفيذ الإجراء", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // فحص العقارات التي حصلت على بلاغات كثيرة واتخاذ إجراء تلقائي
  const checkHighlyReportedProperties = async (
    reportsList: any[],
    token: string
  ) => {
    try {
      // تجميع البلاغات حسب العقار
      const reportsByProperty: Record<string, any[]> = {};

      reportsList.forEach((report: any) => {
        if (report.status === "pending" && report.propertyId) {
          if (!reportsByProperty[report.propertyId]) {
            reportsByProperty[report.propertyId] = [];
          }
          reportsByProperty[report.propertyId].push(report);
        }
      });

      // فحص كل عقار
      for (const [propertyId, propertyReports] of Object.entries(reportsByProperty)) {
        // احتساب عدد المستخدمين المختلفين الذين أبلغوا عن العقار
        const uniqueReporters = new Set(
          propertyReports.map((r: any) => r.reporter_id)
        ).size;

        console.log(`📊 العقار ${propertyId}: ${uniqueReporters} مبلغ مختلف`);

        // تحذير عند 10 بلاغات
        if (uniqueReporters === 10) {
          await sendWarningToPropertyOwner(propertyReports[0], token);
        }

        // حذف تلقائي عند أكثر من 10 بلاغات
        if (uniqueReporters > 10) {
          await autoDeleteProperty(propertyReports[0], uniqueReporters, token, reportsList);
        }
      }
    } catch (e) {
      console.error("checkHighlyReportedProperties error:", e);
    }
  };

  // إرسال تحذير لصاحب العقار عند وصول البلاغات إلى 10
  const sendWarningToPropertyOwner = async (
    report: any,
    token: string
  ) => {
    try {
      const propertiesRes = await fetch(`${API}/admin/properties`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "X-User-Token": token,
          "Content-Type": "application/json",
        },
      });

      const propertiesData = await propertiesRes.json();
      if (!propertiesData.success || !Array.isArray(propertiesData.data)) {
        return;
      }

      const property = propertiesData.data.find((p: any) => p.id === report.propertyId);
      if (!property || !property.userId) return;

      const propertyTitle = report.property?.title || property.title || "العقار";
      const messageText = `⚠️ *تحذير هام - بلاغات كثيرة على عقارك*\n\nعقارك "${propertyTitle}" وصل إلى 10 بلاغات من مستخدمين مختلفين.\n\n⚠️ *تنبيه:* إذا وصلت البلاغات إلى أكثر من 10، سيتم حذف العقار تلقائياً.\n\nيرجى مراجعة محتوى العقار والتأكد من دقة المعلومات.\n\nللاستفسار، يمكنك الرد على هذه الرسالة.`;

      await fetch(`${API}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "X-User-Token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: messageText,
          propertyId: report.propertyId,
          ownerId: property.userId,
        }),
      });

      console.log(`⚠️ تم إرسال تحذير لصاحب العقار ${propertyTitle}`);
    } catch (e) {
      console.error("sendWarningToPropertyOwner error:", e);
    }
  };

  // حذف العقار تلقائياً عند تجاوز 10 بلاغات
  const autoDeleteProperty = async (
    report: any,
    reportCount: number,
    token: string,
    allReports: any[]
  ) => {
    try {
      const propertiesRes = await fetch(`${API}/admin/properties`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "X-User-Token": token,
          "Content-Type": "application/json",
        },
      });

      const propertiesData = await propertiesRes.json();
      if (!propertiesData.success || !Array.isArray(propertiesData.data)) {
        return;
      }

      const property = propertiesData.data.find((p: any) => p.id === report.propertyId);
      if (!property || !property.userId) return;

      const propertyTitle = report.property?.title || property.title || "العقار";

      // حذف العقار
      const deleteRes = await fetch(`${API}/admin/properties/${report.propertyId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "X-User-Token": token,
          "Content-Type": "application/json",
        },
      });

      const deleteData = await deleteRes.json();
      if (deleteData.success) {
        // إرسال رسالة للمالك توضح ما حدث
        const messageText = `🔴 *حذف تلقائي - عدد كبير من البلاغات*\n\nتم حذف عقارك "${propertyTitle}" تلقائياً بسبب تلقي ${reportCount} بلاغ من مستخدمين مختلفين.\n\n*سبب الحذف التلقائي:*\nتجاوز العقار الحد المسموح به من البلاغات (أكثر من 10 بلاغات من حسابات مختلفة).\n\n*للاستفسار:*\nيرجى الرد على هذه الرسالة للتواصل مع فريق الإدارة.\n\nنأسف للإزعاج ونتمنى الالتزام بمعايير المنصة في المستقبل.`;

        await fetch(`${API}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "X-User-Token": token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: messageText,
            propertyId: report.propertyId,
            ownerId: property.userId,
          }),
        });

        console.log(`🔴 تم حذف العقار "${propertyTitle}" تلقائياً (${reportCount} بلاغ)`);
        showNotif(`تم حذف العقار "${propertyTitle}" تلقائياً بسبب كثرة البلاغات`, "success");

        // تحديث حالة جميع البلاغات الخاصة بهذا العقار
        for (const r of allReports.filter((rep: any) => rep.propertyId === report.propertyId)) {
          await fetch(`${API}/admin/reports/${r.id}/action`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              "X-User-Token": token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "delete_property",
              notes: `تم الحذف تلقائياً - ${reportCount} بلاغ من مستخدمين مختلفين`,
            }),
          });
        }
      }
    } catch (e) {
      console.error("autoDeleteProperty error:", e);
    }
  };

  // إرسال رسالة لصاحب العقار عند اتخاذ إجراء على البلاغ
  const sendPropertyOwnerNotification = async (
    report: any,
    action: string,
    notes: string,
    token: string
  ) => {
    if (!report?.propertyId) {
      console.error("❌ معرف العقار غير متوفر");
      return;
    }

    try {
      // الحصول على جميع العقارات من admin endpoint (يشمل كل الحالات)
      const propertiesRes = await fetch(`${API}/admin/properties`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "X-User-Token": token,
          "Content-Type": "application/json",
        },
      });

      const propertiesData = await propertiesRes.json();
      if (!propertiesData.success || !Array.isArray(propertiesData.data)) {
        console.error("❌ فشل الحصول على قائمة العقارات:", propertiesData);
        return;
      }

      // البحث عن العقار المحدد
      const property = propertiesData.data.find((p: any) => p.id === report.propertyId);

      if (!property || !property.userId) {
        console.error("❌ لم يتم العثور على العقار أو معلومات المالك:", {
          propertyId: report.propertyId,
          foundProperty: !!property,
          hasUserId: property?.userId,
        });
        return;
      }

      const propertyTitle = report.property?.title || property.title || "العقار";
      const ownerId = property.userId;

      console.log("📤 جاهز لإرسال رسالة:", {
        propertyId: report.propertyId,
        ownerId,
        propertyTitle,
        action,
      });

      const actionMessages: Record<string, string> = {
        delete_property: `🔴 *إجراء إداري - حذف عقار*\n\nتم حذف عقارك "${propertyTitle}" بسبب بلاغ من أحد المستخدمين.\n\n*السبب:* ${report.reason}${notes ? `\n\n*ملاحظات الإدارة:* ${notes}` : ""}\n\nإذا كان لديك أي استفسار، يمكنك الرد على هذه الرسالة.`,
        hide_property: `🚫 *إجراء إداري - إخفاء عقار*\n\nتم إخفاء عقارك "${propertyTitle}" مؤقتاً بسبب بلاغ من أحد المستخدمين.\n\n*السبب:* ${report.reason}${notes ? `\n\n*ملاحظات:* ${notes}` : ""}\n\nيرجى مراجعة محتوى العقار والرد على هذه الرسالة لإعادة تفعيله.`,
        warn_user: `⚠️ *تحذير إداري*\n\nتم تلقي بلاغ عن عقارك "${propertyTitle}".\n\n*السبب:* ${report.reason}${notes ? `\n\n*ملاحظات:* ${notes}` : ""}\n\nيرجى مراجعة محتوى العقار والتأكد من دقة المعلومات. في حال تكرار البلاغات، قد يتم اتخاذ إجراءات إضافية.`,
        dismiss: `✅ *إشعار إداري*\n\nتم رفض البلاغ المقدم ضد عقارك "${propertyTitle}". عقارك آمن ولا يوجد أي مشكلة.${notes ? `\n\n*ملاحظة:* ${notes}` : ""}\n\nشكراً لالتزامك بمعايير المنصة.`,
      };

      const messageText = actionMessages[action] ||
        `📢 *إشعار إداري*\n\nتم اتخاذ إجراء بخصوص عقارك "${propertyTitle}".\n\nللاستفسار، يرجى الرد على هذه الرسالة.`;

      // إرسال رسالة عبر نظام الرسائل الموجود
      const response = await fetch(`${API}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "X-User-Token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: messageText,
          propertyId: report.propertyId,
          ownerId: ownerId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log("✅ تم إرسال رسالة لصاحب العقار بنجاح");
        console.log("📊 تفاصيل الإرسال:", {
          threadId: result.data?.threadId,
          timestamp: result.data?.lastUpdated,
        });
        // إظهار رسالة نجاح للأدمن
        showNotif("✅ تم إرسال رسالة لصاحب العقار", "success");
      } else {
        console.error("❌ فشل إرسال الرسالة:", result);
        console.error("📋 البيانات المرسلة:", {
          propertyId: report.propertyId,
          ownerId,
          textLength: messageText.length,
        });
      }
    } catch (e) {
      console.error("❌ خطأ في sendPropertyOwnerNotification:", e);
    }
  };

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

  const filteredReports = reports.filter(
    (r) =>
      r.status === activeTab &&
      ((r.reason || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.reporter_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.property?.title || "").toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const reviewedCount = reports.filter((r) => r.status === "reviewed").length;
  const actionTakenCount = reports.filter(
    (r) => r.status === "action_taken"
  ).length;
  const dismissedCount = reports.filter((r) => r.status === "dismissed").length;

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
        {selectedReport && (
          <ReportDetailModal
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            onAction={handleReportAction}
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
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Flag className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-primary dark:text-white">
                  البلاغات
                </h1>
                <p className="text-muted-foreground">
                  إدارة بلاغات المستخدمين — بيتي
                </p>
              </div>
            </div>
            <button
              onClick={fetchReports}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-border rounded-xl hover:shadow-md transition-all text-sm font-bold"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              تحديث
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
              <p className="text-xs font-bold text-red-600 mb-1">
                قيد المراجعة
              </p>
              <p className="text-4xl font-black text-red-700">{pendingCount}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
              <p className="text-xs font-bold text-blue-600 mb-1">
                تمت المراجعة
              </p>
              <p className="text-4xl font-black text-blue-700">
                {reviewedCount}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4">
              <p className="text-xs font-bold text-green-600 mb-1">
                تم اتخاذ إجراء
              </p>
              <p className="text-4xl font-black text-green-700">
                {actionTakenCount}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-600 mb-1">مُهمل</p>
              <p className="text-4xl font-black text-gray-700">
                {dismissedCount}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border dark:border-slate-700 mb-6 overflow-x-auto">
          {(
            [
              ["pending", `⏳ قيد المراجعة`, pendingCount],
              ["reviewed", `👁️ تمت المراجعة`, reviewedCount],
              ["action_taken", `✅ تم اتخاذ إجراء`, actionTakenCount],
              ["dismissed", `❌ مُهمل`, dismissedCount],
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
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded-full text-white ${
                      tab === "pending"
                        ? "bg-red-500"
                        : tab === "reviewed"
                        ? "bg-blue-500"
                        : tab === "action_taken"
                        ? "bg-green-500"
                        : "bg-gray-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </span>
              {activeTab === tab && (
                <motion.div
                  layoutId="adminReportTab"
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
            placeholder="ابحث عن بلاغ أو مستخدم أو عقار..."
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
                جارٍ تحميل البلاغات...
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
              {filteredReports.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-16 text-center border border-border">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Flag className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-primary dark:text-white mb-2">
                    لا توجد بلاغات
                  </h3>
                  <p className="text-muted-foreground">
                    لا توجد بلاغات في هذه الفئة
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredReports.map((report) => (
                    <ReportRow
                      key={report.id}
                      report={report}
                      onView={() => setSelectedReport(report)}
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

// ─── Report Row
function ReportRow({
  report,
  onView,
}: {
  report: any;
  onView: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border overflow-hidden ${
        report.status === "pending"
          ? "border-red-200 dark:border-red-800"
          : report.status === "action_taken"
          ? "border-green-200 dark:border-green-800"
          : "border-border"
      }`}
    >
      <div className="flex gap-4 p-4">
        <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
          <Flag className="w-6 h-6 text-red-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <h3 className="font-bold text-primary dark:text-white">
                {report.reason}
              </h3>
              {report.property && (
                <p className="text-sm text-muted-foreground">
                  العقار: {report.property.title}
                </p>
              )}
            </div>
            <span
              className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${
                report.status === "pending"
                  ? "bg-red-100 text-red-700"
                  : report.status === "reviewed"
                  ? "bg-blue-100 text-blue-700"
                  : report.status === "action_taken"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {report.status === "pending"
                ? "⏳"
                : report.status === "reviewed"
                ? "👁️"
                : report.status === "action_taken"
                ? "✅"
                : "❌"}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {report.reporter_name}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(report.created_at)}
            </span>
          </div>

          <button
            onClick={onView}
            className="flex items-center gap-1 px-3 py-1.5 bg-accent/10 text-accent hover:bg-accent/20 rounded-lg text-xs font-bold transition-colors"
          >
            <Eye className="w-3 h-3" />
            عرض التفاصيل واتخاذ إجراء
          </button>
        </div>
      </div>
    </motion.div>
  );
}