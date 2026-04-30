import { motion, AnimatePresence } from "motion/react";
import { useParams, useNavigate } from "react-router";
import { useState, useEffect, useCallback } from "react";
import {
  ChevronRight, ChevronLeft, Bed, Bath, Maximize, MapPin,
  Share2, Heart, X, Eye, LogIn, Tag, Flag, Send,
} from "lucide-react";
import Navbar from "../components/Navbar";
import ScrollToTop from "../components/ScrollToTop";
import ContactSeller from "../components/ContactSeller";
import { useApp, getValidToken } from "../context/AppContext";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import SimilarProperties from "../components/SimilarProperties";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b`;

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='500' viewBox='0 0 800 500'%3E%3Crect width='800' height='500' fill='%23f1f5f9'/%3E%3Crect x='300' y='150' width='200' height='160' rx='12' fill='%23cbd5e1'/%3E%3Ccircle cx='350' cy='200' r='24' fill='%2394a3b8'/%3E%3Cpolygon points='300,310 400,210 500,310' fill='%2394a3b8'/%3E%3Ctext x='400' y='400' text-anchor='middle' fill='%2394a3b8' font-size='22' font-family='Arial'>لا توجد صورة%3C/text%3E%3C/svg%3E";

export default function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { properties, language, isAuthenticated } = useApp();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const ar = language === "ar";

  const property = properties.find((p: any) => p.id === id);
  const isSold = property?.availabilityStatus === "sold";

  // ─── Likes state
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likesLoading, setLikesLoading] = useState(false);
  const [showLoginHint, setShowLoginHint] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // ─── Views state
  const [viewsCount, setViewsCount] = useState(property?.views || 0);

  // ─── Report state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    if (property) {
      document.title = ar ? `بيتي - ${property.title}` : `Baity - ${property.title}`;
    } else {
      document.title = ar ? "بيتي - تفاصيل العقا��" : "Baity - Property Details";
    }
  }, [property, ar]);

  // ─── Fetch likes on mount
  const fetchLikes = useCallback(async () => {
    if (!id) return;
    try {
      const token = await getValidToken();
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${publicAnonKey}`,
        "Content-Type": "application/json",
      };
      if (token) headers["X-User-Token"] = token;
      const res = await fetch(`${API}/properties/${id}/likes`, { headers });
      const data = await res.json();
      if (data.success) {
        setLikesCount(data.data.count || 0);
        setIsLiked(data.data.isLiked || false);
      }
    } catch (e) {
      console.error("fetchLikes error:", e);
    }
  }, [id]);

  useEffect(() => { fetchLikes(); }, [fetchLikes]);

  // ─── Increment views on mount (local only - backend endpoint not available)
  useEffect(() => {
    if (!id || !property) return;
    // Increment view count locally for UI display
    setViewsCount((prev) => prev + 1);
  }, [id, property]);

  // ─── Toggle like
  const handleLike = async () => {
    if (!isAuthenticated) {
      setShowLoginHint(true);
      setTimeout(() => setShowLoginHint(false), 3000);
      return;
    }
    if (likesLoading) return;
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikesCount((prev) => (wasLiked ? Math.max(0, prev - 1) : prev + 1));
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 600);
    setLikesLoading(true);
    try {
      const token = await getValidToken();
      if (!token) { setIsLiked(wasLiked); setLikesCount((p) => wasLiked ? p + 1 : Math.max(0, p - 1)); return; }
      const res = await fetch(`${API}/properties/${id}/like`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${publicAnonKey}`, "X-User-Token": token, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) { setLikesCount(data.data.count); setIsLiked(data.data.isLiked); }
      else { setIsLiked(wasLiked); setLikesCount((p) => wasLiked ? p + 1 : Math.max(0, p - 1)); }
    } catch { setIsLiked(wasLiked); setLikesCount((p) => wasLiked ? p + 1 : Math.max(0, p - 1)); }
    finally { setLikesLoading(false); }
  };

  // ─── Share
  const handleShare = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: property?.title, url: window.location.href }); }
      else { await navigator.clipboard.writeText(window.location.href); setShareSuccess(true); setTimeout(() => setShareSuccess(false), 2500); }
    } catch { /* user cancelled */ }
  };

  // ─── Report
  const handleReport = async () => {
    if (!isAuthenticated) {
      setShowLoginHint(true);
      setTimeout(() => setShowLoginHint(false), 3000);
      return;
    }
    if (!reportReason) {
      alert(ar ? "يرجى اختيار سبب البلاغ" : "Please select a reason");
      return;
    }
    setReportLoading(true);
    try {
      const token = await getValidToken();
      if (!token) {
        setShowLoginHint(true);
        setTimeout(() => setShowLoginHint(false), 3000);
        return;
      }
      const res = await fetch(`${API}/reports`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${publicAnonKey}`,
          "X-User-Token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId: id,
          reason: reportReason,
          description: reportDescription,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReportSuccess(true);
        setShowReportModal(false);
        setReportReason("");
        setReportDescription("");
        setTimeout(() => setReportSuccess(false), 3000);
      } else {
        alert(data.error || (ar ? "حدث خطأ" : "An error occurred"));
      }
    } catch (e) {
      console.error("handleReport error:", e);
      alert(ar ? "حدث خطأ أثناء إرسال البلاغ" : "Error sending report");
    } finally {
      setReportLoading(false);
    }
  };

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-primary mb-4">العقار غير موجود</h2>
          <button onClick={() => navigate("/")} className="text-accent hover:underline">العودة للرئيسية</button>
        </div>
      </div>
    );
  }

  const images: string[] = (() => {
    const arr = Array.isArray(property?.images) && property.images.length > 0 ? property.images : property?.image ? [property.image] : [];
    return arr.length > 0 ? arr : [PLACEHOLDER];
  })();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F1419]">
      <Navbar />

      {/* Login hint toast */}
      <AnimatePresence>
        {showLoginHint && (
          <motion.div initial={{ opacity: 0, y: -80 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -80 }}
            className="fixed top-20 inset-x-0 z-[70] flex justify-center px-4">
            <div className="bg-[#131929] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3">
              <LogIn className="w-5 h-5 text-[#F5A623] shrink-0" />
              <span className="font-bold text-sm">{ar ? "سجّل دخولك للإعجاب بهذا العقار" : "Login to like this property"}</span>
              <button onClick={() => navigate("/auth")} className="ms-2 bg-[#F5A623] text-[#FFFFFF] px-3 py-1 rounded-lg text-xs font-black hover:bg-[#F5A623]/90 transition-colors">
                {ar ? "تسجيل الدخول" : "Login"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share success toast */}
      <AnimatePresence>
        {shareSuccess && (
          <motion.div initial={{ opacity: 0, y: -80 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -80 }}
            className="fixed top-20 inset-x-0 z-[70] flex justify-center px-4">
            <div className="bg-green-500 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-bold">
              <Share2 className="w-4 h-4" />
              {ar ? "✅ تم نسخ الرابط!" : "✅ Link copied!"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report success toast */}
      <AnimatePresence>
        {reportSuccess && (
          <motion.div initial={{ opacity: 0, y: -80 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -80 }}
            className="fixed top-20 inset-x-0 z-[70] flex justify-center px-4">
            <div className="bg-green-500 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-bold">
              <Flag className="w-4 h-4" />
              {ar ? "✅ تم إرسال البلاغ بنجاح!" : "✅ Report submitted successfully!"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-20">
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button onClick={() => navigate("/")} className="hover:text-accent">{ar ? "الرئيسية" : "Home"}</button>
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            <button onClick={() => navigate(`/governorate/${property.governorate}`)} className="hover:text-accent">
              {property.governorate}
            </button>
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            <span className="text-primary">{property.title}</span>
          </div>
        </div>

        {/* ─── SOLD BANNER (full width, below breadcrumb) */}
        {isSold && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
            <div className="bg-[#131929] dark:bg-[#131929] border-2 border-[#A0A8B8]/30 rounded-2xl px-5 py-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-red-900/30 rounded-xl flex items-center justify-center text-2xl shrink-0">🔴</div>
              <div>
                <p className="font-black text-[#E8EBF0] text-lg">{ar ? "هذا العقار تم بيعه" : "This Property Has Been Sold"}</p>
                <p className="text-[#A0A8B8] text-sm">{ar ? "لم يعد هذا العقار متاحاً — يُعرض للاطلاع فقط" : "This property is no longer available — shown for reference only"}</p>
              </div>
              <div className="ms-auto bg-[#0F1419]/50 border border-[#A0A8B8]/30 text-[#E8EBF0] px-4 py-2 rounded-xl text-sm font-black tracking-widest">
                {ar ? "مُباع" : "SOLD"}
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">

              {/* Image Gallery */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative">
                <div className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer group" onClick={() => setShowLightbox(true)}>
                  <motion.img
                    key={currentImageIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    src={images[currentImageIndex] || PLACEHOLDER}
                    alt={property.title}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isSold ? "grayscale-[25%] opacity-90" : ""}`}
                  />

                  {/* SOLD watermark on image */}
                  {isSold && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-black/60 backdrop-blur-[3px] text-white font-black text-3xl px-8 py-3 rounded-3xl rotate-[-10deg] shadow-2xl border-2 border-white/20 tracking-[0.2em] opacity-80">
                        {ar ? "تم البيع" : "SOLD"}
                      </div>
                    </div>
                  )}

                  {/* Navigation Arrows */}
                  {images.length > 1 && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => prev > 0 ? prev - 1 : images.length - 1); }}
                        className="absolute end-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors">
                        <ChevronRight className="w-6 h-6" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => prev < images.length - 1 ? prev + 1 : 0); }}
                        className="absolute start-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                    </>
                  )}

                  {/* Counter */}
                  <div className="absolute bottom-4 end-4 px-3 py-1 bg-black/70 text-white rounded-full text-sm">
                    {currentImageIndex + 1} / {images.length}
                  </div>

                  {/* Category / Sold badge */}
                  <div className={`absolute top-4 end-4 px-4 py-2 rounded-xl font-bold shadow-lg ${isSold ? "bg-[#131929] text-[#E8EBF0]" : "bg-[#F5A623] text-[#FFFFFF]"}`}>
                    {isSold ? (ar ? "🔴 مُباع" : "🔴 Sold") : property.category}
                  </div>

                  {/* Likes badge on image */}
                  {likesCount > 0 && (
                    <div className="absolute top-4 start-4 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-bold">
                      <Heart className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                      {likesCount}
                    </div>
                  )}
                </div>

                {/* Thumbnails */}
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {images.map((img, index) => (
                    <button key={index} onClick={() => setCurrentImageIndex(index)}
                      className={`aspect-video rounded-lg overflow-hidden border-2 transition-all ${currentImageIndex === index ? "border-accent scale-95" : "border-transparent hover:border-muted-foreground"}`}>
                      <img src={img || PLACEHOLDER} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Property Info Card */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-card dark:bg-[#131929] rounded-2xl p-6 shadow-lg border border-border dark:border-[#2A3348]">

                <div className="flex items-start justify-between mb-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-3xl font-bold text-primary dark:text-[#E8EBF0] mb-2">{property.title}</h1>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 text-muted-foreground dark:text-[#A0A8B8]">
                        <MapPin className="w-4 h-4 shrink-0 text-[#F5A623]" />
                        <span>{property.governorate}</span>
                      </div>
                      {/* Availability status badge */}
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
                        isSold
                          ? "bg-[#0F1419] dark:bg-[#0F1419] text-[#A0A8B8] dark:text-[#A0A8B8] border-[#A0A8B8]/30 dark:border-[#A0A8B8]/30"
                          : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700"
                      }`}>
                        <Tag className="w-3 h-3" />
                        {isSold ? (ar ? "🔴 تم البيع" : "🔴 Sold") : (ar ? "🟢 متاح" : "🟢 Available")}
                      </div>
                    </div>
                  </div>

                  {/* Like + Share + Report */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-center gap-1">
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={handleLike}
                        disabled={likesLoading}
                        className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm border-2 ${
                          isLiked
                            ? "bg-red-100 dark:bg-red-900/30 text-red-500 border-red-300 dark:border-red-700"
                            : "bg-muted dark:bg-[#131929] text-muted-foreground dark:text-[#A0A8B8] hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-400 border-transparent hover:border-red-200"
                        }`}
                        aria-label={ar ? "أعجبني" : "Like"}
                      >
                        <motion.div animate={likeAnimating ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.4 }}>
                          <Heart className={`w-5 h-5 transition-all ${isLiked ? "fill-[#F5A623] text-[#F5A623]" : ""}`} />
                        </motion.div>
                        {likeAnimating && isLiked && (
                          <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 2.5, opacity: 0 }}
                            transition={{ duration: 0.5 }} className="absolute inset-0 rounded-2xl bg-[#F5A623]/30" />
                        )}
                      </motion.button>
                      <motion.span key={likesCount} initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className={`text-xs font-black tabular-nums ${isLiked ? "text-[#F5A623]" : "text-muted-foreground dark:text-[#A0A8B8]"}`}>
                        {likesCount > 0 ? likesCount.toLocaleString() : (ar ? "إعجاب" : "Like")}
                      </motion.span>
                    </div>
                    <button onClick={handleShare}
                      className="w-12 h-12 rounded-2xl bg-muted dark:bg-[#131929] flex items-center justify-center hover:bg-[#F5A623]/10 hover:text-[#F5A623] text-muted-foreground dark:text-[#A0A8B8] transition-all border-2 border-transparent hover:border-[#F5A623]/20"
                      title={ar ? "مشاركة" : "Share"}>
                      <Share2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => setShowReportModal(true)}
                      className="w-12 h-12 rounded-2xl bg-muted dark:bg-[#131929] flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 text-muted-foreground dark:text-[#A0A8B8] transition-all border-2 border-transparent hover:border-red-200 dark:hover:border-red-800"
                      title={ar ? "الإبلاغ عن العقار" : "Report Property"}>
                      <Flag className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Price */}
                <div className={`text-4xl font-bold mb-6 ${isSold ? "text-muted-foreground dark:text-[#A0A8B8] line-through decoration-[#A0A8B8]/50" : "text-[#F5A623]"}`}>
                  {property.price.toLocaleString()}{" "}
                  {property.category === "إيجار" ? (ar ? "د.أ/شهر" : "JD/month") : (ar ? "د.أ" : "JD")}
                  {isSold && (
                    <span className="ms-3 text-base no-underline font-black text-slate-500 dark:text-[#A0A8B8]">
                      ({ar ? "تم البيع" : "Sold"})
                    </span>
                  )}
                </div>

                {/* Features grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { icon: Bed, label: ar ? "غرف النوم" : "Bedrooms", value: property.bedrooms || "-" },
                    { icon: Bath, label: ar ? "الحمامات" : "Bathrooms", value: property.bathrooms || "-" },
                    { icon: Maximize, label: ar ? "المساحة" : "Area", value: `${property.area} ${ar ? "م²" : "sqm"}` },
                    { icon: Eye, label: ar ? "المشاهدات" : "Views", value: viewsCount || 0 },
                  ].map((f) => (
                    <div key={f.label} className="bg-muted dark:bg-[#131929] rounded-xl p-4 text-center">
                      <f.icon className="w-6 h-6 mx-auto mb-2 text-[#F5A623]" />
                      <p className="text-sm text-muted-foreground dark:text-[#A0A8B8] mb-1">{f.label}</p>
                      <p className="font-bold text-primary dark:text-[#E8EBF0]">{f.value}</p>
                    </div>
                  ))}
                </div>

                {/* ─── Likes Stats Bar */}
                {(likesCount > 0 || isAuthenticated) && (
                  <div className="flex items-center gap-4 mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-[#F5A623]/10 dark:to-[#F5A623]/5 rounded-2xl border border-red-100 dark:border-[#F5A623]/20">
                    <div className="w-9 h-9 bg-red-100 dark:bg-[#F5A623]/20 rounded-xl flex items-center justify-center shrink-0">
                      <Heart className={`w-5 h-5 ${isLiked ? "fill-[#F5A623] text-[#F5A623]" : "text-[#F5A623]/70"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-primary dark:text-[#E8EBF0]">
                        {likesCount > 0
                          ? (ar ? `${likesCount.toLocaleString()} شخص أعجبه هذا العقار` : `${likesCount.toLocaleString()} people liked this`)
                          : (ar ? "كن أول من يُعجب بهذا العقار" : "Be the first to like this property")}
                      </p>
                      <p className="text-xs text-muted-foreground dark:text-[#A0A8B8]">
                        {isLiked ? (ar ? "أعجبك هذا العقار ✓" : "You liked this property ✓") : (ar ? "اضغط ❤ للإعجاب" : "Tap ❤ to like")}
                      </p>
                    </div>
                    {!isAuthenticated && (
                      <button onClick={() => navigate("/auth")}
                        className="ms-auto flex items-center gap-1.5 bg-[#F5A623] text-[#FFFFFF] px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-[#F5A623]/90 transition-colors">
                        <LogIn className="w-3.5 h-3.5" />
                        {ar ? "سجّل دخولك" : "Login"}
                      </button>
                    )}
                  </div>
                )}

                {/* Description */}
                <div>
                  <h3 className="text-xl font-bold text-primary dark:text-[#E8EBF0] mb-3">{ar ? "الوصف" : "Description"}</h3>
                  <p className="text-muted-foreground dark:text-[#A0A8B8] leading-relaxed">{property.description}</p>
                </div>
              </motion.div>

              {/* Location Map */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-card dark:bg-[#131929] rounded-2xl p-6 shadow-lg border border-border dark:border-[#2A3348]">
                <h3 className="text-xl font-bold text-primary dark:text-[#E8EBF0] mb-4">{ar ? "الموقع الجغرافي" : "Location"}</h3>
                {property.location?.lat && property.location?.lng ? (
                  <div className="space-y-3">
                    <div className="aspect-video rounded-xl overflow-hidden border border-border dark:border-[#A0A8B8]/30">
                      <iframe
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${property.location.lng - 0.05},${property.location.lat - 0.04},${property.location.lng + 0.05},${property.location.lat + 0.04}&layer=mapnik&marker=${property.location.lat},${property.location.lng}`}
                        className="w-full h-full" title={ar ? "موقع العقار" : "Property Location"} loading="lazy"
                        sandbox="allow-scripts allow-same-origin" />
                    </div>
                    <p className="text-xs text-muted-foreground dark:text-[#A0A8B8] text-center flex items-center justify-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#F5A623]" />
                      <span dir="ltr" className="font-mono">{property.location.lat.toFixed(5)}, {property.location.lng.toFixed(5)}</span>
                      <span className="text-border dark:text-[#A0A8B8]/30">|</span>
                      <span>{property.governorate}</span>
                    </p>
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-slate-100 to-blue-50 dark:from-[#0D1117] dark:to-[#131929] rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}
                        className="w-16 h-16 bg-gradient-to-br from-[#F5A623] to-orange-500 rounded-full flex items-center justify-center shadow-2xl mx-auto mb-3">
                        <MapPin className="w-8 h-8 text-[#FFFFFF]" />
                      </motion.div>
                      <p className="text-muted-foreground dark:text-[#A0A8B8] font-medium">{property.governorate}</p>
                      <p className="text-xs text-muted-foreground dark:text-[#A0A8B8] mt-1">{ar ? "الموقع التقريبي للعقار" : "Approximate property location"}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-1 space-y-4">

              {/* Contact / Sold notice */}
              {isSold ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="bg-slate-100 dark:bg-[#131929] border-2 border-dashed border-slate-300 dark:border-[#2A3348] rounded-2xl p-6 text-center shadow-sm">
                  <div className="text-5xl mb-4">🔴</div>
                  <h3 className="text-xl font-black text-slate-700 dark:text-[#E8EBF0] mb-2">
                    {ar ? "تم بيع هذا العقار" : "Property Sold"}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-[#A0A8B8] mb-4">
                    {ar ? "هذا العقار لم يعد متاحاً للتواصل أو الاستفسار" : "This property is no longer available for inquiries"}
                  </p>
                  <button
                    onClick={() => navigate("/properties")}
                    className="w-full bg-[#F5A623] text-[#FFFFFF] py-3 rounded-xl font-bold hover:bg-[#F5A623]/90 transition-colors"
                  >
                    {ar ? "🏠 تصفح عقارات أخرى" : "🏠 Browse Other Properties"}
                  </button>
                </motion.div>
              ) : (
                <ContactSeller property={property} />
              )}

              {/* Likes widget */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="bg-card dark:bg-[#131929] rounded-2xl p-5 shadow-lg border border-border dark:border-[#2A3348]">
                <h4 className="text-sm font-black text-primary dark:text-[#E8EBF0] mb-4 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-[#F5A623] fill-[#F5A623]" />
                  {ar ? "الإعجابات" : "Likes"}
                </h4>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-center">
                    <motion.p key={likesCount} initial={{ scale: 1.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className="text-4xl font-black text-primary dark:text-[#E8EBF0]">
                      {likesCount.toLocaleString()}
                    </motion.p>
                    <p className="text-xs text-muted-foreground dark:text-[#A0A8B8] mt-1">{ar ? "إعجاب" : "likes"}</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={handleLike}
                    disabled={likesLoading}
                    className={`flex flex-col items-center gap-2 px-6 py-4 rounded-2xl transition-all font-bold text-sm border-2 ${
                      isLiked
                        ? "bg-[#F5A623] text-[#FFFFFF] border-[#F5A623] shadow-lg shadow-[#F5A623]/20 dark:shadow-[#F5A623]/20"
                        : "bg-muted dark:bg-[#0F1419] text-muted-foreground dark:text-[#A0A8B8] border-border dark:border-[#A0A8B8]/30 hover:bg-[#F5A623]/10 hover:text-[#F5A623] hover:border-[#F5A623]/30"
                    }`}
                  >
                    <motion.div animate={likeAnimating ? { scale: [1, 1.5, 1], rotate: [0, -10, 10, 0] } : {}} transition={{ duration: 0.5 }}>
                      <Heart className={`w-7 h-7 ${isLiked ? "fill-[#FFFFFF] text-[#FFFFFF]" : ""}`} />
                    </motion.div>
                    <span className={isLiked ? "text-[#FFFFFF]" : ""}>{isLiked ? (ar ? "أعجبني ✓" : "Liked ✓") : (ar ? "أعجبني" : "Like")}</span>
                  </motion.button>
                </div>
                {!isAuthenticated && (
                  <p className="text-xs text-center text-muted-foreground bg-muted/60 rounded-xl px-3 py-2">
                    {ar ? "سجّل دخولك للإعجاب بهذا العقار" : "Login to like this property"}
                  </p>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Similar Properties ───────────────────────────────────────────── */}
      <SimilarProperties currentProperty={property} />

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowReportModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#131929] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-border dark:border-[#2A3348]">

              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border dark:border-[#2A3348] bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
                <div>
                  <h3 className="text-xl font-bold text-primary dark:text-[#E8EBF0] flex items-center gap-2">
                    <Flag className="w-6 h-6 text-red-500" />
                    {ar ? "الإبلاغ عن العقار" : "Report Property"}
                  </h3>
                  <p className="text-sm text-muted-foreground dark:text-[#A0A8B8] mt-1">
                    {ar ? "ساعدنا في تحسين المنصة" : "Help us improve the platform"}
                  </p>
                </div>
                <button onClick={() => setShowReportModal(false)}
                  className="p-2 rounded-xl hover:bg-muted dark:hover:bg-[#0F1419] transition-colors text-muted-foreground dark:text-[#A0A8B8]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-bold">
                    ⚠️ {ar ? "سيتم مراجعة البلاغ من قبل فريق الإدارة" : "Your report will be reviewed by our team"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-primary dark:text-[#E8EBF0] mb-2">
                    {ar ? "سبب البلاغ:" : "Reason for report:"}
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border dark:border-[#2A3348] bg-muted dark:bg-[#0F1419] text-primary dark:text-[#E8EBF0] focus:outline-none focus:ring-2 focus:ring-[#F5A623] transition-colors">
                    <option value="">{ar ? "اختر سبب البلاغ" : "Select a reason"}</option>
                    <option value="محتوى مزيف">{ar ? "محتوى مزيف" : "Fake content"}</option>
                    <option value="صور مضللة">{ar ? "صور مضللة" : "Misleading images"}</option>
                    <option value="سعر غير صحيح">{ar ? "سعر غير صحيح" : "Incorrect price"}</option>
                    <option value="معلومات خاطئة">{ar ? "معلومات خاطئة" : "Wrong information"}</option>
                    <option value="محتوى غير لائق">{ar ? "محتوى غير لائق" : "Inappropriate content"}</option>
                    <option value="احتيال">{ar ? "احتيال" : "Scam"}</option>
                    <option value="آخر">{ar ? "آخر" : "Other"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-primary dark:text-[#E8EBF0] mb-2">
                    {ar ? "تفاصيل إضافية (اختياري):" : "Additional details (optional):"}
                  </label>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder={ar ? "أضف أي تفاصيل إضافية هنا..." : "Add any additional details here..."}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border dark:border-[#2A3348] bg-muted dark:bg-[#0F1419] text-primary dark:text-[#E8EBF0] focus:outline-none focus:ring-2 focus:ring-[#F5A623] resize-none transition-colors"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleReport}
                    disabled={reportLoading || !reportReason}
                    className="flex-1 bg-[#F5A623] hover:bg-[#F5A623]/90 text-[#FFFFFF] py-3 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {reportLoading ? (
                      <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {ar ? "إرسال البلاغ" : "Submit Report"}
                  </button>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="px-6 py-3 rounded-xl border-2 border-border dark:border-[#2A3348] hover:bg-muted dark:hover:bg-[#0F1419] transition-colors font-bold text-primary dark:text-[#E8EBF0]">
                    {ar ? "إلغاء" : "Cancel"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      {showLightbox && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}>
          <button onClick={(e) => { e.stopPropagation(); setShowLightbox(false); }}
            className="absolute top-4 start-4 p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors text-white">
            <X className="w-6 h-6" />
          </button>
          <img src={images[currentImageIndex] || PLACEHOLDER} alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }}
            className="max-w-full max-h-full rounded-2xl"
            onClick={(e) => e.stopPropagation()} />
        </motion.div>
      )}

      <ScrollToTop />
    </div>
  );
}