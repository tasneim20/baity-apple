import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  Plus, Loader2, AlertCircle, LogIn, CheckCircle,
  Eye, Tag, TrendingUp, Clock, RefreshCw,
} from "lucide-react";
import { useApp, getValidToken } from "../context/AppContext";
import Navbar from "../components/Navbar";
import OwnerPropertyCard from "../components/OwnerPropertyCard";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b`;

export default function MyProperties() {
  const { t, language, isAuthenticated } = useApp();
  const navigate = useNavigate();
  const ar = language === "ar";

  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading]   = useState(true);

  useEffect(() => {
    document.title = ar ? "بيتي - عقاراتي" : "Baity - My Properties";
  }, [language]);

  /* ── Fetch ─────────────────────────────────────────────── */
  const fetchMyProperties = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const token = await getValidToken();
      if (!token) return;
      const res  = await fetch(`${API}/my-properties`, {
        headers: { Authorization: `Bearer ${publicAnonKey}`, "X-User-Token": token },
      });
      const data = await res.json();
      if (data.success) setProperties(data.data ?? []);
      else console.error("my-properties error:", data);
    } catch (e) {
      console.error("fetchMyProperties:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMyProperties(); }, [isAuthenticated]);

  /* ── Callbacks for child cards ──────────────────────────── */
  const handleUpdated = (updated: any) =>
    setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));

  const handleDeleted = (id: string) =>
    setProperties(prev => prev.filter(p => p.id !== id));

  /* ── Not logged in ─────────────────────────────────────── */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background dark:bg-slate-950">
        <Navbar />
        <div className="pt-24 flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md mx-auto px-4">
            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-primary mb-2">{ar ? "يجب تسجيل الدخول" : "Login Required"}</h2>
            <p className="text-muted-foreground mb-6">{ar ? "سجل دخولك لإدارة عقاراتك" : "Please login to manage your properties"}</p>
            <button onClick={() => navigate("/auth")}
              className="inline-flex items-center gap-2 bg-accent text-white px-8 py-3 rounded-xl font-bold hover:bg-accent/90 transition-colors">
              <LogIn className="w-5 h-5" /> {ar ? "تسجيل الدخول" : "Login"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const approvedCount = properties.filter(p => p.status === "approved" || p.status === "active").length;
  const pendingCount  = properties.filter(p => p.status === "pending").length;
  const soldCount     = properties.filter(p => p.availabilityStatus === "sold").length;
  const totalViews    = properties.reduce((s, p) => s + (p.views || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <Navbar />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">

          {/* ── Header */}
          <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-primary dark:text-slate-100 mb-1">
                {ar ? "عقاراتي" : "My Properties"}
              </h1>
              <p className="text-lg text-muted-foreground">
                {ar ? `لديك ${properties.length} عقار مسجّل` : `You have ${properties.length} listed`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={fetchMyProperties} disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-border rounded-xl hover:shadow-md transition-all text-sm font-bold">
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                {ar ? "تحديث" : "Refresh"}
              </button>
              <Link to="/add-property"
                className="flex items-center gap-2 bg-gradient-to-r from-accent to-amber-500 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:scale-105 transition-all shadow-md font-bold">
                <Plus className="w-5 h-5" />
                <span className="hidden md:inline">{ar ? "إضافة عقار" : "Add Property"}</span>
              </Link>
            </div>
          </div>

          {/* ── Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {([
              { label: ar ? "إجمالي المشاهدات" : "Total Views",  value: totalViews.toLocaleString(), Icon: Eye,         color: "text-accent",    bg: "bg-accent/10"    },
              { label: ar ? "منشور"             : "Published",    value: approvedCount,               Icon: TrendingUp,  color: "text-green-500", bg: "bg-green-500/10" },
              { label: ar ? "قيد المراجعة"      : "Pending",      value: pendingCount,                Icon: Clock,       color: "text-amber-500", bg: "bg-amber-500/10" },
              { label: ar ? "تم البيع"           : "Sold",         value: soldCount,                   Icon: Tag,         color: "text-slate-500", bg: "bg-slate-500/10" },
            ] as const).map(s => (
              <div key={s.label} className="bg-card dark:bg-slate-800 rounded-2xl p-5 shadow-lg border border-border dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                    <s.Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-xl font-bold text-primary dark:text-slate-100">{s.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Grid */}
          {isLoading ? (
            <div className="bg-card dark:bg-slate-800 rounded-2xl p-12 text-center border border-border">
              <div className="w-14 h-14 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xl font-bold text-primary dark:text-slate-100">{ar ? "جارٍ التحميل..." : "Loading..."}</p>
            </div>
          ) : properties.length === 0 ? (
            <div className="bg-card dark:bg-slate-800 rounded-2xl p-12 text-center border border-border">
              <div className="text-6xl mb-4">🏠</div>
              <h3 className="text-2xl font-bold text-primary dark:text-slate-100 mb-2">{ar ? "لا توجد عقارات بعد" : "No Properties Yet"}</h3>
              <p className="text-muted-foreground mb-6">{ar ? "ابدأ بإضافة عقارك الأول" : "Start by adding your first property"}</p>
              <Link to="/add-property" className="inline-flex items-center gap-2 bg-accent text-white px-8 py-3 rounded-xl font-bold hover:bg-accent/90 transition-colors">
                <Plus className="w-5 h-5" /> {ar ? "أضف عقارك الأول" : "Add Your First Property"}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property, index) => (
                <OwnerPropertyCard
                  key={property.id}
                  property={property}
                  index={index}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                />
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
