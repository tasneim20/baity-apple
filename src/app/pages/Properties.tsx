import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Filter, Grid3x3, Map, Globe, SlidersHorizontal, X, Star, Flame, Building2, ChevronDown, Check } from "lucide-react";
import { governorates, propertyTypes } from "../data/mockData";
import { useApp } from "../context/AppContext";
import Navbar from "../components/Navbar";
import PropertyCard from "../components/PropertyCard";
import { Home, MapPin } from "lucide-react";
import PropertiesMap from "../components/PropertiesMap";
import { useSearchParams } from "react-router";
import { normalizeGov, sameGov, getPropertyDate } from "../utils/governorateUtils";

type ViewMode = "grid" | "map";

// ─── Normalize Arabic/English text for robust comparison ─────────────────────
// Strips tashkeel (diacritics) and normalises Unicode so variants like
// "عمّان" (with shadda) and "عمان" (without) compare as equal.
function normalizeText(text: string): string {
  return (text || "")
    .normalize("NFC")
    .replace(/[\u064B-\u065F\u0670]/g, "")  // remove Arabic diacritics
    .toLowerCase()
    .trim();
}

// Check if a property's governorate matches a selected governorate ID
// Uses normalizeGov() for Arabic↔English cross-matching
function govMatches(propertyGov: string, govObj: { id: string; name: string; nameEn: string }): boolean {
  if (!propertyGov) return false;
  // Primary: normalizeGov for canonical cross-language matching (amman ↔ عمان ↔ عمّان)
  const canonical = normalizeGov(propertyGov);
  if (canonical && canonical === govObj.id) return true;
  // Fallback: raw text normalization
  const pGov = normalizeText(propertyGov);
  return (
    pGov === normalizeText(govObj.id) ||
    pGov === normalizeText(govObj.name) ||
    pGov === normalizeText(govObj.nameEn)
  );
}

export default function Properties() {
  const { t, language, properties, isLoadingProperties } = useApp();
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [govDropdownOpen, setGovDropdownOpen] = useState(false);
  const govDropdownRef = useRef<HTMLDivElement>(null);

  // Set page title
  useEffect(() => {
    document.title = language === "ar" ? "بيتي - تصفح العقارات" : "Baity - Browse Properties";
  }, [language]);

  // Filter states — governorates is now a string[] for multi-select
  const [filters, setFilters] = useState({
    governorates: [] as string[],   // empty = all; stores gov IDs
    type: "all",
    category: "all",
    minPrice: "",
    maxPrice: "",
    bedrooms: "all",
  });

  // Close gov dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (govDropdownRef.current && !govDropdownRef.current.contains(e.target as Node)) {
        setGovDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Initialize filters from URL search params
  useEffect(() => {
    const governorateParam = searchParams.get("governorate");
    const typeParam        = searchParams.get("type");
    const categoryParam    = searchParams.get("category");
    const maxPriceParam    = searchParams.get("maxPrice");

    if (governorateParam || typeParam || categoryParam || maxPriceParam) {
      // Resolve governorate: QuickSearch now sends the gov ID directly,
      // but also support Arabic/English name lookups for backward compat.
      let govId: string | null = null;
      if (governorateParam && governorateParam !== "all") {
        const normParam = normalizeText(governorateParam);
        const found = governorates.find(g =>
          normalizeText(g.id)     === normParam ||
          normalizeText(g.name)   === normParam ||
          normalizeText(g.nameEn) === normParam
        );
        govId = found ? found.id : governorateParam; // fallback to raw param
      }

      setFilters(prev => ({
        ...prev,
        governorates: govId ? [govId] : [],
        type: typeParam || "all",
        category: (categoryParam && categoryParam !== "all" && categoryParam !== "الكل")
          ? categoryParam
          : "all",
        maxPrice: maxPriceParam || "",
      }));
    }
  }, [searchParams]);

  // Toggle a single governorate in the multi-select
  const toggleGovernorate = (govId: string) => {
    setFilters(prev => {
      const exists = prev.governorates.includes(govId);
      return {
        ...prev,
        governorates: exists
          ? prev.governorates.filter(g => g !== govId)
          : [...prev.governorates, govId],
      };
    });
  };

  // Filter properties
  const filteredProperties = useMemo(() => {
    let filtered = [...properties];

    // Sort by newest first — supports both camelCase (createdAt) and snake_case (created_at)
    filtered = filtered.sort((a: any, b: any) => {
      return getPropertyDate(b) - getPropertyDate(a);
    });

    // ── Governorate filter (multi-select, normalized) ──────────────────────
    if (filters.governorates.length > 0) {
      filtered = filtered.filter(p => {
        if (!p.governorate) return false;
        return filters.governorates.some(selectedId => {
          const govObj = governorates.find(g => g.id === selectedId);
          if (!govObj) {
            // Fallback: direct normalised compare
            return normalizeText(p.governorate) === normalizeText(selectedId);
          }
          return govMatches(p.governorate, govObj);
        });
      });
    }

    // ── Property Type filter (normalised) ──────────────────────────────────
    if (filters.type !== "all") {
      const normType = normalizeText(filters.type);
      filtered = filtered.filter(p => {
        if (!p.type) return false;
        // Also compare against typeId mapping (e.g. "شقة" ↔ "apartment")
        const typeObj = propertyTypes.find(t =>
          normalizeText(t.name)   === normType ||
          normalizeText(t.nameEn) === normType ||
          normalizeText(t.id)     === normType
        );
        const pNorm = normalizeText(p.type);
        if (typeObj) {
          return (
            pNorm === normalizeText(typeObj.name)   ||
            pNorm === normalizeText(typeObj.nameEn) ||
            pNorm === normalizeText(typeObj.id)
          );
        }
        return pNorm === normType;
      });
    }

    // ── Category filter (normalised) ───────────────────────────────────────
    if (filters.category !== "all") {
      const normCat = normalizeText(filters.category);
      filtered = filtered.filter(p => {
        if (!p.category) return false;
        const pCat = normalizeText(p.category);
        // Handle Arabic "بيع"/"إيجار" and English "sale"/"rent"
        const isSale = normCat === normalizeText("بيع")    || normCat === "sale";
        const isRent = normCat === normalizeText("إيجار")  || normCat === "rent";
        if (isSale) return pCat === normalizeText("بيع")   || pCat === "sale"   || pCat === "for sale";
        if (isRent) return pCat === normalizeText("إيجار") || pCat === "rent"   || pCat === "for rent";
        return pCat === normCat;
      });
    }

    // ── Price filters ──────────────────────────────────────────────────────
    if (filters.minPrice) {
      const minPrice = Number(filters.minPrice);
      if (!isNaN(minPrice) && minPrice > 0) {
        filtered = filtered.filter(p => {
          const price = Number(p.price);
          return !isNaN(price) && price >= minPrice;
        });
      }
    }
    if (filters.maxPrice) {
      const maxPrice = Number(filters.maxPrice);
      if (!isNaN(maxPrice) && maxPrice > 0) {
        filtered = filtered.filter(p => {
          const price = Number(p.price);
          return !isNaN(price) && price <= maxPrice;
        });
      }
    }

    // ── Bedrooms filter ────────────────────────────────────────────────────
    if (filters.bedrooms !== "all") {
      const bedroomCount = Number(filters.bedrooms);
      filtered = filtered.filter(p => {
        if (isNaN(bedroomCount)) return true;
        const propBedrooms = Number(p.bedrooms);
        if (isNaN(propBedrooms)) return false;
        if (filters.bedrooms === "5") return propBedrooms >= 5;
        return propBedrooms === bedroomCount;
      });
    }

    return filtered;
  }, [filters, properties]);

  // Featured/Sponsored properties
  const featuredProperties = useMemo(() => {
    return properties.filter(p => p.featured === true && (p.status === "approved" || p.status === "active"));
  }, [properties]);

  const resetFilters = () => {
    setFilters({
      governorates: [],
      type: "all",
      category: "all",
      minPrice: "",
      maxPrice: "",
      bedrooms: "all",
    });
  };

  const activeFiltersCount = [
    filters.governorates.length > 0 ? 1 : 0,
    filters.type !== "all" ? 1 : 0,
    filters.category !== "all" ? 1 : 0,
    filters.minPrice ? 1 : 0,
    filters.maxPrice ? 1 : 0,
    filters.bedrooms !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Label for governorate button
  const govLabel = () => {
    if (filters.governorates.length === 0) return language === "ar" ? "الكل" : "All";
    if (filters.governorates.length === 1) {
      const gov = governorates.find(g => g.id === filters.governorates[0]);
      return gov ? (language === "ar" ? gov.name : gov.nameEn) : filters.governorates[0];
    }
    return language === "ar" ? `${filters.governorates.length} محافظات` : `${filters.governorates.length} Govs`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted via-white to-muted/50 dark:from-[#0D1117] dark:via-[#0D1117] dark:to-[#0D1117]">
      <Navbar />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              {language === "ar" ? "تصفح العقارات" : "Browse Properties"}
            </h1>
            <p className="text-lg text-muted-foreground">
              {language === "ar"
                ? `${filteredProperties.length} عقار متاح`
                : `${filteredProperties.length} properties available`}
            </p>
          </motion.div>

          {/* Controls Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#131929] rounded-2xl shadow-lg p-4 mb-6 flex flex-wrap gap-4 items-center justify-between"
          >
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-[#F5A623] text-[#FFFFFF] rounded-xl hover:bg-[#D4901E] transition-all relative"
            >
              <SlidersHorizontal className="w-5 h-5" />
              {t("filters")}
              {activeFiltersCount > 0 && (
                <span className="absolute -top-2 -end-2 bg-[#F5A623] text-[#FFFFFF] text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* View Mode Toggles */}
            <div className="flex gap-2 bg-muted rounded-xl p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${viewMode === "grid" ? "bg-white text-primary shadow-md" : "text-muted-foreground hover:text-primary"}`}
              >
                <Grid3x3 className="w-4 h-4" />
                <span className="hidden md:inline">{language === "ar" ? "عرض العقارات" : "Properties View"}</span>
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${viewMode === "map" ? "bg-white text-primary shadow-md" : "text-muted-foreground hover:text-primary"}`}
              >
                <Map className="w-4 h-4" />
                <span className="hidden md:inline">{t("map")}</span>
              </button>
            </div>

            {activeFiltersCount > 0 && (
              <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={resetFilters} className="text-sm text-muted-foreground hover:text-primary transition-colors underline">
                {t("resetFilters")}
              </motion.button>
            )}
          </motion.div>

          {/* ── شريط اختيار المحافظات السريع — دائماً مرئي ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white dark:bg-[#131929] rounded-2xl shadow-md px-4 py-3 mb-4 border border-border dark:border-[#2A3348]"
          >
            <div className="flex items-center gap-2 mb-2.5">
              <MapPin className="w-4 h-4 text-[#F5A623] flex-shrink-0" />
              <span className="text-sm font-bold text-primary dark:text-[#E8EBF0]">
                {language === "ar" ? "تصفح حسب المحافظة" : "Filter by Governorate"}
              </span>
              {filters.governorates.length > 0 && (
                <span className="ms-1 text-xs bg-[#F5A623] text-[#FFFFFF] px-2 py-0.5 rounded-full font-bold">
                  {filters.governorates.length}
                </span>
              )}
              {filters.governorates.length > 0 && (
                <button
                  onClick={() => setFilters(prev => ({ ...prev, governorates: [] }))}
                  className="ms-auto text-xs text-red-400 hover:text-red-600 font-semibold transition-colors"
                >
                  {language === "ar" ? "مسح الكل ×" : "Clear all ×"}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {/* زر "الكل" */}
              <button
                onClick={() => setFilters(prev => ({ ...prev, governorates: [] }))}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                  filters.governorates.length === 0
                    ? "bg-[#F5A623] border-[#F5A623] text-[#FFFFFF] shadow-sm shadow-[#F5A623]/30"
                    : "border-border text-muted-foreground dark:text-[#A0A8B8] hover:border-[#F5A623]/60 hover:text-[#F5A623]"
                }`}
              >
                {language === "ar" ? "🗺️ الكل" : "🗺️ All"}
              </button>
              {governorates.map((gov) => {
                const isSelected = filters.governorates.includes(gov.id);
                const count = properties.filter(p => govMatches(p.governorate || "", gov)).length;
                return (
                  <button
                    key={gov.id}
                    onClick={() => toggleGovernorate(gov.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                      isSelected
                        ? "bg-[#F5A623]/10 border-[#F5A623] text-[#F5A623] shadow-sm"
                        : "border-border text-muted-foreground dark:text-[#A0A8B8] hover:border-[#F5A623]/60 hover:text-[#F5A623]"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 flex-shrink-0" />}
                    {language === "ar" ? gov.name : gov.nameEn}
                    {count > 0 && (
                      <span className={`text-[10px] font-bold px-1 rounded-full ${
                        isSelected ? "bg-[#F5A623] text-[#FFFFFF]" : "bg-muted dark:bg-[#131929] text-muted-foreground dark:text-[#A0A8B8]"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 opacity-60">
              {language === "ar"
                ? "💡 يمكنك اختيار أكثر من محافظة في نفس الوقت"
                : "💡 You can select multiple governorates at once"}
            </p>
          </motion.div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white dark:bg-[#131929] rounded-2xl shadow-lg p-6 mb-6 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-primary dark:text-[#E8EBF0] flex items-center gap-2">
                    <Filter className="w-5 h-5 text-[#F5A623]" />
                    {t("filters")}
                  </h3>
                  <button onClick={() => setShowFilters(false)} className="text-muted-foreground dark:text-[#A0A8B8] hover:text-[#F5A623] transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                  {/* ── Multi-select Governorate ─── */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-bold text-primary dark:text-[#E8EBF0] mb-3">
                      {t("governorate")}
                      {filters.governorates.length > 0 && (
                        <span className="ms-2 text-xs bg-[#F5A623]/15 text-[#F5A623] px-2 py-0.5 rounded-full font-semibold">
                          {filters.governorates.length} {language === "ar" ? "محافظة محددة" : "selected"}
                        </span>
                      )}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {/* "All" button */}
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, governorates: [] }))}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                          filters.governorates.length === 0
                            ? "border-[#F5A623] bg-[#F5A623] text-[#FFFFFF] shadow-md shadow-[#F5A623]/20"
                            : "border-border dark:border-[#A0A8B8]/30 bg-muted/30 dark:bg-[#0F1419]/40 text-muted-foreground dark:text-[#A0A8B8] hover:border-[#F5A623]/50 hover:text-[#F5A623]"
                        }`}
                      >
                        {language === "ar" ? "الكل" : "All"}
                      </button>
                      {governorates.map((gov) => {
                        const isSelected = filters.governorates.includes(gov.id);
                        const count = properties.filter(p => govMatches(p.governorate || "", gov)).length;
                        return (
                          <button
                            key={gov.id}
                            onClick={() => toggleGovernorate(gov.id)}
                            className={`relative flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl border-2 text-sm transition-all ${
                              isSelected
                                ? "border-[#F5A623] bg-[#F5A623]/10 text-[#F5A623] font-bold shadow-sm"
                                : "border-border dark:border-[#A0A8B8]/30 bg-muted/30 dark:bg-[#0F1419]/40 text-muted-foreground dark:text-[#A0A8B8] hover:border-[#F5A623]/50 hover:text-[#F5A623]"
                            }`}
                          >
                            {isSelected && (
                              <span className="absolute top-1 end-1 w-4 h-4 bg-[#F5A623] rounded-full flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-[#FFFFFF]" />
                              </span>
                            )}
                            <span className="font-semibold text-xs leading-tight text-center">
                              {language === "ar" ? gov.name : gov.nameEn}
                            </span>
                            <span className={`text-[10px] font-medium ${isSelected ? "text-[#F5A623]" : "text-muted-foreground/70 dark:text-[#A0A8B8]/70"}`}>
                              {count} {language === "ar" ? "عقار" : "prop"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Property Type */}
                  <div>
                    <label className="block text-sm font-bold text-primary dark:text-[#E8EBF0] mb-2">{t("propertyType")}</label>
                    <select
                      value={filters.type}
                      onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                      className="w-full px-4 py-3 bg-muted dark:bg-[#1A2035] dark:text-[#C8D0E0] rounded-xl border-0 focus:ring-2 focus:ring-[#F5A623]"
                    >
                      <option value="all">{t("all")}</option>
                      {propertyTypes.slice(1).map((type, index) => (
                        <option key={`${type.id}-${index}`} value={type.name}>
                          {language === "ar" ? type.name : type.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-bold text-primary dark:text-[#E8EBF0] mb-2">{t("operationType")}</label>
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                      className="w-full px-4 py-3 bg-muted dark:bg-[#1A2035] dark:text-[#C8D0E0] rounded-xl border-0 focus:ring-2 focus:ring-[#F5A623]"
                    >
                      <option value="all">{t("all")}</option>
                      <option value="بيع">{t("sale")}</option>
                      <option value="إيجار">{t("rent")}</option>
                    </select>
                  </div>

                  {/* Bedrooms */}
                  <div>
                    <label className="block text-sm font-bold text-primary dark:text-[#E8EBF0] mb-2">{t("bedrooms")}</label>
                    <select
                      value={filters.bedrooms}
                      onChange={(e) => setFilters({ ...filters, bedrooms: e.target.value })}
                      className="w-full px-4 py-3 bg-muted dark:bg-[#1A2035] dark:text-[#C8D0E0] rounded-xl border-0 focus:ring-2 focus:ring-[#F5A623]"
                    >
                      <option value="all">{t("all")}</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5+</option>
                    </select>
                  </div>

                  {/* Min Price */}
                  <div>
                    <label className="block text-sm font-bold text-primary dark:text-[#E8EBF0] mb-2">{t("from")} ({t("jd")})</label>
                    <input
                      type="number"
                      value={filters.minPrice}
                      onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-3 bg-muted dark:bg-[#1A2332] dark:text-[#E8EBF0] rounded-xl border-0 focus:ring-2 focus:ring-[#F5A623]"
                    />
                  </div>

                  {/* Max Price */}
                  <div>
                    <label className="block text-sm font-bold text-primary dark:text-[#E8EBF0] mb-2">{t("to")} ({t("jd")})</label>
                    <input
                      type="number"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                      placeholder="1000000"
                      className="w-full px-4 py-3 bg-muted dark:bg-[#1A2332] dark:text-[#E8EBF0] rounded-xl border-0 focus:ring-2 focus:ring-[#F5A623]"
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => setShowFilters(false)}
                    className="flex-1 bg-[#F5A623] text-[#000000] py-3 rounded-xl font-bold hover:bg-[#D4901E] transition-all"
                  >
                    {t("applyFilters")}
                  </button>
                  <button
                    onClick={resetFilters}
                    className="px-6 py-3 bg-muted text-primary rounded-xl font-bold hover:bg-muted/80 transition-all"
                  >
                    {t("resetFilters")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active governorate tags */}
          <AnimatePresence>
            {filters.governorates.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2 mb-4"
              >
                {filters.governorates.map(govId => {
                  const gov = governorates.find(g => g.id === govId);
                  return (
                    <motion.span
                      key={govId}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border border-accent/30 text-accent rounded-full text-sm font-semibold"
                    >
                      📍 {gov ? (language === "ar" ? gov.name : gov.nameEn) : govId}
                      <button
                        onClick={() => toggleGovernorate(govId)}
                        className="w-4 h-4 rounded-full bg-accent/20 hover:bg-accent/40 flex items-center justify-center transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </motion.span>
                  );
                })}
                {filters.governorates.length > 1 && (
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, governorates: [] }))}
                    className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-500 rounded-full text-xs font-semibold hover:bg-red-100 transition-colors"
                  >
                    {language === "ar" ? "مسح الكل" : "Clear all"}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Featured/Sponsored Properties Section - Always Visible */}
          {featuredProperties.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center">
                    <motion.div
                      animate={{
                        rotate: [0, 360],
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <Star className="w-5 h-5 text-white fill-white" />
                    </motion.div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-primary">
                      {language === "ar" ? "إعلانات مميزة" : "Featured Ads"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {language === "ar" 
                        ? "عقارات مدفوعة تظهر دائماً في المقدمة" 
                        : "Sponsored properties always shown first"}
                    </p>
                  </div>
                </div>
                <div className="hidden md:block px-4 py-2 bg-amber-50 border-2 border-amber-200 rounded-xl">
                  <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" />
                      {language === "ar" ? "إعلان ممول" : "Sponsored"}
                    </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {featuredProperties.map((property, index) => (
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    {/* Featured Badge */}
                    <div className="absolute top-4 end-4 z-10 bg-gradient-to-r from-amber-400 to-amber-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                      <motion.span
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex"
                      >
                        <Star className="w-3.5 h-3.5 fill-white" />
                      </motion.span>
                      {language === "ar" ? "مميز" : "Featured"}
                    </div>
                    <PropertyCard property={property} index={index} />
                  </motion.div>
                ))}
              </div>

              {/* Separator */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                <span className="text-sm font-bold text-muted-foreground px-4 py-2 bg-muted rounded-full">
                  {language === "ar" ? "جميع العقارات" : "All Properties"}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>
            </motion.div>
          )}

          {/* Properties Grid */}
          {viewMode === "grid" && (
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <AnimatePresence>
                {isLoadingProperties ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-full text-center py-20"
                  >
                    <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
                    </div>
                    <h3 className="text-2xl font-bold text-primary mb-2">
                      {language === "ar" ? "جاري التحميل..." : "Loading..."}
                    </h3>
                    <p className="text-muted-foreground">
                      {language === "ar" ? "يرجى الانتظار قليلاً" : "Please wait a moment"}
                    </p>
                  </motion.div>
                ) : filteredProperties.length > 0 ? (
                  filteredProperties.map((property, index) => (
                    <PropertyCard key={property.id} property={property} index={index} />
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-full text-center py-20"
                  >
                    <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Building2 className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold text-primary mb-2">
                      {t("noProperties")}
                    </h3>
                    <p className="text-muted-foreground">{t("tryAdjustFilters")}</p>
                    {/* رسالة تشخيصية إضافية */}
                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl max-w-md mx-auto">
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        {language === "ar"
                          ? `إجمالي العقارات المحملة: ${properties.length} | العقارات بعد الفلترة: ${filteredProperties.length}`
                          : `Total properties: ${properties.length} | Filtered: ${filteredProperties.length}`}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                        {language === "ar"
                          ? "افتح Console للمزيد من التفاصيل (F12)"
                          : "Open Console for more details (F12)"}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Map View Placeholder */}
          {viewMode === "map" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}>
              <PropertiesMap
                properties={filteredProperties}
                language={language}
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}