import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Bed, Bath, Maximize, MapPin, Eye, Heart, Star, Zap } from "lucide-react";
import { useState } from "react";
import { useApp } from "../context/AppContext";

// ── Placeholder SVG data-URI used when an image fails to load
const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f1f5f9'/%3E%3Crect x='150' y='90' width='100' height='80' rx='8' fill='%23cbd5e1'/%3E%3Ccircle cx='175' cy='115' r='12' fill='%2394a3b8'/%3E%3Cpolygon points='150,170 200,120 250,170' fill='%2394a3b8'/%3E%3Ctext x='200' y='220' text-anchor='middle' fill='%2394a3b8' font-size='14' font-family='Arial'>لا توجد صورة%3C/text%3E%3C/svg%3E";

interface PropertyCardProps {
  property: {
    id: string;
    title: string;
    type: string;
    category: string;
    price: number;
    area: number;
    bedrooms: number;
    bathrooms: number;
    governorate: string;
    image: string;
    views: number;
    likesCount?: number;
    availabilityStatus?: string;
    isNew?: boolean;
    isFeatured?: boolean;
    isHot?: boolean;
    rating?: number;
  };
  index?: number;
  compact?: boolean;
  modal?: boolean;
}

function Badge({ type, language }: { type: "new" | "featured" | "hot"; language: string }) {
  const cfg = {
    new:      { cls: "bg-emerald-500", icon: <Zap  className="w-3 h-3" />,            ar: "جديد", en: "New"      },
    featured: { cls: "bg-accent",      icon: <Star className="w-3 h-3 fill-white" />, ar: "مميز", en: "Featured" },
    hot:      { cls: "bg-red-500",     icon: <span className="text-[10px]">🔥</span>, ar: "رائج", en: "Hot"      },
  }[type];

  return (
    <span className={`${cfg.cls} text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md`}>
      {cfg.icon}
      {language === "ar" ? cfg.ar : cfg.en}
    </span>
  );
}

export default function PropertyCard({ property, index = 0, compact = false, modal = false }: PropertyCardProps) {
  const navigate = useNavigate();
  const { t, language, toggleFavorite, isFavorite } = useApp();
  const wishlisted = isFavorite(property.id);

  const governorateNames: Record<string, { ar: string; en: string }> = {
    amman:   { ar: "عمان",    en: "Amman"   },
    zarqa:   { ar: "الزرقاء", en: "Zarqa"   },
    irbid:   { ar: "إربد",    en: "Irbid"   },
    aqaba:   { ar: "العقبة",  en: "Aqaba"   },
    mafraq:  { ar: "المفرق",  en: "Mafraq"  },
    balqa:   { ar: "البلقاء", en: "Balqa"   },
    karak:   { ar: "الكرك",   en: "Karak"   },
    madaba:  { ar: "مادبا",   en: "Madaba"  },
    jerash:  { ar: "جرش",     en: "Jerash"  },
    ajloun:  { ar: "عجلون",   en: "Ajloun"  },
    maan:    { ar: "معان",    en: "Ma'an"   },
    tafilah: { ar: "الطفيلة", en: "Tafilah" },
  };

  const govLabel = governorateNames[property.governorate]
    ? (language === "ar" ? governorateNames[property.governorate].ar : governorateNames[property.governorate].en)
    : property.governorate;

  const badge: "hot" | "featured" | "new" | null =
    property.isHot ? "hot" : property.isFeatured ? "featured" : property.isNew ? "new" : null;

  /* ── COMPACT (horizontal) layout ── */
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08 }}
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        onClick={() => navigate(`/property/${property.id}`)}
        className="relative flex flex-row-reverse items-stretch bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group border border-border hover:border-accent/40"
        style={{ minHeight: "88px" }}
      >
        {/* Image — fixed width */}
        <div className="relative w-[100px] flex-shrink-0 overflow-hidden">
          <img
            src={property.image || PLACEHOLDER}
            alt={property.title}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${property.availabilityStatus === "sold" ? "opacity-70 grayscale-[40%]" : ""}`}
          />
          <span className={`absolute top-2 end-2 rounded-md px-1.5 py-0.5 text-[9px] font-bold shadow leading-none ${property.category === "إيجار" ? "bg-[#F5A623] text-[#FFFFFF]" : "bg-accent text-white"}`}>
            {property.category === "بيع" ? t("sale") : t("rent")}
          </span>
          {/* Sold overlay badge */}
          {property.availabilityStatus === "sold" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-slate-800/80 text-white text-[9px] font-black px-2 py-0.5 rounded-md rotate-[-15deg] shadow-lg backdrop-blur-sm">
                {language === "ar" ? "تم البيع" : "SOLD"}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-between flex-1 px-3.5 py-3 min-w-0">
          <div className="space-y-0.5">
            <h3 className="font-bold text-[12px] text-primary line-clamp-1 group-hover:text-accent transition-colors leading-snug">
              {property.title}
            </h3>
            <div className="flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-accent flex-shrink-0" />
              <span className="text-[10px] text-muted-foreground truncate">{govLabel}</span>
            </div>
          </div>

          <div className="text-[13px] font-bold text-accent leading-none">
            {property.price.toLocaleString()} {t("jd")}
            {property.category === "إيجار" && (
              <span className="text-[9px] font-normal text-muted-foreground ms-1">{t("perMonth")}</span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[10px] text-muted-foreground border-t border-border pt-2">
            {property.bedrooms > 0 && (
              <span className="flex items-center gap-1">
                <Bed className="w-2.5 h-2.5" />
                {property.bedrooms}
              </span>
            )}
            {property.bathrooms > 0 && (
              <span className="flex items-center gap-1">
                <Bath className="w-2.5 h-2.5" />
                {property.bathrooms}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Maximize className="w-2.5 h-2.5" />
              {property.area} {t("sqm")}
            </span>
            {/* Availability badge inline */}
            {property.availabilityStatus === "sold" && (
              <span className="ms-auto text-[9px] font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
                {language === "ar" ? "مُباع" : "Sold"}
              </span>
            )}
            {/* Wishlist */}
            {property.availabilityStatus !== "sold" && (
              <motion.button
                onClick={(e) => { e.stopPropagation(); toggleFavorite(property.id); }}
                whileTap={{ scale: 0.82 }}
                className="ms-auto w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-red-50 transition-colors"
                aria-label="wishlist"
              >
                <Heart className={`w-3 h-3 transition-colors ${wishlisted ? "fill-red-500 text-red-500" : "text-slate-400"}`} />
              </motion.button>
            )}
          </div>
        </div>

        {/* Accent underline */}
        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-accent to-accent-blue scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
      </motion.div>
    );
  }

  /* ── DEFAULT (vertical) layout ── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -8, transition: { duration: 0.25 } }}
      onClick={() => navigate(`/property/${property.id}`)}
      className="relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-primary/10 transition-all cursor-pointer group border border-transparent hover:border-border"
    >
      {/* Image */}
      <div className={`relative overflow-hidden ${modal ? "aspect-[4/3]" : "aspect-video"}`}>
        <img
          src={property.image || PLACEHOLDER}
          alt={property.title}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }}
          className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${property.availabilityStatus === "sold" ? "opacity-75 grayscale-[30%]" : ""}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* SOLD overlay */}
        {property.availabilityStatus === "sold" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-slate-900/70 backdrop-blur-[2px] text-white font-black text-xl px-6 py-2 rounded-2xl rotate-[-12deg] shadow-2xl border-2 border-white/20 tracking-widest">
              {language === "ar" ? "تم البيع" : "SOLD"}
            </div>
          </div>
        )}

        {/* Top-right: category + badge */}
        <div className="absolute top-3.5 end-3.5 flex flex-col items-end gap-2">
          {property.availabilityStatus !== "sold" && (
            <span className={`${property.category === "إيجار" ? "bg-[#F5A623] text-[#FFFFFF]" : "bg-accent text-white"} rounded-full font-bold shadow-lg ${modal ? "px-2.5 py-1 text-[10px]" : "px-3.5 py-1.5 text-xs"}`}>
              {property.category === "بيع" ? t("sale") : t("rent")}
            </span>
          )}
          {property.availabilityStatus === "sold" && (
            <span className={`bg-slate-700 text-slate-200 rounded-full font-bold shadow-lg ${modal ? "px-2.5 py-1 text-[10px]" : "px-3.5 py-1.5 text-xs"}`}>
              {language === "ar" ? "🔴 مُباع" : "🔴 Sold"}
            </span>
          )}
          {badge && property.availabilityStatus !== "sold" && <Badge type={badge} language={language} />}
        </div>

        {/* Top-left: wishlist (hide if sold) */}
        {property.availabilityStatus !== "sold" && (
          <motion.button
            onClick={(e) => { e.stopPropagation(); toggleFavorite(property.id); }}
            whileTap={{ scale: 0.82 }}
            className={`absolute top-3.5 start-3.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors ${modal ? "w-7 h-7" : "w-9 h-9"}`}
            aria-label="wishlist"
          >
            <Heart className={`transition-colors ${wishlisted ? "fill-red-500 text-red-500" : "text-slate-400"} ${modal ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
          </motion.button>
        )}

        {/* Bottom-left: views */}
        <div className="absolute bottom-3.5 start-3.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1.5 rounded-lg text-xs">
          <Eye className="w-3 h-3" />
          <span>{property.views} {t("views")}</span>
        </div>

        {/* Bottom-right: quick view on hover */}
        {!modal && (
          <div className="absolute bottom-3.5 end-3.5 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
            <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-primary text-[10px] font-bold px-3 py-1.5 rounded-full shadow flex items-center gap-1">
              {language === "ar" ? "عرض التفاصيل" : "View details"}
              <span className="rtl:-scale-x-100">→</span>
            </span>
          </div>
        )}
        {modal && (
          <div className="absolute bottom-3.5 end-3.5 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
            <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-primary text-[10px] font-bold px-2.5 py-1 rounded-full shadow flex items-center gap-1">
              {language === "ar" ? "عرض التفاصيل" : "View details"}
              <span className="rtl:-scale-x-100">→</span>
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={modal ? "p-4" : "p-5"}>
        {/* Title + Location */}
        <div className={modal ? "mb-3" : "mb-4"}>
          <h3 className={`font-bold text-primary line-clamp-1 group-hover:text-accent transition-colors ${modal ? "text-sm mb-1" : "text-lg mb-1.5"} ${property.availabilityStatus === "sold" ? "text-muted-foreground" : ""}`}>
            {property.title}
          </h3>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className={`text-accent flex-shrink-0 ${modal ? "w-3 h-3" : "w-3.5 h-3.5"}`} />
            <span className={modal ? "text-xs" : "text-sm"}>{govLabel}</span>
          </div>
        </div>

        {/* Price */}
        <div className={`font-bold ${property.availabilityStatus === "sold" ? "text-muted-foreground line-through" : "text-accent"} ${modal ? "text-base mb-3" : "text-2xl mb-4"}`}>
          {property.price.toLocaleString()} {t("jd")}
          {property.category === "إيجار" && (
            <span className={`font-normal text-muted-foreground ms-1.5 ${modal ? "text-[10px]" : "text-sm"}`}>{t("perMonth")}</span>
          )}
        </div>

        {/* Sold notice */}
        {property.availabilityStatus === "sold" && (
          <div className="mb-3 bg-slate-100 dark:bg-slate-700/60 rounded-xl px-3 py-2 text-center">
            <span className="text-xs font-black text-slate-600 dark:text-slate-300">
              {language === "ar" ? "🔴 هذا العقار تم بيعه" : "🔴 This property has been sold"}
            </span>
          </div>
        )}

        {/* Stats row */}
        <div className={`flex items-center text-muted-foreground border-t border-border ${modal ? "gap-3 pt-3 text-[10px]" : "gap-5 pt-4 text-sm"}`}>
          <div className="flex items-center gap-1.5">
            <Bed className={modal ? "w-3 h-3" : "w-4 h-4"} />
            <span>{property.bedrooms || "–"} {property.bedrooms ? t("bed") : ""}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bath className={modal ? "w-3 h-3" : "w-4 h-4"} />
            <span>{property.bathrooms || "–"} {property.bathrooms ? t("bath") : ""}</span>
          </div>
          <div className="flex items-center gap-1.5 ms-auto">
            <Maximize className={modal ? "w-3 h-3" : "w-4 h-4"} />
            <span>{property.area} {t("sqm")}</span>
          </div>
          {/* Like count */}
          {(property.likesCount ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-red-400">
              <Heart className={`${modal ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} fill-red-400`} />
              <span className="font-bold">{property.likesCount}</span>
            </div>
          )}
        </div>

        {/* Rating */}
        {property.rating != null && !modal && (
          <div className="flex items-center gap-1 mt-4 pt-4 border-t border-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(property.rating!) ? "text-yellow-400 fill-yellow-400" : "text-slate-200 dark:text-slate-700"}`} />
            ))}
            <span className="text-xs text-muted-foreground ms-1.5">{property.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Accent underline */}
      <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-accent to-accent-blue scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
    </motion.div>
  );
}