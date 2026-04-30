import { useNavigate, useLocation } from "react-router";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "../context/AppContext";

// ترتيب الصفحات حسب الناف بار
const NAV_ORDER = [
  "/",
  "/properties",
  "/dashboard",
  "/messages",
  "/favorites",
  "/my-properties",
];

export default function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useApp();

  const currentPath = location.pathname;

  // اخفِ الزر فقط في الهوم
  const isHome = currentPath === "/";
  if (isHome) return null;

  // احسب الوجهة: إذا الصفحة الحالية بالناف، روح للصفحة قبلها بالترتيب
  // وإذا ما هي بالناف (مثل /property/:id) روح للصفحة قبلها بالتاريخ
  const navIndex = NAV_ORDER.indexOf(currentPath);

  const handleBack = () => {
    if (navIndex > 0) {
      // صفحة من الناف — روح للصفحة اللي قبلها بالترتيب
      navigate(NAV_ORDER[navIndex - 1]);
    } else {
      // صفحة خارج الناف (تفاصيل عقار، إضافة، auth...) — رجوع للتاريخ
      navigate(-1);
    }
  };

  // الوجهة للـ tooltip
  const destinationLabel = () => {
    if (navIndex > 0) {
      const dest = NAV_ORDER[navIndex - 1];
      const labels: Record<string, { ar: string; en: string }> = {
        "/":             { ar: "الرئيسية",      en: "Home"           },
        "/properties":   { ar: "تصفح العقارات", en: "Properties"     },
        "/dashboard":    { ar: "لوحة التحكم",   en: "Dashboard"      },
        "/messages":     { ar: "الرسائل",       en: "Messages"       },
        "/favorites":    { ar: "المفضلة",       en: "Favorites"      },
        "/my-properties":{ ar: "عقاراتي",       en: "My Properties"  },
      };
      return language === "ar" ? labels[dest]?.ar : labels[dest]?.en;
    }
    return language === "ar" ? "رجوع" : "Back";
  };

  return (
    <AnimatePresence>
      <motion.button
        key="back-btn"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleBack}
        style={{ position: "fixed", insetInlineEnd: "24px", bottom: "24px" }}
        className="z-50 w-14 h-14 bg-gradient-to-br from-primary to-accent-blue rounded-full shadow-2xl flex items-center justify-center group border-4 border-white hover:shadow-accent-blue/50 transition-all"
        title={destinationLabel()}
      >
        {/* Pulse */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-primary rounded-full"
        />

        {/* السهم */}
        <ArrowLeft className="w-6 h-6 text-white relative z-10 group-hover:scale-110 transition-transform rtl:-scale-x-100" />

        {/* Tooltip */}
        <div className="absolute bottom-16 bg-gradient-to-r from-primary to-accent-blue text-white px-4 py-2 rounded-xl shadow-2xl border-2 border-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none text-sm font-bold flex items-center gap-1">
          <span className="rtl:-scale-x-100">←</span>
          {destinationLabel()}
        </div>
      </motion.button>
    </AnimatePresence>
  );
}
