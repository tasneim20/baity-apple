import { motion } from "motion/react";
import { Link } from "react-router";
import {
  Home, MapPin, Mail, Instagram, Twitter, Facebook,
  MessageCircle, Phone, Building2, Shield, FileText,
  Info, ChevronRight,
} from "lucide-react";
import { useApp } from "../context/AppContext";

function JordanPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.04] dark:opacity-[0.02] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="jordan-geo" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <polygon points="30,4 34,18 48,18 37,26 41,40 30,32 19,40 23,26 12,18 26,18" fill="none" stroke="#2A3348" strokeWidth="0.8" />
          <rect x="0" y="0" width="6" height="6" transform="rotate(45 3 3)" fill="none" stroke="#2A3348" strokeWidth="0.6" />
          <rect x="54" y="0" width="6" height="6" transform="rotate(45 57 3)" fill="none" stroke="#2A3348" strokeWidth="0.6" />
          <rect x="0" y="54" width="6" height="6" transform="rotate(45 3 57)" fill="none" stroke="#2A3348" strokeWidth="0.6" />
          <rect x="54" y="54" width="6" height="6" transform="rotate(45 57 57)" fill="none" stroke="#2A3348" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#jordan-geo)" />
    </svg>
  );
}

export default function Footer() {
  const { language } = useApp();

  const quickLinks = [
    { icon: Info,      labelAr: "عن بيتي",          labelEn: "About Baity",        href: "#" },
    { icon: Shield,    labelAr: "سياسة الخصوصية",   labelEn: "Privacy Policy",     href: "#" },
    { icon: FileText,  labelAr: "الشروط والأحكام",  labelEn: "Terms & Conditions", href: "#" },
    { icon: Mail,      labelAr: "اتصل بنا",          labelEn: "Contact Us",         href: "#" },
    { icon: Building2, labelAr: "تصفح العقارات",     labelEn: "Browse Properties",  href: "/properties" },
    { icon: Home,      labelAr: "أضف عقارك",         labelEn: "Add Property",       href: "/add-property" },
  ];

  const socials = [
    { icon: Twitter,       href: "https://twitter.com",   label: "X (Twitter)" },
    { icon: Instagram,     href: "https://instagram.com", label: "Instagram" },
    { icon: Facebook,      href: "https://facebook.com",  label: "Facebook" },
    { icon: MessageCircle, href: "https://wa.me",         label: "WhatsApp" },
  ];

  const govs = [
    { ar: "عمان",    en: "Amman",   id: "amman"   },
    { ar: "إربد",    en: "Irbid",   id: "irbid"   },
    { ar: "الزرقاء", en: "Zarqa",   id: "zarqa"   },
    { ar: "البلقاء", en: "Balqa",   id: "balqa"   },
    { ar: "مادبا",   en: "Madaba",  id: "madaba"  },
    { ar: "الكرك",   en: "Karak",   id: "karak"   },
    { ar: "الطفيلة", en: "Tafilah", id: "tafilah" },
    { ar: "معان",    en: "Ma'an",   id: "maan"    },
    { ar: "العقبة",  en: "Aqaba",   id: "aqaba"   },
    { ar: "جرش",     en: "Jerash",  id: "jerash"  },
    { ar: "عجلون",   en: "Ajloun",  id: "ajloun"  },
    { ar: "المفرق",  en: "Mafraq",  id: "mafraq"  },
  ];

  return (
    <footer className="relative bg-primary dark:bg-[#0D1117] text-white overflow-hidden">
      {/* Top border of footer in dark mode */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#D4A843] to-transparent hidden dark:block z-10" />

      <JordanPattern />

      {/* Jordanian flag-color accent strip at top */}
      <div className="flex h-1.5 w-full relative z-10">
        <div className="flex-1 bg-black dark:bg-[#4B5563]" />
        <div className="flex-1 bg-white/25 dark:bg-[rgba(255,255,255,0.2)]" />
        <div className="flex-1 bg-[#007A3D] dark:bg-[#38A169]" />
        <div className="w-10 bg-[#CE1126] dark:bg-[#E53E3E]" style={{ clipPath: "polygon(0 0, 100% 50%, 0 100%)" }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Col 1 — Brand */}
          <div className="lg:col-span-1">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent-blue flex items-center justify-center shadow-lg shadow-accent/30 dark:shadow-[#D4A843]/10">
                <Home className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold block leading-none">{language === "ar" ? "بيتي" : "Baity"}</span>
              </div>
            </motion.div>
            <p className="text-white/65 dark:text-[#6B7280] leading-relaxed text-sm mb-6">
              {language === "ar"
                ? "منصتك الموثوقة للعثور على عقار أحلامك في المملكة الأردنية الهاشمية — بيع، شراء، وإيجار بكل سهولة."
                : "Your trusted platform to find your dream property in the Hashemite Kingdom of Jordan — buy, sell, and rent with ease."}
            </p>
            <div className="inline-flex items-center gap-2 bg-white/10 dark:bg-transparent dark:border-[rgba(255,255,255,0.06)] border border-white/20 rounded-xl px-4 py-2.5 backdrop-blur-sm">
              <MapPin className="w-4 h-4 text-accent dark:text-[#D4A843] flex-shrink-0" />
              <span className="text-sm font-medium text-white/90 dark:text-[#C9D1D9]">
                {language === "ar" ? "المملكة الأردنية الهاشمية" : "Hashemite Kingdom of Jordan"}
              </span>
            </div>
          </div>

          {/* Col 2 — Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-5 flex items-center gap-2 dark:text-[#D4A843]">
              <span className="w-1 h-5 bg-accent dark:bg-[#D4A843] rounded-full" />
              {language === "ar" ? "روابط سريعة" : "Quick Links"}
            </h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.labelEn}>
                  <Link to={link.href} className="flex items-center gap-3 text-white/65 dark:text-[#C9D1D9] hover:text-white dark:hover:text-[#F0B429] transition-all group text-sm">
                    <link.icon className="w-4 h-4 text-accent/60 dark:text-[#D4A843] group-hover:text-accent dark:group-hover:text-[#FFD166] transition-colors flex-shrink-0" />
                    <span>{language === "ar" ? link.labelAr : link.labelEn}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ms-auto rtl:rotate-180" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Governorates */}
          <div>
            <h3 className="font-bold text-lg mb-5 flex items-center gap-2 dark:text-[#D4A843]">
              <span className="w-1 h-5 bg-accent dark:bg-[#D4A843] rounded-full" />
              {language === "ar" ? "المحافظات الـ 12" : "12 Governorates"}
            </h3>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              {govs.map((gov) => (
                <Link key={gov.id} to={`/properties?governorate=${gov.id}`} className="flex items-center gap-1.5 text-white/65 dark:text-[#C9D1D9] hover:text-white dark:hover:text-[#F0B429] transition-colors group text-sm">
                  <MapPin className="w-3.5 h-3.5 text-accent/50 dark:text-[#D4A843] group-hover:text-accent dark:group-hover:text-[#FFD166] transition-colors flex-shrink-0" />
                  <span>{language === "ar" ? gov.ar : gov.en}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Col 4 — Contact + Social */}
          <div>
            <h3 className="font-bold text-lg mb-5 flex items-center gap-2 dark:text-[#D4A843]">
              <span className="w-1 h-5 bg-accent dark:bg-[#D4A843] rounded-full" />
              {language === "ar" ? "تواصل معنا" : "Get in Touch"}
            </h3>
            <div className="space-y-3 mb-6">
              <a href="tel:+96264000000" className="flex items-center gap-3 text-white/65 dark:text-[#C9D1D9] hover:text-white dark:hover:text-[#F0B429] transition-colors group text-sm">
                <Phone className="w-4 h-4 text-accent/60 dark:text-[#D4A843] group-hover:text-accent dark:group-hover:text-[#FFD166] flex-shrink-0" />
                <span dir="ltr">+962 6 400 0000</span>
              </a>
              <a href="mailto:info@baity.jo" className="flex items-center gap-3 text-white/65 dark:text-[#C9D1D9] hover:text-white dark:hover:text-[#F0B429] transition-colors group text-sm">
                <Mail className="w-4 h-4 text-accent/60 dark:text-[#D4A843] group-hover:text-accent dark:group-hover:text-[#FFD166] flex-shrink-0" />
                <span>info@baity.jo</span>
              </a>
              <div className="flex items-center gap-3 text-white/65 dark:text-[#C9D1D9] text-sm">
                <MapPin className="w-4 h-4 text-accent/60 dark:text-[#D4A843] flex-shrink-0" />
                <span>{language === "ar" ? "عمان، الأردن" : "Amman, Jordan"}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {socials.map(({ icon: Icon, href, label }) => (
                <motion.a key={label} href={href} target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.15, y: -2 }} whileTap={{ scale: 0.92 }} title={label}
                  className="group w-10 h-10 rounded-xl bg-white/10 dark:bg-transparent hover:bg-accent/80 dark:hover:bg-[#161B22] border border-white/15 dark:border-[rgba(255,255,255,0.06)] hover:border-accent dark:hover:border-[#F0B429] flex items-center justify-center transition-all">
                  <Icon className="w-5 h-5 transition-colors dark:text-[#D4A843] group-hover:text-white dark:group-hover:text-[#FFD166]" />
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-white/15 dark:border-[#1F2937] dark:bg-[#080C10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-white/45 dark:text-[#6B7280] text-xs">
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-white/25 dark:text-[#D4A843]" />
            <span>{language === "ar" ? "© 2026 بيتي. جميع الحقوق محفوظة." : "© 2026 Baity. All rights reserved."}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">{language === "ar" ? "صُنع بـ" : "Made with"}</span>
            <div className="flex gap-0.5 items-center">
              {["bg-black dark:bg-[#4B5563]", "bg-white/50 dark:bg-[#C9D1D9]", "bg-[#007A3D] dark:bg-[#38A169]", "bg-[#CE1126] dark:bg-[#E53E3E]"].map((c, i) => (
                <span key={i} className={`w-3 h-3 rounded-sm ${c}`} />
              ))}
            </div>
            <span>{language === "ar" ? "في الأردن" : "in Jordan"}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}