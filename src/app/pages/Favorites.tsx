import { motion, AnimatePresence } from "motion/react";
import { Heart } from "lucide-react";
import { useApp } from "../context/AppContext";
import Navbar from "../components/Navbar";
import PropertyCard from "../components/PropertyCard";
import { useEffect } from "react";

export default function Favorites() {
  const { language, favorites, properties } = useApp();

  // Set page title
  useEffect(() => {
    document.title = language === "ar" ? "بيتي - المفضلة" : "Baity - Favorites";
  }, [language]);

  // Use properties from context (real data) instead of mockData
  const favoriteProperties = properties.filter((p: any) => favorites.includes(p.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted via-white to-muted/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <Navbar />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <Heart className="w-10 h-10 text-red-500 fill-red-500" />
              <h1 className="text-4xl md:text-5xl font-bold text-primary">
                {language === "ar" ? "المفضلة" : "Favorites"}
              </h1>
            </div>
            <p className="text-lg text-muted-foreground">
              {language === "ar"
                ? `لديك ${favoriteProperties.length} عقار في المفضلة`
                : `You have ${favoriteProperties.length} properties in favorites`}
            </p>
          </motion.div>

          {/* Favorites Grid */}
          <AnimatePresence>
            {favoriteProperties.length > 0 ? (
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {favoriteProperties.map((property, index) => (
                  <motion.div
                    key={property.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    <PropertyCard property={property} index={index} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl mb-4"
                >
                  💔
                </motion.div>
                <h3 className="text-2xl font-bold text-primary mb-2">
                  {language === "ar" ? "لا توجد عقارات مفضلة" : "No Favorite Properties"}
                </h3>
                <p className="text-muted-foreground">
                  {language === "ar"
                    ? "ابدأ بإضافة عقارات إلى المفضلة بالضغط على أيقونة القلب"
                    : "Start adding properties to favorites by clicking the heart icon"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}