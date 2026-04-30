import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Home, MapPin, BedDouble, Bath, Maximize2, Trash2,
  RefreshCw, Search, X, FileSpreadsheet, PlusCircle,
  Filter, CheckCircle, Clock, BarChart3, Eye,
  ArrowUpDown, TrendingUp, Shield, ChevronDown,
  Image as ImageIcon, Tag, Calendar, AlertTriangle,
} from "lucide-react";
import AdminNavbar from "../components/AdminNavbar";
import BackButton from "../components/BackButton";
import { useApp, getValidToken } from "../context/AppContext";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const GOV_LABELS: Record<string, string> = {
  amman: "عمّان", zarqa: "الزرقاء", irbid: "إربد", aqaba: "العقبة",
  mafraq: "المفرق", balqa: "البلقاء", karak: "الكرك", madaba: "مأدبا",
  jerash: "جرش", ajloun: "عجلون", maan: "معان", tafilah: "الطفيلة",
  "عمّان": "عمّان", "الزرقاء": "الزرقاء", "إربد": "إربد", "العقبة": "العقبة",
  "المفرق": "المفرق", "البلقاء": "البلقاء", "الكرك": "الكرك", "مأدبا": "مأدبا",
  "جرش": "جرش", "عجلون": "عجلون", "معان": "معان", "الطفيلة": "الطفيلة",
};
function govLabel(g: string) { return GOV_LABELS[g] || g; }
function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-JO", { year: "numeric", month: "short", day: "numeric" });
}
function isAdminProperty(p: any) {
  return (
    p.uploadedByEmail === "admin@baity.com" ||
    p.ownerEmail === "admin@baity.com" ||
    (p.uploadedBy && (p.uploadedBy === "Admin" || p.uploadedByEmail))
  );
}
function sourceLabel(p: any): "csv" | "manual" {
  return p.uploadedByEmail ? "csv" : "manual";
}

// ─── Property Card ─────────────────────────────────────────────────────────
function PropertyCard({
  property, onDelete, onView, isDeleting,
}: {
  property: any; onDelete: (id: string) => void; onView: (p: any) => void; isDeleting: boolean;
}) {
  const src = sourceLabel(property);
  const imgs: string[] = property.images?.length ? property.images : property.image ? [property.image] : [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-border shadow-sm hover:shadow-lg transition-all group overflow-hidden"
    >
      {/* Image strip */}
      <div className="relative h-36 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 overflow-hidden">
        {imgs[0] ? (
          <img src={imgs[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 start-2 flex flex-col gap-1">
          {/* Source badge */}
          <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
            src === "csv"
              ? "bg-teal-500 text-white"
              : "bg-blue-500 text-white"
          }`}>
            {src === "csv" ? <><FileSpreadsheet className="w-2.5 h-2.5" />CSV</> : <><PlusCircle className="w-2.5 h-2.5" />يدوي</>}
          </span>
          {/* Status badge */}
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
            property.status === "approved"
              ? "bg-green-500 text-white"
              : property.status === "pending"
                ? "bg-amber-400 text-white"
                : "bg-red-500 text-white"
          }`}>
            {property.status === "approved" ? "✓ منشور" : property.status === "pending" ? "⏳ مراجعة" : "✕ مرفوض"}
          </span>
        </div>
        {/* Category pill */}
        <span className={`absolute top-2 end-2 text-[10px] font-black px-2.5 py-1 rounded-full ${
          property.category === "إيجار" || property.category === "rent"
            ? "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300"
            : "bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300"
        }`}>
          {property.category === "إيجار" || property.category === "rent" ? "إيجار" : "بيع"}
        </span>
      </div>

      <div className="p-4">
        {/* Price */}
        <p className="text-xl font-black text-amber-600 dark:text-amber-400 mb-0.5 tabular-nums">
          {Number(property.price).toLocaleString()} <span className="text-xs text-muted-foreground font-normal">د.أ{property.category === "إيجار" ? "/شهر" : ""}</span>
        </p>

        {/* Title */}
        <p className="font-bold text-sm text-primary dark:text-white mb-2 truncate">{property.title}</p>

        {/* Chips row */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted dark:bg-slate-700 px-2 py-0.5 rounded-lg">
            <MapPin className="w-3 h-3 text-amber-500" />{govLabel(property.governorate)}
          </span>
          {property.bedrooms > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted dark:bg-slate-700 px-2 py-0.5 rounded-lg">
              <BedDouble className="w-3 h-3" />{property.bedrooms}
            </span>
          )}
          {property.bathrooms > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted dark:bg-slate-700 px-2 py-0.5 rounded-lg">
              <Bath className="w-3 h-3" />{property.bathrooms}
            </span>
          )}
          {property.area > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted dark:bg-slate-700 px-2 py-0.5 rounded-lg">
              <Maximize2 className="w-3 h-3" />{property.area}م²
            </span>
          )}
        </div>

        {/* Date */}
        <p className="text-[11px] text-muted-foreground mb-3 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(property.uploadDate || property.submittedAt || property.createdAt)}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onView(property)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-border text-xs font-bold text-primary dark:text-white transition-all"
          >
            <Eye className="w-3.5 h-3.5" /> عرض
          </button>
          <button
            onClick={() => onDelete(property.id)}
            disabled={isDeleting}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-bold transition-all disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function PropertyDetailModal({ property, onClose }: { property: any; onClose: () => void }) {
  const imgs: string[] = property.images?.length ? property.images : property.image ? [property.image] : [];
  const src = sourceLabel(property);
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.93, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full my-4 overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-slate-50 to-amber-50 dark:from-slate-800 dark:to-slate-900">
          <div>
            <h3 className="font-black text-primary dark:text-white">تفاصيل العقار</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${src === "csv" ? "bg-teal-500 text-white" : "bg-blue-500 text-white"}`}>
                {src === "csv" ? "📂 CSV" : "✏️ يدوي"}
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${property.status === "approved" ? "bg-green-500 text-white" : property.status === "pending" ? "bg-amber-400 text-white" : "bg-red-500 text-white"}`}>
                {property.status === "approved" ? "✓ منشور" : property.status === "pending" ? "⏳ مراجعة" : "✕ مرفوض"}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {imgs.length > 0 ? (
            <div className={`grid gap-2 ${imgs.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {imgs.map((img, i) => <img key={i} src={img} alt="" className="w-full h-40 object-cover rounded-xl" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />)}
            </div>
          ) : (
            <div className="h-32 bg-muted rounded-xl flex items-center justify-center"><ImageIcon className="w-8 h-8 text-muted-foreground" /></div>
          )}
          <div>
            <h4 className="text-xl font-black text-primary dark:text-white">{property.title}</h4>
            <p className="text-2xl font-black text-amber-500 mt-1">{Number(property.price).toLocaleString()} <span className="text-sm text-muted-foreground font-normal">د.أ{property.category === "إيجار" ? "/شهر" : ""}</span></p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { icon: Tag,      label: "النوع",      val: `${property.type || "شقة"} — ${property.category}` },
              { icon: MapPin,   label: "المحافظة",   val: govLabel(property.governorate) },
              { icon: Maximize2,label: "المساحة",    val: property.area ? `${property.area} م²` : "—" },
              { icon: BedDouble,label: "غرف/حمامات", val: `${property.bedrooms || 0} / ${property.bathrooms || 0}` },
            ].map(it => {
              const Icon = it.icon;
              return (
                <div key={it.label} className="flex items-center gap-2 bg-muted/50 rounded-xl p-2.5">
                  <Icon className="w-4 h-4 text-amber-500 shrink-0" />
                  <div><p className="text-[10px] text-muted-foreground">{it.label}</p><p className="font-bold text-xs">{it.val}</p></div>
                </div>
              );
            })}
          </div>
          {property.description && (
            <div className="bg-muted/40 rounded-xl p-3">
              <p className="text-[10px] font-bold text-muted-foreground mb-1">الوصف</p>
              <p className="text-xs leading-relaxed">{property.description}</p>
            </div>
          )}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs">
            <p className="font-black text-amber-800 dark:text-amber-200 mb-1">بيانات الرفع</p>
            <p className="text-amber-700 dark:text-amber-300">المصدر: {src === "csv" ? "ملف CSV" : "إضافة يدوية"}</p>
            {(property.uploadedBy || property.uploadDate) && (
              <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                {property.uploadedBy && `بواسطة: ${property.uploadedBy} • `}
                {formatDate(property.uploadDate || property.submittedAt)}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Governorate Stat Bar ──────────────────────────────────────────────────────
function GovBar({ properties }: { properties: any[] }) {
  const counts: Record<string, number> = {};
  properties.forEach(p => { const g = govLabel(p.governorate); counts[g] = (counts[g] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = sorted[0]?.[1] || 1;
  return (
    <div className="space-y-2">
      {sorted.map(([gov, count]) => (
        <div key={gov} className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground w-16 shrink-0 text-end">{gov}</span>
          <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${(count / max) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
            />
          </div>
          <span className="text-xs font-black text-amber-600 dark:text-amber-400 w-6 text-start tabular-nums">{count}</span>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════
// Main Page
// ════════════════════════════════════════════
export default function AdminAddedProperties() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, authReady } = useApp();
  const isAdmin = user?.email === "admin@baity.com";

  const [properties, setProperties]     = useState<any[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isDeleting, setIsDeleting]     = useState(false);
  const [search, setSearch]             = useState("");
  const [filterCat, setFilterCat]       = useState<"all"|"بيع"|"إيجار">("all");
  const [filterSrc, setFilterSrc]       = useState<"all"|"csv"|"manual">("all");
  const [filterStatus, setFilterStatus] = useState<"all"|"approved"|"pending">("all");
  const [filterGov, setFilterGov]       = useState("all");
  const [sortBy, setSortBy]             = useState<"date"|"price_asc"|"price_desc">("date");
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [notification, setNotification] = useState<{msg:string;type:"success"|"error"}|null>(null);
  const [showFilters, setShowFilters]   = useState(false);
  const [viewMode, setViewMode]         = useState<"grid"|"table">("grid");

  // Auth guard
  useEffect(() => {
    if (!authReady) return;
    if (!user) { navigate("/admin/login", { replace: true }); return; }
    if (!isAdmin) navigate("/", { replace: true });
  }, [user, isAdmin, authReady, navigate]);

  // Pre-apply filter from query param (e.g. ?source=csv from AdminCSV)
  useEffect(() => {
    const src = searchParams.get("source");
    if (src === "csv" || src === "manual") setFilterSrc(src);
  }, [searchParams]);

  const showNotif = (msg: string, type: "success"|"error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4500);
  };

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const token = await getValidToken();
      if (!token) return;
      const headers = {
        "Authorization": `Bearer ${publicAnonKey}`,
        "X-User-Token": token,
        "Content-Type": "application/json",
      };
      const [pendingRes, approvedRes] = await Promise.all([
        fetch(`${API}/admin/pending`, { headers }),
        fetch(`${API}/admin/properties`, { headers }),
      ]);
      const [pendingData, approvedData] = await Promise.all([pendingRes.json(), approvedRes.json()]);
      const all = [
        ...(pendingData.success ? pendingData.data || [] : []),
        ...(approvedData.success ? approvedData.data || [] : []),
      ];
      // Filter to admin-added only
      setProperties(all.filter(isAdminProperty));
    } catch (e) {
      console.error("fetchData error:", e);
      showNotif("تعذّر جلب البيانات", "error");
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin && authReady) fetchData();
  }, [isAdmin, authReady, fetchData]);

  // ─── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا العقار نهائياً؟")) return;
    setIsDeleting(true);
    try {
      const token = await getValidToken();
      if (!token) return;
      const res = await fetch(`${API}/admin/properties/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${publicAnonKey}`, "X-User-Token": token },
      });
      const data = await res.json();
      if (data.success) {
        setProperties(prev => prev.filter(p => p.id !== id));
        showNotif("✅ تم حذف العقار بنجاح");
      } else {
        showNotif(data.error || "حدث خطأ", "error");
      }
    } catch {
      showNotif("تعذّر حذف العقار", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Filter + Sort ─────────────────────────────────────────────────────────
  const filtered = properties
    .filter(p => {
      if (search && !(
        (p.title || "").toLowerCase().includes(search.toLowerCase()) ||
        govLabel(p.governorate).includes(search)
      )) return false;
      if (filterCat !== "all" && p.category !== filterCat) return false;
      if (filterSrc !== "all" && sourceLabel(p) !== filterSrc) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterGov !== "all" && govLabel(p.governorate) !== filterGov) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "price_asc") return (a.price || 0) - (b.price || 0);
      if (sortBy === "price_desc") return (b.price || 0) - (a.price || 0);
      return new Date(b.uploadDate || b.submittedAt || 0).getTime() - new Date(a.uploadDate || a.submittedAt || 0).getTime();
    });

  const csvCount    = properties.filter(p => sourceLabel(p) === "csv").length;
  const manualCount = properties.filter(p => sourceLabel(p) === "manual").length;
  const saleCount   = properties.filter(p => p.category !== "إيجار" && p.category !== "rent").length;
  const rentCount   = properties.filter(p => p.category === "إيجار" || p.category === "rent").length;
  const approvedCount = properties.filter(p => p.status === "approved").length;
  const pendingCount  = properties.filter(p => p.status === "pending").length;

  // Unique governorates for filter dropdown
  const govOptions = [...new Set(properties.map(p => govLabel(p.governorate)))].sort();

  // ─── Auth loading ──────────────────────────────────────────────────────────
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

  // ─── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/10 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <AdminNavbar pendingCount={pendingCount} />

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -60 }}
            className="fixed top-20 inset-x-0 z-[100] flex justify-center px-4"
          >
            <div className={`px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-white font-bold ${notification.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
              {notification.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              {notification.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedProperty && <PropertyDetailModal property={selectedProperty} onClose={() => setSelectedProperty(null)} />}
      </AnimatePresence>

      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <BackButton />

        {/* ── Hero header ──────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 rounded-3xl p-6 border border-slate-700/50 shadow-2xl">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-amber-400 text-xs font-black uppercase tracking-widest mb-1">لوحة الأدمن</p>
                  <h1 className="text-2xl font-black text-white">العقارات المضافة بواسطة الأدمن</h1>
                  <p className="text-slate-400 text-sm mt-0.5">
                    جميع العقارات المضافة يدوياً أو عبر ملف CSV — تظهر مباشرة للمستخدمين بعد النشر
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => navigate("/admin/csv")}
                  className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold text-sm transition-colors shadow-lg"
                >
                  <FileSpreadsheet className="w-4 h-4" /> رفع CSV
                </button>
                <button
                  onClick={fetchData}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-white/20 text-white/80 hover:text-white hover:bg-white/20 rounded-xl font-bold text-sm transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} /> تحديث
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Stats ────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8"
        >
          {[
            { label: "الإجمالي",     val: properties.length, color: "amber",   icon: Home },
            { label: "CSV",          val: csvCount,           color: "teal",    icon: FileSpreadsheet },
            { label: "يدوي",         val: manualCount,        color: "blue",    icon: PlusCircle },
            { label: "منشور",        val: approvedCount,      color: "green",   icon: CheckCircle },
            { label: "قيد المراجعة", val: pendingCount,       color: "amber",   icon: Clock, urgent: pendingCount > 0 },
            { label: "للبيع",        val: saleCount,          color: "purple",  icon: TrendingUp },
          ].map((s, i) => {
            const Icon = s.icon;
            const cls = {
              amber:  "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600",
              teal:   "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 text-teal-600",
              blue:   "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600",
              green:  "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600",
              purple: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-600",
            }[s.color] || "";
            return (
              <motion.div key={s.label}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.04 * i }}
                className={`rounded-2xl border p-3.5 ${cls} ${(s as any).urgent && s.val > 0 ? "ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-slate-950" : ""}`}
              >
                <Icon className="w-4 h-4 mb-1.5 opacity-70" />
                <p className="text-2xl font-black">{s.val}</p>
                <p className="text-[11px] font-bold mt-0.5 opacity-70">{s.label}</p>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ── Sidebar: chart + quick links ─────────────────────────────── */}
          <div className="lg:col-span-1 space-y-4">

            {/* Governorate distribution */}
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-4 shadow-sm"
            >
              <p className="font-black text-primary dark:text-white mb-3 flex items-center gap-2 text-sm">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                التوزيع بالمحافظات
              </p>
              {isLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-muted rounded animate-pulse" />)}</div>
              ) : properties.length > 0 ? (
                <GovBar properties={properties} />
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">لا توجد بيانات</p>
              )}
            </motion.div>

            {/* Source split */}
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-4 shadow-sm"
            >
              <p className="font-black text-primary dark:text-white mb-3 text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-teal-500" />
                المصدر
              </p>
              <div className="space-y-2">
                {[
                  { label: "CSV", count: csvCount, color: "teal", filterVal: "csv" as const },
                  { label: "يدوي", count: manualCount, color: "blue", filterVal: "manual" as const },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => setFilterSrc(filterSrc === item.filterVal ? "all" : item.filterVal)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all text-sm ${
                      filterSrc === item.filterVal
                        ? item.color === "teal"
                          ? "bg-teal-50 dark:bg-teal-900/30 border-teal-400 font-black text-teal-700 dark:text-teal-300"
                          : "bg-blue-50 dark:bg-blue-900/30 border-blue-400 font-black text-blue-700 dark:text-blue-300"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className={`font-black px-2 py-0.5 rounded-full text-xs text-white ${item.color === "teal" ? "bg-teal-500" : "bg-blue-500"}`}>
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Quick links */}
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.14 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-4 shadow-sm"
            >
              <p className="font-black text-primary dark:text-white mb-3 text-sm">روابط سريعة</p>
              <div className="space-y-2">
                {[
                  { label: "رفع ملف CSV جديد",      path: "/admin/csv",             icon: FileSpreadsheet, color: "teal" },
                  { label: "إدارة جميع العقارات",    path: "/admin/properties",      icon: Home,            color: "blue" },
                  { label: "العودة للوحة الأدمن",    path: "/admin",                 icon: Shield,          color: "amber" },
                ].map(link => {
                  const Icon = link.icon;
                  return (
                    <button key={link.path} onClick={() => navigate(link.path)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border hover:bg-muted dark:hover:bg-slate-700 transition-all text-sm font-bold text-start text-primary dark:text-white">
                      <Icon className={`w-4 h-4 ${link.color === "teal" ? "text-teal-500" : link.color === "blue" ? "text-blue-500" : "text-amber-500"}`} />
                      {link.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* ── Main content ─────────────────────────────────────────────── */}
          <div className="lg:col-span-3">

            {/* Search + controls bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-border shadow-sm p-4 mb-5"
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="بحث بالعنوان أو المحافظة..."
                    className="w-full ps-9 pe-4 py-2.5 bg-muted dark:bg-slate-700 rounded-xl border-0 outline-none text-sm text-primary dark:text-white placeholder:text-muted-foreground"
                  />
                  {search && <button onClick={() => setSearch("")} className="absolute end-2 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>}
                </div>

                {/* Sort */}
                <div className="relative">
                  <ArrowUpDown className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                    className="ps-9 pe-8 py-2.5 bg-muted dark:bg-slate-700 rounded-xl border-0 outline-none text-sm text-primary dark:text-white appearance-none cursor-pointer">
                    <option value="date">الأحدث أولاً</option>
                    <option value="price_asc">السعر: تصاعدي</option>
                    <option value="price_desc">السعر: تنازلي</option>
                  </select>
                  <ChevronDown className="absolute end-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>

                {/* Filter toggle */}
                <button onClick={() => setShowFilters(f => !f)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all ${showFilters ? "bg-amber-50 dark:bg-amber-900/30 border-amber-400 text-amber-700 dark:text-amber-300" : "border-border hover:bg-muted text-muted-foreground"}`}>
                  <Filter className="w-4 h-4" /> تصفية
                </button>

                {/* View mode */}
                <div className="flex rounded-xl overflow-hidden border border-border">
                  {(["grid", "table"] as const).map(mode => (
                    <button key={mode} onClick={() => setViewMode(mode)}
                      className={`px-3 py-2 text-sm transition-all ${viewMode === mode ? "bg-amber-500 text-white" : "bg-white dark:bg-slate-800 text-muted-foreground hover:bg-muted"}`}>
                      {mode === "grid" ? "⊞" : "☰"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expanded filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Category */}
                      <div>
                        <p className="text-xs font-bold text-muted-foreground mb-1.5">نوع العملية</p>
                        <div className="flex gap-1.5">
                          {(["all","بيع","إيجار"] as const).map(c => (
                            <button key={c} onClick={() => setFilterCat(c)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${filterCat === c ? "bg-amber-500 text-white" : "bg-muted dark:bg-slate-700 text-muted-foreground hover:bg-muted/70"}`}>
                              {c === "all" ? "الكل" : c}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Source */}
                      <div>
                        <p className="text-xs font-bold text-muted-foreground mb-1.5">المصدر</p>
                        <div className="flex gap-1.5">
                          {(["all","csv","manual"] as const).map(s => (
                            <button key={s} onClick={() => setFilterSrc(s)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${filterSrc === s ? "bg-amber-500 text-white" : "bg-muted dark:bg-slate-700 text-muted-foreground hover:bg-muted/70"}`}>
                              {s === "all" ? "الكل" : s === "csv" ? "CSV" : "يدوي"}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Status */}
                      <div>
                        <p className="text-xs font-bold text-muted-foreground mb-1.5">الحالة</p>
                        <div className="flex gap-1.5">
                          {(["all","approved","pending"] as const).map(s => (
                            <button key={s} onClick={() => setFilterStatus(s)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === s ? "bg-amber-500 text-white" : "bg-muted dark:bg-slate-700 text-muted-foreground hover:bg-muted/70"}`}>
                              {s === "all" ? "الكل" : s === "approved" ? "منشور" : "مراجعة"}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Governorate */}
                      <div>
                        <p className="text-xs font-bold text-muted-foreground mb-1.5">المحافظة</p>
                        <div className="relative">
                          <select value={filterGov} onChange={e => setFilterGov(e.target.value)}
                            className="w-full py-1.5 px-3 bg-muted dark:bg-slate-700 rounded-lg text-xs text-primary dark:text-white border-0 outline-none appearance-none cursor-pointer">
                            <option value="all">كل المحافظات</option>
                            {govOptions.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                          <ChevronDown className="absolute end-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                    </div>
                    {/* Active filters summary */}
                    {(filterCat !== "all" || filterSrc !== "all" || filterStatus !== "all" || filterGov !== "all" || search) && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">فلاتر نشطة:</span>
                        {search && <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs px-2 py-0.5 rounded-full font-bold">"{search}"</span>}
                        {filterCat !== "all" && <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs px-2 py-0.5 rounded-full font-bold">{filterCat}</span>}
                        {filterSrc !== "all" && <span className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs px-2 py-0.5 rounded-full font-bold">{filterSrc === "csv" ? "CSV" : "يدوي"}</span>}
                        {filterStatus !== "all" && <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full font-bold">{filterStatus === "approved" ? "منشور" : "مراجعة"}</span>}
                        {filterGov !== "all" && <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full font-bold">{filterGov}</span>}
                        <button onClick={() => { setSearch(""); setFilterCat("all"); setFilterSrc("all"); setFilterStatus("all"); setFilterGov("all"); }}
                          className="text-xs text-red-500 hover:underline font-bold">مسح الكل</button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Results count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground font-bold">
                عرض <span className="text-primary dark:text-white font-black">{filtered.length}</span> من {properties.length} عقار
              </p>
            </div>

            {/* Loading */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-border overflow-hidden animate-pulse">
                    <div className="h-36 bg-muted" />
                    <div className="p-4 space-y-2">
                      <div className="h-5 bg-muted rounded w-2/3" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                      <div className="flex gap-2"><div className="h-6 bg-muted rounded w-16" /><div className="h-6 bg-muted rounded w-16" /></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-24 bg-white dark:bg-slate-800 rounded-2xl border border-border">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-3xl flex items-center justify-center mx-auto mb-5">
                  <Home className="w-10 h-10 text-muted-foreground opacity-40" />
                </div>
                <p className="text-xl font-black text-primary dark:text-white mb-2">
                  {properties.length === 0 ? "لم يتم إضافة أي عقارات بعد" : "لا توجد نتائج مطابقة"}
                </p>
                <p className="text-muted-foreground text-sm mb-6">
                  {properties.length === 0
                    ? "ابدأ بإضافة عقارات عبر رفع ملف CSV"
                    : "جرّب تعديل معايير البحث أو الفلاتر"}
                </p>
                {properties.length === 0 && (
                  <button onClick={() => navigate("/admin/csv")}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors">
                    <FileSpreadsheet className="w-5 h-5" /> رفع ملف CSV
                  </button>
                )}
              </motion.div>
            ) : viewMode === "grid" ? (
              /* Grid view */
              <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {filtered.map(p => (
                    <PropertyCard key={p.id} property={p} onDelete={handleDelete} onView={setSelectedProperty} isDeleting={isDeleting} />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              /* Table view */
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-border">
                      <tr>
                        {["العنوان","المحافظة","السعر","نوع","غرف","م²","المصدر","الحالة",""].map(h => (
                          <th key={h} className="px-4 py-3 text-start font-black text-muted-foreground text-xs whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <AnimatePresence>
                        {filtered.map(p => {
                          const src = sourceLabel(p);
                          return (
                            <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 font-medium text-primary dark:text-white max-w-[160px] truncate">{p.title}</td>
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-amber-500" />{govLabel(p.governorate)}</span>
                              </td>
                              <td className="px-4 py-3 font-black text-amber-600 dark:text-amber-400 whitespace-nowrap tabular-nums">
                                {Number(p.price).toLocaleString()}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                                  p.category === "إيجار" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                }`}>{p.category === "إيجار" ? "إيجار" : "بيع"}</span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{p.bedrooms || "—"}</td>
                              <td className="px-4 py-3 text-muted-foreground">{p.area || "—"}</td>
                              <td className="px-4 py-3">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white ${src === "csv" ? "bg-teal-500" : "bg-blue-500"}`}>
                                  {src === "csv" ? "CSV" : "يدوي"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  p.status === "approved" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                                }`}>
                                  {p.status === "approved" ? "✓ منشور" : "⏳ مراجعة"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  <button onClick={() => setSelectedProperty(p)}
                                    className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-muted-foreground hover:text-amber-600 transition-colors">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDelete(p.id)} disabled={isDeleting}
                                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-t border-border text-xs text-muted-foreground">
                  إجمالي: {filtered.length} عقار
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
