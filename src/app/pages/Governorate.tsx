import { motion, AnimatePresence } from "motion/react";
import { useParams, useNavigate } from "react-router";
import { useState, useMemo } from "react";
import {
  MapPin,
  Globe,
  SlidersHorizontal,
  X,
  Bed,
  Bath,
  Maximize,
  Eye,
  ChevronLeft,
  LayoutGrid,
} from "lucide-react";
import Navbar from "../components/Navbar";
import PropertyCard from "../components/PropertyCard";
import { governorates, propertyTypes } from "../data/mockData";
import { useApp } from "../context/AppContext";
import { normalizeGov } from "../utils/governorateUtils";

export default function Governorate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language, properties: contextProperties, isLoadingProperties } = useApp();
  const [viewMode, setViewMode] = useState<"map" | "earth" | "grid">("grid");
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [category, setCategory] = useState<"الكل" | "بيع" | "إيجار">("الكل");
  const [propertyType, setPropertyType] = useState("الكل");
  const [priceRange, setPriceRange] = useState([0, 1000000]);
  const [bedrooms, setBedrooms] = useState<number | null>(null);

  const governorate = governorates.find((g) => g.id === id);

  // Filter real properties from context matching this governorate
  const governorateProperties = useMemo(() => {
    if (!id) return [];
    const gov = governorates.find((g) => g.id === id);
    if (!gov) return [];

    // Use normalizeGov for cross-language matching:
    // CSV properties store English IDs ("amman"), user properties store Arabic names ("عمان")
    const filtered = contextProperties.filter((p: any) => {
      if (!p.governorate) return false;
      return normalizeGov(p.governorate) === gov.id;
    });

    return filtered;
  }, [id, contextProperties]);

  // Filtered Properties - improved filtering logic
  const filteredProperties = useMemo(() => {
    console.log("🔧 [Governorate] Applying filters");
    console.log("Governorate properties before filter:", governorateProperties.length);
    console.log("Active filters:", { category, propertyType, priceRange, bedrooms });

    const filtered = governorateProperties.filter((p: any) => {
      // Category filter
      if (category !== "الكل") {
        if (!p.category) return false;
        if (p.category.toString().trim() !== category.toString().trim()) return false;
      }

      // Property type filter
      if (propertyType !== "الكل") {
        if (!p.type) return false;
        if (p.type.toString().trim() !== propertyType.toString().trim()) return false;
      }

      // Price range filter
      const price = Number(p.price);
      if (isNaN(price)) return false;
      if (price < priceRange[0] || price > priceRange[1]) return false;

      // Bedrooms filter
      if (bedrooms !== null) {
        const propBedrooms = Number(p.bedrooms);
        if (isNaN(propBedrooms)) return false;
        if (propBedrooms !== bedrooms) return false;
      }

      return true;
    });

    console.log("✅ [Governorate] Properties after filter:", filtered.length);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return filtered;
  }, [governorateProperties, category, propertyType, priceRange, bedrooms]);

  const selectedProp = filteredProperties.find((p: any) => p.id === selectedProperty);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="pt-20 h-screen flex flex-col">
        {/* Header with Filters */}
        <div className="bg-white border-b border-border shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate("/")}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-primary">
                    {governorate?.name}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {filteredProperties.length} عقار متاح
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex bg-muted rounded-xl p-1">
                  <button
                    onClick={() => setViewMode("map")}
                    className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                      viewMode === "map"
                        ? "bg-white shadow-md text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    <span className="hidden sm:inline">خريطة</span>
                  </button>
                  <button
                    onClick={() => setViewMode("earth")}
                    className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                      viewMode === "earth"
                        ? "bg-white shadow-md text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span className="hidden sm:inline">3D</span>
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                      viewMode === "grid"
                        ? "bg-white shadow-md text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span className="hidden sm:inline">شبكة</span>
                  </button>
                </div>

                {/* Filters Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:shadow-lg transition-all"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">الفلاتر</span>
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 pb-2 grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Category */}
                    <div>
                      <label className="block text-sm text-muted-foreground mb-2">
                        نوع العملية
                      </label>
                      <select
                        value={category}
                        onChange={(e) =>
                          setCategory(e.target.value as "الكل" | "بيع" | "إيجار")
                        }
                        className="w-full px-4 py-2 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-accent transition-all"
                      >
                        <option>الكل</option>
                        <option>بيع</option>
                        <option>إيجار</option>
                      </select>
                    </div>

                    {/* Property Type */}
                    <div>
                      <label className="block text-sm text-muted-foreground mb-2">
                        نوع العقار
                      </label>
                      <select
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                        className="w-full px-4 py-2 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-accent transition-all"
                      >
                        {propertyTypes.map((type, index) => (
                          <option key={`${type.id}-${index}`} value={type.name}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Bedrooms */}
                    <div>
                      <label className="block text-sm text-muted-foreground mb-2">
                        عدد الغرف
                      </label>
                      <select
                        value={bedrooms ?? "الكل"}
                        onChange={(e) =>
                          setBedrooms(
                            e.target.value === "الكل"
                              ? null
                              : Number(e.target.value)
                          )
                        }
                        className="w-full px-4 py-2 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-accent transition-all"
                      >
                        <option>الكل</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5+</option>
                      </select>
                    </div>

                    {/* Price Range */}
                    <div>
                      <label className="block text-sm text-muted-foreground mb-2">
                        السعر (د.أ)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="من"
                          value={priceRange[0]}
                          onChange={(e) =>
                            setPriceRange([Number(e.target.value), priceRange[1]])
                          }
                          className="w-full px-3 py-2 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-accent transition-all text-sm"
                        />
                        <span className="text-muted-foreground">-</span>
                        <input
                          type="number"
                          placeholder="إلى"
                          value={priceRange[1]}
                          onChange={(e) =>
                            setPriceRange([priceRange[0], Number(e.target.value)])
                          }
                          className="w-full px-3 py-2 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-accent transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Map View Container */}
        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full"
            >
              {viewMode === "map" ? (
                // Map View
                <div className="relative w-full h-full bg-gradient-to-br from-slate-100 to-blue-50">
                  {/* Map Grid Background */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: `
                        linear-gradient(#0F172A 1px, transparent 1px),
                        linear-gradient(90deg, #0F172A 1px, transparent 1px)
                      `,
                      backgroundSize: "40px 40px",
                    }}
                  />

                  {/* Property Pins */}
                  {filteredProperties.map((property, index) => (
                    <motion.div
                      key={property.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ delay: index * 0.05 }}
                      style={{
                        position: "absolute",
                        insetInlineStart: `${20 + (index % 8) * 12}%`,
                        top: `${15 + Math.floor(index / 8) * 15}%`,
                      }}
                      onMouseEnter={() => setHoveredPin(property.id)}
                      onMouseLeave={() => setHoveredPin(null)}
                      onClick={() => setSelectedProperty(property.id)}
                      className="cursor-pointer group"
                    >
                      {/* Pin */}
                      <motion.div
                        whileHover={{ scale: 1.2 }}
                        className="relative"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-blue shadow-lg flex items-center justify-center group-hover:shadow-2xl group-hover:shadow-accent/50 transition-all border-2 border-white">
                          <MapPin className="w-5 h-5 text-white" />
                        </div>

                        {/* Hover Mini Card */}
                        {hoveredPin === property.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="absolute top-full mt-2 start-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 bg-white rounded-xl shadow-2xl overflow-hidden z-50 w-48"
                          >
                            <img
                              src={property.image}
                              alt={property.title}
                              className="w-full h-24 object-cover"
                            />
                            <div className="p-3">
                              <p className="font-bold text-sm text-primary truncate">
                                {property.title}
                              </p>
                              <p className="text-accent font-bold text-lg">
                                {property.price.toLocaleString()}{" "}
                                {property.category === "إيجار" ? "د.أ/شهر" : "د.أ"}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    </motion.div>
                  ))}
                </div>
              ) : viewMode === "earth" ? (
                // Earth View (3D Simulation)
                <div className="relative w-full h-full bg-gradient-to-b from-slate-900 via-blue-900 to-slate-800 overflow-hidden">
                  <motion.div
                    animate={{
                      rotateY: [0, 360],
                    }}
                    transition={{
                      duration: 40,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <div className="w-96 h-96 rounded-full bg-gradient-to-br from-blue-400 to-green-300 shadow-2xl shadow-blue-500/50 relative overflow-hidden">
                      {/* Globe Texture Simulation */}
                      <div className="absolute inset-0 opacity-30">
                        {Array.from({ length: 20 }).map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-full border-t border-white/20"
                            style={{ top: `${i * 5}%` }}
                          />
                        ))}
                      </div>

                      {/* Property Markers */}
                      {filteredProperties.slice(0, 5).map((property, index) => (
                        <motion.div
                          key={property.id}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: index * 0.2 }}
                          style={{
                            position: "absolute",
                            insetInlineStart: `${30 + index * 15}%`,
                            top: `${40 + Math.sin(index) * 20}%`,
                          }}
                          onClick={() => setSelectedProperty(property.id)}
                          className="cursor-pointer"
                        >
                          <motion.div
                            animate={{
                              y: [0, -10, 0],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              delay: index * 0.3,
                            }}
                            className="w-3 h-3 rounded-full bg-accent shadow-lg shadow-accent/50"
                          />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  <div className="absolute bottom-10 start-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 text-white text-center">
                    <Globe className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                    <p className="text-sm">عرض ثلاثي الأبعاد للعقارات</p>
                  </div>
                </div>
              ) : (
                // Grid View
                <div className="w-full h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50/30">
                  <div className="max-w-7xl mx-auto p-6">
                    {filteredProperties.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProperties.map((property, index) => (
                          <PropertyCard
                            key={property.id}
                            property={property}
                            index={index}
                          />
                        ))}
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20"
                      >
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <LayoutGrid className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold text-primary mb-2">
                          لا توجد عقارات متاحة
                        </h3>
                        <p className="text-muted-foreground">
                          جرب تعديل الفلاتر للحصول على نتائج أخرى
                        </p>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Property Details Sidebar */}
          <AnimatePresence>
            {selectedProperty && selectedProp && (
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25 }}
                className="absolute top-0 end-0 w-full md:w-96 h-full bg-white/95 backdrop-blur-md shadow-2xl overflow-y-auto z-50"
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedProperty(null)}
                  className="absolute top-4 start-4 p-2 bg-white rounded-full shadow-lg hover:bg-muted transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Property Image */}
                <div className="relative h-64">
                  <img
                    src={selectedProp.image}
                    alt={selectedProp.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 end-4 px-3 py-1 bg-accent text-white rounded-full text-sm font-bold">
                    {selectedProp.category}
                  </div>
                </div>

                {/* Property Details */}
                <div className="p-6 space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-primary mb-2">
                      {selectedProp.title}
                    </h2>
                    <p className="text-3xl font-bold text-accent">
                      {selectedProp.price.toLocaleString()}{" "}
                      {selectedProp.category === "إيجار" ? "د.أ/شهر" : "د.أ"}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Bed className="w-4 h-4" />
                      <span>{selectedProp.bedrooms || "-"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="w-4 h-4" />
                      <span>{selectedProp.bathrooms || "-"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Maximize className="w-4 h-4" />
                      <span>{selectedProp.area} م²</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-primary mb-2">الوصف</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {selectedProp.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{selectedProp.views} مشاهدة</span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/property/${selectedProp.id}`)}
                    className="w-full bg-primary text-white py-3 rounded-xl hover:shadow-lg transition-all font-bold"
                  >
                    عرض التفاصيل الكاملة
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}