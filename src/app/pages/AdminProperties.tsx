import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  Eye, Check, X, AlertTriangle, Clock, MapPin,
  User, DollarSign, Calendar, Shield, Home,
  Search, CheckCircle, XCircle, RefreshCw,
  BedDouble, Bath, Maximize2, Image as ImageIcon,
  Phone, Mail, ChevronDown, ChevronUp, Layers,
  Trash2,
} from "lucide-react";
import AdminNavbar from "../components/AdminNavbar";
import { useApp, getValidToken } from "../context/AppContext";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b`;

// ─── Governorate display names
const GOV_NAMES: Record<string, string> = {
  "عمّان": "عمّان", "الزرقاء": "الزرقاء", "إربد": "إربد",
  "العقبة": "العقبة", "المفرق": "المفرق", "البلقاء": "البلقاء",
  "الكرك": "الكرك", "مأدبا": "مأدبا", "جرش": "جرش",
  "عجلون": "عجلون", "معان": "معان", "الطفيلة": "الطفيلة",
  amman: "عمّان", zarqa: "الزرقاء", irbid: "إربد",
  aqaba: "العقبة", mafraq: "المفرق", balqa: "البلقاء",
  karak: "الكرك", madaba: "مأدبا", jerash: "جرش",
  ajloun: "عجلون", maan: "معان", tafilah: "الطفيلة",
};

function govDisplay(gov: string): string {
  return GOV_NAMES[gov] || gov;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("ar-JO", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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

// ─── Mini static map using OpenStreetMap tile
function StaticMap({ lat, lng, gov }: { lat: number; lng: number; gov: string }) {
  const zoom = 12;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.15},${lat - 0.1},${lng + 0.15},${lat + 0.1}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <div className="rounded-xl overflow-hidden border border-border h-48">
      <iframe
        src={src}
        className="w-full h-full"
        title={`موقع في ${govDisplay(gov)}`}
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}

// ─── Property card for detail modal
function PropertyDetailModal({
  property,
  onClose,
  onApprove,
  onReject,
  loading,
}: {
  property: any;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  loading: boolean;
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [useCustomReason, setUseCustomReason] = useState(false);
  const images: string[] = property.images?.length ? property.images : property.image ? [property.image] : [];

  // Predefined rejection reasons
  const predefinedReasons = [
    "محتوى غير مناسب أو مخالف",
    "معلومات ناقصة أو غير واضحة",
    "صور غير واضحة أو غير كافية",
    "بيانات الاتصال غير صحيحة",
    "السعر غير واقعي أو مضلل",
    "العقار مكرر",
    "الموقع الجغرافي غير صحيح",
    "إعلان احتيالي أو مشبوه",
  ];

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) {
      alert("يجب إدخال سبب الرفض");
      return;
    }
    onReject(property.id, rejectReason);
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
        <div className="flex items-center justify-between p-6 border-b border-border dark:border-slate-700 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-900">
          <div>
            <h3 className="text-xl font-bold text-primary dark:text-white">تفاصيل العقار</h3>
            <span className={`text-xs font-bold px-3 py-1 rounded-full mt-1 inline-block ${
              property.status === "pending" ? "bg-amber-100 text-amber-700" :
              property.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}>
              {property.status === "pending" ? "⏳ بانتظار المراجعة" :
               property.status === "approved" ? "✅ مُعتمد" : "❌ مرفوض"}
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Images */}
          {images.length > 0 ? (
            <div className={`grid gap-2 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt=""
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                  className="w-full h-48 object-cover rounded-xl"
                />
              ))}
            </div>
          ) : (
            <div className="w-full h-40 bg-muted rounded-xl flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-muted-foreground" />
            </div>
          )}

          {/* Title & Price */}
          <div>
            <h4 className="text-2xl font-bold text-primary dark:text-white mb-1">{property.title}</h4>
            <p className="text-3xl font-black text-accent">
              {Number(property.price).toLocaleString("ar-JO")}
              <span className="text-base font-normal text-muted-foreground ms-2">
                {property.category === "إيجار" ? "د.أ / شهر" : "د.أ"}
              </span>
            </p>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-3">
              <Home className="w-4 h-4 text-accent shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">النوع</p>
                <p className="font-bold text-sm">{property.type} — {property.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-3">
              <MapPin className="w-4 h-4 text-accent shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">المحافظة</p>
                <p className="font-bold text-sm">{govDisplay(property.governorate)}</p>
              </div>
            </div>
            {property.area > 0 && (
              <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-3">
                <Maximize2 className="w-4 h-4 text-accent shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">المساحة</p>
                  <p className="font-bold text-sm">{property.area} م²</p>
                </div>
              </div>
            )}
            {property.bedrooms > 0 && (
              <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-3">
                <BedDouble className="w-4 h-4 text-accent shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">الغرف / الحمامات</p>
                  <p className="font-bold text-sm">{property.bedrooms} / {property.bathrooms}</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {property.description && (
            <div className="bg-muted/40 rounded-xl p-4">
              <p className="text-xs font-bold text-muted-foreground mb-2">الوصف</p>
              <p className="text-sm leading-relaxed">{property.description}</p>
            </div>
          )}

          {/* Owner Info */}
          <div className="bg-blue-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground mb-2">بيانات صاحب العقار</p>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="font-bold">{property.ownerName || "—"}</span>
            </div>
            {property.ownerEmail && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-sm">{property.ownerEmail}</span>
              </div>
            )}
            {property.ownerPhone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-sm" dir="ltr">{property.ownerPhone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-sm">{formatDate(property.submittedAt)}</span>
            </div>
          </div>

          {/* Real Map */}
          {property.location?.lat && property.location?.lng && (
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2">الموقع الجغرافي</p>
              <StaticMap lat={property.location.lat} lng={property.location.lng} gov={property.governorate} />
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {property.location.lat.toFixed(4)}, {property.location.lng.toFixed(4)}
              </p>
            </div>
          )}

          {/* Actions */}
          {property.status === "pending" && (
            <div className="space-y-3 pt-2">
              {showRejectInput ? (
                <div className="space-y-3">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-2">⚠️ سبب الرفض (إجباري)</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">يجب تحديد سبب واضح للرفض حتى يتمكن المستخدم من معرفة المشكلة</p>
                  </div>
                  
                  {!useCustomReason && (
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-muted-foreground">اختر سبباً جاهزاً:</p>
                      <div className="grid gap-2">
                        {predefinedReasons.map((reason, idx) => (
                          <button
                            key={idx}
                            onClick={() => setRejectReason(reason)}
                            className={`text-start px-4 py-3 rounded-xl border transition-all text-sm ${
                              rejectReason === reason
                                ? "border-red-500 bg-red-50 dark:bg-red-900/20 font-bold"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            {reason}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setUseCustomReason(true)}
                        className="text-sm text-accent hover:underline"
                      >
                        أو اكتب سبباً مخصصاً
                      </button>
                    </div>
                  )}

                  {useCustomReason && (
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-muted-foreground">اكتب سبب الرفض:</p>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="اكتب سبباً واضحاً ومفصلاً للرفض..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                      />
                      <button
                        onClick={() => {
                          setUseCustomReason(false);
                          setRejectReason("");
                        }}
                        className="text-sm text-accent hover:underline"
                      >
                        العودة للأسباب الجاهزة
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleRejectSubmit}
                      disabled={loading || !rejectReason.trim()}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      تأكيد الرفض
                    </button>
                    <button 
                      onClick={() => {
                        setShowRejectInput(false);
                        setRejectReason("");
                        setUseCustomReason(false);
                      }} 
                      className="px-4 py-3 rounded-xl border border-border hover:bg-muted transition-colors text-sm"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => onApprove(property.id)}
                    disabled={loading}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-5 h-5" />}
                    ✅ موافقة ونشر
                  </button>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    disabled={loading}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <X className="w-5 h-5" />
                    ❌ رفض
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Show rejection reason if rejected */}
          {property.status === "rejected" && (property.rejectionReason || property.rejection_reason) && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-sm font-bold text-red-800 dark:text-red-200 mb-2">❌ سبب الرفض:</p>
              <p className="text-sm text-red-700 dark:text-red-300">{property.rejectionReason || property.rejection_reason}</p>
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

export default function AdminProperties() {
  const navigate = useNavigate();
  const { language, user, authReady } = useApp();
  const ar = language === "ar";

  const [pendingProps, setPendingProps] = useState<any[]>([]);
  const [approvedProps, setApprovedProps] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // ── Delete-All state ────────────────────────────────────────────────────────
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText]   = useState("");
  const [isDeleting, setIsDeleting]                 = useState(false);
  const [deleteProgress, setDeleteProgress]         = useState({ done: 0, total: 0, failed: 0 });

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

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getAdminToken();
      if (!token) { setIsLoading(false); return; }

      const headers = {
        "Authorization": `Bearer ${publicAnonKey}`,
        "X-User-Token": token,
        "Content-Type": "application/json",
      };

      const [pendingRes, approvedRes] = await Promise.all([
        fetch(`${API}/admin/pending`, { headers }),
        fetch(`${API}/admin/properties`, { headers }),
      ]);

      const pendingData = await pendingRes.json();
      const approvedData = await approvedRes.json();

      if (pendingData.success) setPendingProps(pendingData.data || []);
      if (approvedData.success) setApprovedProps(approvedData.data || []);
    } catch (e) {
      console.error("fetchData error:", e);
      showNotif("تعذّر جلب البيانات، يرجى المحاولة مجدداً", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin && authReady) fetchData();
  }, [isAdmin, authReady, fetchData]);

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      const token = await getAdminToken();
      if (!token) return;
      const res = await fetch(`${API}/admin/approve/${id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${publicAnonKey}`,
          "X-User-Token": token,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        showNotif("✅ تمت الموافقة على العقار ونشره على الموقع", "success");
        setSelectedProperty(null);
        await fetchData();
      } else {
        showNotif(data.error || "حدث خطأ", "error");
      }
    } catch (e) {
      console.error("approve error:", e);
      showNotif("تعذّر الموافقة على العقار", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    setActionLoading(true);
    try {
      const token = await getAdminToken();
      if (!token) return;
      const res = await fetch(`${API}/admin/reject/${id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${publicAnonKey}`,
          "X-User-Token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) {
        showNotif("تم رفض العقار", "error");
        setSelectedProperty(null);
        await fetchData();
      } else {
        showNotif(data.error || "حدث خطأ", "error");
      }
    } catch (e) {
      console.error("reject error:", e);
      showNotif("تعذّر رفض العقار", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteApproved = async (id: string) => {
    if (!confirm("هل تريد حذف هذا العقار نهائياً؟")) return;
    setActionLoading(true);
    try {
      const token = await getAdminToken();
      if (!token) return;
      const res = await fetch(`${API}/admin/properties/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${publicAnonKey}`,
          "X-User-Token": token,
        },
      });
      const data = await res.json();
      if (data.success) {
        showNotif("تم حذف العقار", "success");
        await fetchData();
      } else {
        showNotif(data.error || "حدث خطأ", "error");
      }
    } catch (e) {
      showNotif("تعذّر حذف العقار", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleFeatured = async (id: string) => {
    setActionLoading(true);
    try {
      const token = await getAdminToken();
      if (!token) return;
      const res = await fetch(`${API}/admin/toggle-featured/${id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${publicAnonKey}`,
          "X-User-Token": token,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        showNotif(data.message || "تم تحديث التمييز", "success");
        await fetchData();
      } else {
        showNotif(data.error || "حدث خطأ", "error");
      }
    } catch (e) {
      showNotif("تعذّر تحديث التمييز", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Delete ALL properties — admin-only, sequential, with live progress ──────
  const handleDeleteAll = async () => {
    if (!isAdmin) return;
    const allIds = [
      ...pendingProps.map((p) => p.id),
      ...approvedProps.map((p) => p.id),
    ].filter(Boolean);
    if (!allIds.length) return;

    setIsDeleting(true);
    setDeleteProgress({ done: 0, total: allIds.length, failed: 0 });

    let failed = 0;
    const token = await getAdminToken();
    if (!token) { setIsDeleting(false); return; }

    for (let i = 0; i < allIds.length; i++) {
      try {
        const res = await fetch(`${API}/admin/properties/${allIds[i]}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${publicAnonKey}`,
            "X-User-Token": token,
          },
        });
        const data = await res.json().catch(() => ({}));
        if (!data?.success) failed++;
      } catch {
        failed++;
      }
      setDeleteProgress({ done: i + 1, total: allIds.length, failed });
    }

    setIsDeleting(false);
    setShowDeleteAllModal(false);
    setDeleteConfirmText("");
    await fetchData();

    if (failed === 0) {
      showNotif(`✅ تم حذف جميع العقارات (${allIds.length}) بنجاح`, "success");
    } else {
      showNotif(`⚠️ حُذف ${allIds.length - failed} عقار — فشل: ${failed}`, "error");
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

  const filteredPending = pendingProps.filter(p =>
    (p.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.ownerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.governorate || "").includes(searchTerm)
  );

  const filteredApproved = approvedProps.filter(p =>
    (p.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.ownerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.governorate || "").includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
      <AdminNavbar pendingCount={pendingProps.length} />

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
              {notification.type === "success" ? <CheckCircle className="w-6 h-6 shrink-0" /> : <XCircle className="w-6 h-6 shrink-0" />}
              <span className="font-bold">{notification.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedProperty && (
          <PropertyDetailModal
            property={selectedProperty}
            onClose={() => setSelectedProperty(null)}
            onApprove={handleApprove}
            onReject={handleReject}
            loading={actionLoading}
          />
        )}
      </AnimatePresence>

      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center shadow-lg">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-primary dark:text-white">إدارة العقارات</h1>
                <p className="text-muted-foreground">لوحة تحكم الأدمن — بيتي</p>
              </div>
            </div>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-border rounded-xl hover:shadow-md transition-all text-sm font-bold"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              تحديث
            </button>
            {/* ── Delete All Button — admin-only ─────────────────────────── */}
            {(pendingProps.length + approvedProps.length) > 0 && (
              <button
                onClick={() => { setDeleteConfirmText(""); setShowDeleteAllModal(true); }}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl transition-all text-sm font-bold shadow-lg shadow-red-500/25 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                حذف الكل ({pendingProps.length + approvedProps.length})
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
              <p className="text-xs font-bold text-amber-600 mb-1">بانتظار المراجعة</p>
              <p className="text-4xl font-black text-amber-700">{pendingProps.length}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4">
              <p className="text-xs font-bold text-green-600 mb-1">عقارات منشورة</p>
              <p className="text-4xl font-black text-green-700">{approvedProps.length}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 col-span-2 sm:col-span-1">
              <p className="text-xs font-bold text-blue-600 mb-1">إجمالي العقارات</p>
              <p className="text-4xl font-black text-blue-700">{pendingProps.length + approvedProps.length}</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border dark:border-slate-700 mb-6">
          {([["pending", `⏳ طلبات جديدة`, pendingProps.length], ["approved", `✅ منشورة`, approvedProps.length]] as const).map(([tab, label, count]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-6 py-3 font-bold text-sm transition-colors ${
                activeTab === tab ? "text-accent" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                {label}
                {(count as number) > 0 && (
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full text-white ${tab === "pending" ? "bg-amber-500" : "bg-green-500"}`}>
                    {count}
                  </span>
                )}
              </span>
              {activeTab === tab && (
                <motion.div layoutId="adminTab" className="absolute bottom-0 inset-x-0 h-0.5 bg-accent" />
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="ابحث عن عقار أو مستخدم أو محافظة..."
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
              <p className="text-muted-foreground font-bold">جارٍ تحميل البيانات...</p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === "pending" ? (
              <motion.div key="pending" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {filteredPending.length === 0 ? (
                  <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-16 text-center border border-border">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold text-primary dark:text-white mb-2">لا توجد طلبات جديدة</h3>
                    <p className="text-muted-foreground">جميع العقارات تمت مراجعتها</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredPending.map((property) => (
                      <PendingPropertyRow
                        key={property.id}
                        property={property}
                        onView={() => setSelectedProperty(property)}
                        onApprove={() => handleApprove(property.id)}
                        onReject={() => setSelectedProperty(property)}
                        loading={actionLoading}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="approved" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {filteredApproved.length === 0 ? (
                  <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-16 text-center border border-border">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Home className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-primary dark:text-white mb-2">ا توجد عقارات منشورة</h3>
                    <p className="text-muted-foreground">ابدأ بالموافقة على طلبات العقارات</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredApproved.map((property) => (
                      <ApprovedPropertyRow
                        key={property.id}
                        property={property}
                        onView={() => setSelectedProperty({ ...property, status: "approved" })}
                        onDelete={() => handleDeleteApproved(property.id)}
                        onToggleFeatured={() => handleToggleFeatured(property.id)}
                        loading={actionLoading}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ════ Delete All Confirmation Modal ════ */}
      <AnimatePresence>
        {showDeleteAllModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
            onClick={() => { if (!isDeleting) { setShowDeleteAllModal(false); setDeleteConfirmText(""); } }}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border-2 border-red-200 dark:border-red-800 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">حذف جميع العقارات</h3>
                    <p className="text-red-200 text-sm">هذا الإجراء لا يمكن التراجع عنه</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Warning */}
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-black text-red-800 dark:text-red-200 mb-1">تحذير: عملية لا رجعة فيها!</p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        سيتم حذف{" "}
                        <span className="font-black">{pendingProps.length + approvedProps.length} عقار</span>
                        {" "}بشكل نهائي من قاعدة البيانات.
                        يشمل ذلك{" "}
                        <span className="font-bold">{approvedProps.length} منشور</span>{" "}و
                        <span className="font-bold"> {pendingProps.length} قيد المراجعة</span>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress bar (shown during deletion) */}
                {isDeleting && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        جارٍ الحذف...
                      </span>
                      <span className="tabular-nums text-primary dark:text-white">
                        {deleteProgress.done} / {deleteProgress.total}
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"
                        animate={{ width: `${deleteProgress.total > 0 ? Math.round((deleteProgress.done / deleteProgress.total) * 100) : 0}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    {deleteProgress.failed > 0 && (
                      <p className="text-xs text-red-500 font-bold">فشل: {deleteProgress.failed}</p>
                    )}
                  </div>
                )}

                {/* Confirmation input */}
                {!isDeleting && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-primary dark:text-white block">
                      لتأكيد الحذف، اكتب{" "}
                      <code className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded font-mono">حذف الكل</code>
                      {" "}أدناه:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder='اكتب "حذف الكل" للتأكيد'
                      className="w-full px-4 py-3 rounded-xl border-2 border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-primary dark:text-white placeholder-red-300 dark:placeholder-red-600 focus:outline-none focus:border-red-500 font-bold"
                      autoComplete="off"
                    />
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAll}
                    disabled={isDeleting || deleteConfirmText !== "حذف الكل"}
                    className="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-3 rounded-xl font-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
                  >
                    {isDeleting ? (
                      <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> جارٍ الحذف...</>
                    ) : (
                      <><Trash2 className="w-5 h-5" /> حذف {pendingProps.length + approvedProps.length} عقار نهائياً</>
                    )}
                  </button>
                  {!isDeleting && (
                    <button
                      onClick={() => { setShowDeleteAllModal(false); setDeleteConfirmText(""); }}
                      className="px-5 py-3 rounded-xl border-2 border-border hover:bg-muted dark:hover:bg-slate-700 transition-colors font-bold text-primary dark:text-white"
                    >
                      إلغاء
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Pending Property Row
function PendingPropertyRow({
  property, onView, onApprove, onReject, loading
}: {
  property: any;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
}) {
  const images: string[] = property.images?.length ? property.images : property.image ? [property.image] : [];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-800 overflow-hidden"
    >
      <div className="flex gap-4 p-4">
        {/* Image */}
        <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-muted">
          {images[0] ? (
            <img src={images[0]} alt={property.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-primary dark:text-white truncate">{property.title}</h3>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0 font-bold">
              ⏳ قيد المراجعة
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />{govDisplay(property.governorate)}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {Number(property.price).toLocaleString("ar-JO")} د.أ
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />{property.ownerName}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />{timeAgo(property.submittedAt)}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onView}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
            >
              <Eye className="w-3 h-3" />عرض التفاصيل
            </button>
            <button
              onClick={onApprove}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white hover:bg-green-600 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              <Check className="w-3 h-3" />موافقة
            </button>
            <button
              onClick={onReject}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white hover:bg-red-600 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              <X className="w-3 h-3" />رفض
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Approved Property Row
function ApprovedPropertyRow({
  property, onView, onDelete, onToggleFeatured, loading
}: {
  property: any;
  onView: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
  loading: boolean;
}) {
  const images: string[] = property.images?.length ? property.images : property.image ? [property.image] : [];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-green-200 dark:border-green-800 overflow-hidden"
    >
      <div className="flex gap-4 p-4">
        <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-muted">
          {images[0] ? (
            <img src={images[0]} alt={property.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-primary dark:text-white truncate">{property.title}</h3>
            <div className="flex items-center gap-1 shrink-0">
              {property.featured && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                  ⭐ مميز
                </span>
              )}
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                ✅ منشور
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />{govDisplay(property.governorate)}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {Number(property.price).toLocaleString("ar-JO")} د.أ
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />{property.ownerName}
            </span>
            <span className="flex items-center gap-1 text-green-600 font-bold">
              <Calendar className="w-3 h-3" />نُشر {timeAgo(property.approvedAt || property.createdAt)}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={onView}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
            >
              <Eye className="w-3 h-3" />عرض
            </button>
            <button
              onClick={onToggleFeatured}
              disabled={loading}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                property.featured
                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                  : "bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700"
              }`}
            >
              <Layers className="w-3 h-3" />
              {property.featured ? "إلغاء التمييز" : "تمييز"}
            </button>
            <button
              onClick={onDelete}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" />حذف
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}