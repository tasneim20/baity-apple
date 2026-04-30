import { Link, useNavigate } from "react-router";
import { Home as HomeIcon, Search, Building2, Heart, Users, Shield, ChevronRight, MapPin, Bed, Bath, Maximize, Star, Phone, MessageSquare, TrendingUp, CheckCircle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "../context/AppContext";
import PropertyCard from "../components/PropertyCard";
import Chatbot from "../components/Chatbot";
import Navbar from "../components/Navbar";
import HeroBackground from "../components/HeroBackground";
import QuickSearch from "../components/QuickSearch";
import PropertiesMap from "../components/PropertiesMap";
import ScrollToTop from "../components/ScrollToTop";
import { useState, useEffect, useRef, useMemo } from "react";
import { governorateInfo } from "../data/governorateInfo";
import { governorates } from "../data/mockData";
import { normalizeGov, countForGov } from "../utils/governorateUtils";

// Animation variants
const fadeUpSlowVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1 },
  }),
};

const scaleInVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6 } },
};

// PageProgressBar component
function PageProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setProgress((scrolled / height) * 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-0 start-0 w-full h-1 bg-transparent z-[60]">
      <div
        className="h-full bg-gradient-to-r from-accent via-amber-500 to-amber-600 transition-all duration-100"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// StatCard component
function StatCard({ stat, index, language, inView }: any) {
  const [count, setCount] = useState(0);
  const targetValue = typeof stat.value === "number" ? stat.value : 0;

  useEffect(() => {
    if (!inView || typeof stat.value !== "number") return;
    let start = 0;
    const duration = 2000;
    const increment = targetValue / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= targetValue) {
        setCount(targetValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, targetValue, stat.value]);

  const displayValue = typeof stat.value === "number" ? count.toLocaleString() : stat.value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="relative group bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-800 dark:to-slate-900 p-6 rounded-2xl shadow-lg hover:shadow-2xl border border-border hover:border-accent/40 transition-all"
    >
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 bg-gradient-to-br from-accent/20 to-blue-500/20 group-hover:from-accent/30 group-hover:to-blue-500/30 rounded-xl flex items-center justify-center transition-all">
          <stat.icon className="w-7 h-7 text-accent" />
        </div>
        <div className="text-4xl font-black text-primary">{displayValue}</div>
        <p className="text-sm font-medium text-muted-foreground">
          {language === "ar" ? stat.labelAr : stat.labelEn}
        </p>
      </div>
    </motion.div>
  );
}

// GovernorateModal component
function GovernorateModal({ govId, onClose, navigate, language, properties }: any) {
  const gov = governorates.find((g) => g.id === govId);
  const info = governorateInfo[govId as keyof typeof governorateInfo];

  // Use normalizeGov for cross-language matching (Arabic ↔ English IDs)
  const govProperties = properties.filter((p: any) => {
    if (!p.governorate || !gov) return false;
    return normalizeGov(p.governorate) === gov.id;
  });

  if (!gov || !info) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-bold text-primary">
              {language === "ar" ? gov.name : gov.nameEn}
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center"
            >
              ✕
            </button>
          </div>
          <p className="text-muted-foreground">
            {language === "ar" ? info.description : info.descriptionEn}
          </p>
        </div>
        <div className="p-6">
          <p className="text-lg font-semibold text-primary mb-4">
            {govProperties.length} {language === "ar" ? "عقار متاح" : "available properties"}
          </p>
          <button
            onClick={() => {
              navigate(`/properties?governorate=${govId}`);
              onClose();
            }}
            className="w-full bg-gradient-to-r from-accent to-amber-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all"
          >
            {language === "ar" ? "عرض جميع العقارات" : "View All Properties"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// TestimonialsSection component
function TestimonialsSection({ testimonials, language }: any) {
  return (
    <section className="py-28 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold text-primary mb-4">
            {language === "ar" ? "آراء عملائنا" : "Customer Reviews"}
          </h2>
          <p className="text-lg text-muted-foreground">
            {language === "ar"
              ? "اكتشف تجارب عملائنا الناجحة معنا"
              : "Discover our customers' successful experiences with us"}
          </p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial: any, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-slate-800 dark:to-slate-900 p-8 rounded-2xl shadow-lg border border-border"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.stars }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {language === "ar" ? testimonial.textAr : testimonial.textEn}
              </p>
              <div>
                <p className="font-bold text-primary">
                  {language === "ar" ? testimonial.nameAr : testimonial.nameEn}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? testimonial.roleAr : testimonial.roleEn}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { language, t, properties, isLoadingProperties } = useApp();
  const ar = language === "ar";
  const [selectedGov, setSelectedGov] = useState<string | null>(null);

  // Set page title
  useEffect(() => {
    document.title = ar ? "بيتي - منصة العقارات الأردنية" : "Baity - Jordanian Real Estate Platform";
  }, [ar]);

  const statsRef = useRef<HTMLDivElement>(null);
  const [statsInView, setStatsInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsInView(true); },
      { threshold: 0.2, rootMargin: "0px 0px -80px 0px" }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const stats = useMemo(() => [
    {
      icon: HomeIcon,
      value: properties.length,
      labelAr: "عقار متاح",    labelEn: "Available Properties",
      tooltipAr: "عقارات مدرجة ومحدّثة",  tooltipEn: "Listed & verified properties",
    },
    {
      icon: MapPin,
      value: governorates.length,
      labelAr: "محافظة مغطاة", labelEn: "Governorates Covered",
      tooltipAr: "تغطية كاملة للأردن",     tooltipEn: "Full Jordan coverage",
    },
    {
      icon: Users,
      value: "12K+",
      labelAr: "مستخدم نشط",   labelEn: "Active Users",
      tooltipAr: "مستخدم مسجّل منذ 2022",  tooltipEn: "Registered since 2022",
    },
    {
      icon: Shield,
      value: "98%",
      labelAr: "رضا العملاء",  labelEn: "Customer Satisfaction",
      tooltipAr: "بناءً على 2000+ تقييم",  tooltipEn: "Based on 2000+ reviews",
    },
  ], [properties.length]);

  const testimonials = useMemo(() => [
    {
      nameAr: "أحمد الخالدي", nameEn: "Ahmad Al-Khalidi",
      roleAr: "مشتري عقار",   roleEn: "Property Buyer",
      textAr: "وجدت شقة أحلامي في عمان خلال أسبوع واحد فقط. المنصة سهلة الاستخدام والخيارات متنوعة جداً.",
      textEn: "Found my dream apartment in Amman within just one week. The platform is easy to use and has very diverse options.",
      stars: 5,
    },
    {
      nameAr: "سارة المجالي", nameEn: "Sara Al-Majali",
      roleAr: "مالكة عقار",   roleEn: "Property Owner",
      textAr: "أضفت عقاري مجاناً وحصلت على مستأجر خلال أيام. خدمة ممتازة وتواصل سريع.",
      textEn: "Listed my property for free and got a tenant within days. Excellent service and fast communication.",
      stars: 5,
    },
    {
      nameAr: "محمد الزعبي",   nameEn: "Mohammad Al-Za'bi",
      roleAr: "مستثمر عقاري", roleEn: "Real Estate Investor",
      textAr: "بيتي ساعدني في العثور على أفضل الفرص الاستثمارية في مناطق مختلفة من المملكة.",
      textEn: "Baity helped me find the best investment opportunities across different regions of the Kingdom.",
      stars: 5,
    },
  ], []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
      <PageProgressBar />
      <Navbar />

      <AnimatePresence>
        {selectedGov && (
          <GovernorateModal
            key={selectedGov}
            govId={selectedGov}
            onClose={() => setSelectedGov(null)}
            navigate={navigate}
            language={language}
            properties={properties}
          />
        )}
      </AnimatePresence>

      {/* ═══ 1. HERO ═══════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 sm:pt-32 pb-16">
        <HeroBackground />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 mb-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-border px-4 py-2 rounded-full shadow-sm"
            >
              <div className="flex gap-0.5">
                {["bg-black", "bg-[#ffffff] border border-slate-200 dark:border-slate-600", "bg-[#007A3D]", "bg-[#CE1126]"].map((c, i) => (
                  <span key={i} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
                ))}
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {language === "ar" ? "المملكة الأردنية الهاشمية" : "Hashemite Kingdom of Jordan"}
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-6xl md:text-7xl font-bold text-primary mb-8"
            >
              {t("heroTitle")}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-lg md:text-2xl text-muted-foreground mb-10"
            >
              {t("heroSubtitle")}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="flex justify-center mb-3"
          >
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm px-4 py-1.5 rounded-full border border-border">
              <Search className="w-3.5 h-3.5" />
              {language === "ar"
                ? "ابحث بالمنطقة، نوع العقار، أو السعر..."
                : "Search by area, property type, or price..."}
            </span>
          </motion.div>

          <div className="mb-20">
            <QuickSearch />
          </div>
        </div>
      </section>

      {/* ═══ 2. STATS ════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white dark:bg-slate-900 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, index) => (
              <StatCard key={index} stat={stat} index={index} language={language} inView={statsInView} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 2b. GOVERNORATES — clickable grid ═══════════════════════════════ */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-slate-950 dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-primary mb-4">
              {language === "ar" ? "تصفح حسب المحافظة" : "Browse by Governorate"}
            </h2>
            <p className="text-muted-foreground mb-3">
              {language === "ar"
                ? "اختر أي من المحافظات الأردنية الـ 12 لاستعراض عقاراتها المتاحة"
                : "Select any of Jordan's 12 governorates to browse available properties"}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-full">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="text-sm font-bold text-accent">
                {language === "ar"
                  ? `${governorates.length} محافظة — ${properties.length} عقار متاح`
                  : `${governorates.length} Governorates — ${properties.length} Available Properties`}
              </span>
            </div>
          </motion.div>

          {/* 12 Governorate Cards — 4 columns on md, 6 on lg */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {governorates.map((gov, index) => {
              // Improved property count with case-insensitive matching
              const govPropertyCount = countForGov(properties, gov.id);
              const hasProperties = govPropertyCount > 0;
              return (
                <motion.button
                  key={gov.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.04 }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/properties?governorate=${gov.id}`)}
                  className={`group relative rounded-2xl p-5 shadow-md hover:shadow-xl border transition-all text-center ${
                    hasProperties
                      ? "bg-white dark:bg-slate-800 border-border hover:border-accent/50"
                      : "bg-slate-50 dark:bg-slate-800/50 border-border/50 hover:border-accent/30"
                  }`}
                >
                  {/* Count badge */}
                  {hasProperties && (
                    <div className="absolute -top-2 -end-2 bg-accent text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                      {govPropertyCount}
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors ${
                    hasProperties
                      ? "bg-gradient-to-br from-accent/15 to-blue-500/15 group-hover:from-accent/25 group-hover:to-blue-500/25"
                      : "bg-muted"
                  }`}>
                    <MapPin className={`w-6 h-6 ${hasProperties ? "text-accent" : "text-muted-foreground"}`} />
                  </div>
                  <p className="font-bold text-primary dark:text-slate-100 text-sm leading-tight">
                    {language === "ar" ? gov.name : gov.nameEn}
                  </p>
                  <p className={`text-xs mt-1 font-medium ${hasProperties ? "text-accent" : "text-muted-foreground"}`}>
                    {govPropertyCount > 0
                      ? `${govPropertyCount} ${language === "ar" ? "عقار" : "prop" + (govPropertyCount === 1 ? "" : "s")}`
                      : (language === "ar" ? "لا عقارات" : "No props")}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ 3. PROPERTIES MAP ═══════════════════════════════════════════════ */}
      <section className="relative py-28 bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 border-y border-accent/10">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -end-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -start-40 w-80 h-80 bg-blue-400/5 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-gradient-to-r from-accent/10 to-blue-500/10 border border-accent/30 hover:border-accent/50 transition-all"
            >
              <span className="text-lg animate-bounce">🗺️</span>
              <span className="text-sm font-bold bg-gradient-to-r from-accent to-amber-600 bg-clip-text text-transparent">
                {language === "ar" ? "استكشاف تفاعلي" : "Interactive Exploration"}
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-primary mb-6 leading-tight">
                {language === "ar" ? (
                  <>عقارات على<br /><span className="bg-gradient-to-r from-accent via-amber-500 to-amber-600 bg-clip-text text-transparent">الخريطة</span></>
                ) : (
                  <>Properties on<br /><span className="bg-gradient-to-r from-accent via-amber-500 to-amber-600 bg-clip-text text-transparent">Map</span></>
                )}
              </h2>
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: 80 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="h-1 bg-gradient-to-r from-accent to-amber-600 rounded-full mx-auto mb-8"
              />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium"
            >
              {language === "ar"
                ? "استكشف موقع كل عقار على خريطة الأردن التفاعلية بسهولة وسرعة، اضغط على العلامات لعرض التفاصيل الكاملة"
                : "Explore the location of each property on the interactive Jordan Map effortlessly, click on markers to view complete details"}
            </motion.p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <PropertiesMap properties={properties} language={language} />
          </motion.div>
        </div>
      </section>

      {/* ═══ 4. FEATURED PROPERTIES ══════════════════════════════════════════ */}
      <section className="py-28 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUpSlowVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold text-primary mb-6">
              {language === "ar" ? "أحدث العقارات" : "Latest Properties"}
            </h2>
            <p className="text-lg text-muted-foreground">
              {language === "ar"
                ? "اكتشف أجمل العقارات المتاحة حديثاً في السوق"
                : "Discover the most beautiful properties recently available in the market"}
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {properties.slice(0, 4).map((property, index) => (
              <motion.div
                key={property.id}
                variants={fadeUpVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={index}
              >
                <PropertyCard property={property} index={index} />
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/properties")}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent-blue text-white px-12 py-5 rounded-2xl text-lg font-bold shadow-2xl hover:shadow-accent/50 transition-all"
            >
              <span>{language === "ar" ? "عرض جميع العقارات" : "View All Properties"}</span>
              <ArrowRight className="w-5 h-5 rtl:rotate-180" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ═══ 5. FEATURES ═════════════════════════════════════════════════════ */}
      <section className="py-28 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            variants={fadeUpSlowVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-5xl font-bold text-center text-primary mb-20"
          >
            {t("whyBaity")}
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: MapPin,     titleKey: "interactiveMaps",   descKey: "interactiveMapsDesc"   },
              { icon: TrendingUp, titleKey: "competitivePrices", descKey: "competitivePricesDesc" },
              { icon: Shield,     titleKey: "highReliability",   descKey: "highReliabilityDesc"   },
            ].map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeUpVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={index}
                whileHover={{ y: -10 }}
                className="bg-gradient-to-br from-muted to-white dark:from-slate-800 dark:to-slate-900 p-10 rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-border"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-accent to-accent-blue rounded-2xl flex items-center justify-center mb-8 mx-auto">
                  <feature.icon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-center text-primary mb-4">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-center text-muted-foreground leading-relaxed text-base">
                  {t(feature.descKey)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 6. TESTIMONIALS ═════════════════════════════════════════════════ */}
      <TestimonialsSection testimonials={testimonials} language={language} />

      {/* ═══ 7. CTA ══════════════════════════════════════════════════════════ */}
      <section className="relative py-28 overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-primary via-accent-blue to-primary dark:from-slate-800 dark:via-slate-800/90 dark:to-slate-900"
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          style={{ backgroundSize: "200% 200%" }}
        />
        <motion.div
          className="absolute top-10 start-10 w-32 h-32 rounded-full bg-white/10 dark:bg-white/5 blur-2xl"
          animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-10 end-10 w-40 h-40 rounded-full bg-accent/20 dark:bg-accent/10 blur-3xl"
          animate={{ y: [0, 20, 0], scale: [1, 0.9, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            variants={scaleInVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="dark:bg-slate-800/40 dark:backdrop-blur-md p-8 sm:p-12 rounded-3xl dark:border dark:border-slate-700/50 dark:shadow-lg"
          >
            <h2 className="text-5xl font-bold text-white mb-8">
              {t("havePropertyTitle")}
            </h2>
            <p className="text-lg text-white/90 dark:text-slate-200 mb-12">
              {t("havePropertyDesc")}
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/add-property")}
              className="bg-white text-slate-900 dark:bg-accent dark:text-slate-900 hover:bg-slate-50 dark:hover:bg-accent/90 px-12 py-5 rounded-2xl text-xl font-bold shadow-2xl dark:shadow-none transition-all"
            >
              {t("addPropertyFree")}
            </motion.button>
          </motion.div>
        </div>
      </section>

      <ScrollToTop />
    </div>
  );
}