import { motion } from "motion/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Search, MapPin, Home as HomeIcon, DollarSign, Tag } from "lucide-react";
import { governorates, propertyTypes } from "../data/mockData";
import { useApp } from "../context/AppContext";

export default function QuickSearch() {
  const navigate = useNavigate();
  const { t, language } = useApp();
  const [formData, setFormData] = useState({
    governorate: "",    // stores the governorate ID (e.g. "amman")
    type: "",
    category: "all",
    maxPrice: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    setIsLoading(true);

    // Build URL params using gov ID for reliable matching
    const params = new URLSearchParams();
    if (formData.governorate) params.set("governorate", formData.governorate);
    if (formData.type)        params.set("type", formData.type);
    if (formData.category && formData.category !== "all") params.set("category", formData.category);
    if (formData.maxPrice)    params.set("maxPrice", formData.maxPrice);

    setTimeout(() => {
      navigate(`/properties?${params.toString()}`);
      setIsLoading(false);
    }, 300);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="max-w-6xl mx-auto"
    >
      <div className="bg-gradient-to-br from-white via-white to-blue-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50 dark:border-accent/10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* Governorate */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            <label className="block text-sm font-bold text-primary mb-2">
              <MapPin className="w-4 h-4 inline me-2 text-accent" />
              {language === "ar" ? "المحافظة" : "Governorate"}
            </label>
            <select
              value={formData.governorate}
              onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 bg-muted dark:bg-slate-700 rounded-xl border border-accent/20 focus:border-accent focus:ring-2 focus:ring-accent/30 appearance-none cursor-pointer font-medium transition-all"
            >
              <option value="">{language === "ar" ? "اختر محافظة" : "Select Governorate"}</option>
              {governorates.map((gov) => (
                <option key={gov.id} value={gov.id}>
                  {language === "ar" ? gov.name : gov.nameEn}
                </option>
              ))}
            </select>
          </motion.div>

          {/* Property Type */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="relative"
          >
            <label className="block text-sm font-bold text-primary mb-2">
              <HomeIcon className="w-4 h-4 inline me-2 text-accent" />
              {language === "ar" ? "نوع العقار" : "Property Type"}
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 bg-muted dark:bg-slate-700 rounded-xl border border-accent/20 focus:border-accent focus:ring-2 focus:ring-accent/30 appearance-none cursor-pointer font-medium transition-all"
            >
              <option value="">{language === "ar" ? "اختر النوع" : "Select Type"}</option>
              {propertyTypes.slice(1).map((type, index) => (
                <option key={`${type.id}-${index}`} value={type.name}>
                  {language === "ar" ? type.name : type.nameEn}
                </option>
              ))}
            </select>
          </motion.div>

          {/* Category */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <label className="block text-sm font-bold text-primary mb-2">
              <Tag className="w-4 h-4 inline me-2 text-accent" />
              {language === "ar" ? "النوع" : "Category"}
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 bg-muted dark:bg-slate-700 rounded-xl border border-accent/20 focus:border-accent focus:ring-2 focus:ring-accent/30 appearance-none cursor-pointer font-medium transition-all"
            >
              <option value="all">{language === "ar" ? "بيع وإيجار" : "Sale & Rent"}</option>
              <option value="بيع">{language === "ar" ? "بيع" : "Sale"}</option>
              <option value="إيجار">{language === "ar" ? "إيجار" : "Rent"}</option>
            </select>
          </motion.div>

          {/* Max Price */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25 }}
            className="relative"
          >
            <label className="block text-sm font-bold text-primary mb-2">
              <DollarSign className="w-4 h-4 inline me-2 text-accent" />
              {language === "ar" ? "السعر الأقصى" : "Max Price"}
            </label>
            <input
              type="number"
              value={formData.maxPrice}
              onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })}
              onKeyPress={handleKeyPress}
              placeholder={language === "ar" ? "مثال: 500000" : "e.g., 500000"}
              className="w-full px-4 py-3 bg-muted dark:bg-slate-700 rounded-xl border border-accent/20 focus:border-accent focus:ring-2 focus:ring-accent/30 font-medium transition-all placeholder-muted-foreground"
            />
          </motion.div>

          {/* Search Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex items-end"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSearch}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-accent to-amber-600 hover:from-accent hover:to-amber-700 dark:from-accent dark:to-amber-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Search className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
              <span>{isLoading ? (language === "ar" ? "جارٍ البحث..." : "Searching...") : (language === "ar" ? "ابحث" : "Search")}</span>
            </motion.button>
          </motion.div>
        </div>

        {/* Info text */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-sm text-muted-foreground text-center"
        >
          {language === "ar"
            ? "ابحث بالمحافظة، نوع العقار، أو السعر لإيجاد العقار المناسب لك"
            : "Search by governorate, property type, or price to find your ideal property"}
        </motion.p>
      </div>
    </motion.div>
  );
}