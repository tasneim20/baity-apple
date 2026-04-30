import { useMemo, useRef } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { MapPin, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, Sparkles, Bed, Bath, Maximize } from "lucide-react";
import { useApp } from "../context/AppContext";
import { sameGov, normalizeGov, getPropertyDate } from "../utils/governorateUtils";

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'%3E%3Crect width='400' height='260' fill='%23f1f5f9'/%3E%3Crect x='150' y='80' width='100' height='70' rx='6' fill='%23cbd5e1'/%3E%3Ccircle cx='175' cy='100' r='10' fill='%2394a3b8'/%3E%3Cpolygon points='150,150 200,110 250,150' fill='%2394a3b8'/%3E%3Ctext x='200' y='200' text-anchor='middle' fill='%2394a3b8' font-size='12' font-family='Arial'>لا توجد صورة%3C/text%3E%3C/svg%3E";

const GOV_NAMES: Record<string, { ar: string; en: string }> = {
  amman:   { ar: "عمّان",    en: "Amman"   },
  zarqa:   { ar: "الزرقاء", en: "Zarqa"   },
  irbid:   { ar: "إربد",    en: "Irbid"   },
  aqaba:   { ar: "العقبة",  en: "Aqaba"   },
  mafraq:  { ar: "المفرق",  en: "Mafraq"  },
  balqa:   { ar: "البلقاء", en: "Balqa"   },
  karak:   { ar: "الكرك",   en: "Karak"   },
  madaba:  { ar: "مأدبا",   en: "Madaba"  },
  jerash:  { ar: "جرش",     en: "Jerash"  },
  ajloun:  { ar: "عجلون",   en: "Ajloun"  },
  maan:    { ar: "معان",    en: "Ma'an"   },
  tafilah: { ar: "الطفيلة", en: "Tafilah" },
};

interface Props {
  currentProperty: any;
}

export default function SimilarProperties({ currentProperty }: Props) {
  const navigate = useNavigate();
  const { properties, language } = useApp();
  const ar = language === "ar";
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Compute similar properties ────────────────────────────────────────────
  const similar = useMemo(() => {
    if (!currentProperty) return [];

    // Primary: same governorate (normalized, supports Arabic↔English) + same category (sale/rent)
    let candidates = properties.filter(
      (p: any) =>
        p.id !== currentProperty.id &&
        sameGov(p.governorate, currentProperty.governorate) &&
        p.category === currentProperty.category &&
        p.availabilityStatus !== "sold",
    );

    // If fewer than 4, loosen to same category only
    if (candidates.length < 4) {
      const extra = properties.filter(
        (p: any) =>
          p.id !== currentProperty.id &&
          !sameGov(p.governorate, currentProperty.governorate) &&
          p.category === currentProperty.category &&
          p.availabilityStatus !== "sold",
      );
      candidates = [...candidates, ...extra];
    }

    // Sort by newest first — supports both camelCase (createdAt) and snake_case (created_at)
    return candidates
      .sort((a: any, b: any) => getPropertyDate(b) - getPropertyDate(a))
      .slice(0, 6);
  }, [properties, currentProperty]);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (!similar.length) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-[#F5A623]" />
            <span className="text-[#F5A623] text-xs font-black uppercase tracking-widest">
              {ar ? "اقتراحات ذكية" : "Smart Suggestions"}
            </span>
          </div>
          <h2 className="text-2xl font-black text-primary dark:text-[#E8EBF0]">
            {ar ? "عقارات مشابهة" : "Similar Properties"}
          </h2>
          <p className="text-sm text-muted-foreground dark:text-[#A0A8B8] mt-0.5">
            {ar
              ? `${similar.length} عقار في نفس المنطقة ونوع العملية`
              : `${similar.length} properties in the same area & type`}
          </p>
        </div>

        {/* Scroll buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll(ar ? "right" : "left")}
            className="w-10 h-10 rounded-xl bg-white dark:bg-[#131929] border border-border dark:border-[#2A3348] flex items-center justify-center hover:bg-[#F5A623]/10 hover:border-[#F5A623]/40 hover:text-[#F5A623] transition-all shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll(ar ? "left" : "right")}
            className="w-10 h-10 rounded-xl bg-white dark:bg-[#131929] border border-border dark:border-[#2A3348] flex items-center justify-center hover:bg-[#F5A623]/10 hover:border-[#F5A623]/40 hover:text-[#F5A623] transition-all shadow-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </motion.div>

      {/* Horizontal scroll container */}
      <div className="relative">
        {/* Left fade */}
        <div className="absolute start-0 top-0 bottom-0 w-8 bg-gradient-to-e from-slate-50 dark:from-[#0F1419] to-transparent z-10 pointer-events-none rounded-s-2xl" />
        {/* Right fade */}
        <div className="absolute end-0 top-0 bottom-0 w-8 bg-gradient-to-s from-slate-50 dark:from-[#0F1419] to-transparent z-10 pointer-events-none rounded-e-2xl" />

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {similar.map((property: any, idx: number) => {
            const imgSrc =
              (Array.isArray(property.images) && property.images[0]) ||
              property.image ||
              PLACEHOLDER;
            const govLabel =
              GOV_NAMES[normalizeGov(property.governorate) || property.governorate]
                ? (ar ? GOV_NAMES[normalizeGov(property.governorate) || property.governorate].ar : GOV_NAMES[normalizeGov(property.governorate) || property.governorate].en)
                : property.governorate;
            const isRent = property.category === "إيجار";
            const priceDiff = Math.abs(property.price - currentProperty.price);
            const pricePct = currentProperty.price > 0 ? Math.round((priceDiff / currentProperty.price) * 100) : 0;

            return (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, x: ar ? 30 : -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="group relative flex-shrink-0 w-72 bg-white dark:bg-[#131929] rounded-2xl overflow-hidden border border-border dark:border-[#2A3348] shadow-md hover:shadow-xl hover:shadow-primary/10 hover:border-[#F5A623]/30 dark:hover:border-[#F5A623]/30 transition-all cursor-pointer"
                onClick={() => navigate(`/property/${property.id}`)}
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={imgSrc}
                    alt={property.title}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Category badge */}
                  <span className={`absolute top-3 end-3 px-3 py-1 rounded-full text-xs font-black shadow ${
                    isRent ? "bg-[#F5A623] text-white" : "bg-green-500 text-white"
                  }`}>
                    {isRent ? (ar ? "إيجار" : "Rent") : (ar ? "بيع" : "Sale")}
                  </span>

                  {/* Price diff badge */}
                  {pricePct <= 30 && pricePct > 0 && (
                    <span className="absolute top-3 start-3 px-2.5 py-1 rounded-full text-[10px] font-black bg-black/60 backdrop-blur-sm text-white">
                      {pricePct <= 10 ? "💰 قريب جداً" : pricePct <= 20 ? "💡 قريب" : "📊 مشابه"}
                    </span>
                  )}
                  {pricePct === 0 && (
                    <span className="absolute top-3 start-3 px-2.5 py-1 rounded-full text-[10px] font-black bg-[#F5A623]/90 text-white">
                      🎯 {ar ? "نفس السعر" : "Same price"}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-black text-primary dark:text-[#E8EBF0] line-clamp-1 mb-1.5 group-hover:text-[#F5A623] transition-colors">
                    {property.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-muted-foreground dark:text-[#A0A8B8] mb-3">
                    <MapPin className="w-3.5 h-3.5 text-[#F5A623] shrink-0" />
                    <span className="text-sm">{govLabel}</span>
                  </div>

                  {/* Price */}
                  <div className="text-[#F5A623] font-black mb-3">
                    {property.price.toLocaleString()}
                    <span className="text-muted-foreground font-normal text-xs ms-1">
                      {ar ? "د.أ" : "JD"}
                      {isRent && <span>{ar ? "/شهر" : "/mo"}</span>}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground dark:text-[#A0A8B8] border-t border-border dark:border-[#2A3348] pt-3 mb-3">
                    {property.bedrooms > 0 && (
                      <span className="flex items-center gap-1">
                        <Bed className="w-3 h-3" /> {property.bedrooms}
                      </span>
                    )}
                    {property.bathrooms > 0 && (
                      <span className="flex items-center gap-1">
                        <Bath className="w-3 h-3" /> {property.bathrooms}
                      </span>
                    )}
                    {property.area > 0 && (
                      <span className="flex items-center gap-1 ms-auto">
                        <Maximize className="w-3 h-3" /> {property.area} {ar ? "م²" : "sqm"}
                      </span>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/property/${property.id}`); }}
                    className="w-full py-2.5 rounded-xl border-2 border-[#F5A623]/30 hover:bg-[#F5A623] hover:text-white text-[#F5A623] font-black text-sm transition-all flex items-center justify-center gap-2 group-hover:border-[#F5A623]"
                  >
                    {ar ? "عرض العقار" : "View Property"}
                    {ar ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Accent underline */}
                <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-[#F5A623] to-orange-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-start" />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* View all link */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="text-center mt-4"
      >
        <button
          onClick={() => navigate(`/governorate/${normalizeGov(currentProperty.governorate) || currentProperty.governorate}`)}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#F5A623] hover:underline transition-all"
        >
          {ar ? `عرض جميع عقارات ${GOV_NAMES[normalizeGov(currentProperty.governorate) || currentProperty.governorate]?.ar || currentProperty.governorate}` : `View all ${GOV_NAMES[normalizeGov(currentProperty.governorate) || currentProperty.governorate]?.en || currentProperty.governorate} properties`}
          {ar ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </motion.div>
    </div>
  );
}