import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Home, MapPin, DollarSign, CheckCircle2, Upload,
  X, AlertCircle, LogIn, ChevronRight, ChevronLeft,
  Image as ImageIcon,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { governorates, propertyTypes } from "../data/mockData";
import { useApp, getValidToken } from "../context/AppContext";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

export default function EditProperty() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, language, properties, refreshProperties } = useApp();
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    category: "",
    type: "",
    governorate: "",
    location: { lat: 31.9566, lng: 35.9106 }, 
    price: "",
    area: "",
    bedrooms: "",
    bathrooms: "",
    description: "",
    images: [] as string[],
    sponsoredAd: false,
    title: "", 
  });

  // Helper to populate form from a property object
  const populateForm = (property: any) => {
    setFormData({
      category: property.category || "",
      type: property.type || "",
      governorate: property.governorate || "",
      location: property.location || { lat: 31.9566, lng: 35.9106 },
      price: property.price ? String(property.price) : "",
      area: property.area ? String(property.area) : "",
      bedrooms: property.bedrooms ? String(property.bedrooms) : "",
      bathrooms: property.bathrooms ? String(property.bathrooms) : "",
      description: property.description || "",
      images: property.image ? [property.image] : (property.images?.length ? [property.images[0]] : []),
      sponsoredAd: property.sponsoredAd || false,
      title: property.title || "",
    });
    setIsLoading(false);
  };

  useEffect(() => {
    // First try from global context (approved properties)
    const property = properties.find((p) => p.id === id);
    if (property) {
      populateForm(property);
      return;
    }

    // If not found in context, fetch from /my-properties (includes pending/rejected)
    const fetchFromApi = async () => {
      try {
        const userToken = await getValidToken();
        if (!userToken) {
          setIsLoading(false);
          setErrorMsg("يجب تسجيل الدخول للتعديل");
          return;
        }
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/my-properties`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              "X-User-Token": userToken,
            },
          }
        );
        const data = await res.json();
        if (data.success) {
          const found = (data.data || []).find((p: any) => p.id === id);
          if (found) {
            populateForm(found);
          } else {
            setIsLoading(false);
            setErrorMsg("العقار غير موجود");
          }
        } else {
          setIsLoading(false);
          setErrorMsg("تعذّر تحميل بيانات العقار");
        }
      } catch {
        setIsLoading(false);
        setErrorMsg("خطأ في الاتصال بالخادم");
      }
    };

    fetchFromApi();
  }, [id]);

  const totalSteps = 9;

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      if (!isAuthenticated) {
        setErrorMsg(language === "ar" ? "يب تسجيل الدخول أولاً" : "Please Login First");
        return;
      }

      setIsSubmitting(true);
      setErrorMsg("");

      try {
        // ✅ getValidToken(): احصل على الـ token ثم ابنِ headers يدوياً
        const userToken = await getValidToken();
        if (!userToken) {
          throw new Error("انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً");
        }

        const propertyData = {
          title: formData.title || `${formData.type} لل${formData.category} في ${formData.governorate}`,
          type: formData.type,
          category: formData.category,
          price: Number(formData.price),
          area: Number(formData.area),
          bedrooms: Number(formData.bedrooms) || 0,
          bathrooms: Number(formData.bathrooms) || 0,
          governorate: formData.governorate,
          location: formData.location,
          image: formData.images.length > 0 ? formData.images[0] : "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800",
          description: formData.description,
          sponsoredAd: formData.sponsoredAd,
        };

        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/properties/${id}`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${publicAnonKey}`,
            "X-User-Token": userToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(propertyData)
        });

        const result = await response.json();
        
        if (!result.success) throw new Error(result.error || "Failed to update property");

        refreshProperties();
        setShowSuccess(true);
        setTimeout(() => {
          navigate("/my-properties");
        }, 3000);
      } catch (err: any) {
        setErrorMsg(err.message || "حدث خطأ غير متوقع أثناء تحديث العقار");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          images: [reader.result as string],
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      images: [],
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepContainer
            icon={Home}
            title="نوع العملية"
            description="هل تريد بيع أو تأجير اعقار؟"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["بيع", "إيجار"].map((cat) => (
                <motion.button
                  key={cat}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setFormData({ ...formData, category: cat })}
                  className={`p-8 rounded-2xl border-2 transition-all ${
                    formData.category === cat
                      ? "border-accent bg-accent/10 shadow-lg"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <div className="text-4xl mb-3">
                    {cat === "بيع" ? "💰" : "🏠"}
                  </div>
                  <h3 className="text-2xl font-bold text-primary">{cat}</h3>
                </motion.button>
              ))}
            </div>
          </StepContainer>
        );

      case 2:
        return (
          <StepContainer
            icon={Home}
            title="نوع العقار"
            description="حدد نوع العقار الذي تريد عرضه"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {propertyTypes.slice(1).map((type, index) => (
                <motion.button
                  key={`${type.id}-${index}`}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setFormData({ ...formData, type: type.name })}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    formData.type === type.name
                      ? "border-accent bg-accent/10 shadow-lg"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <h3 className="text-lg font-bold text-primary">{type.name}</h3>
                </motion.button>
              ))}
            </div>
          </StepContainer>
        );

      case 3:
        return (
          <StepContainer
            icon={MapPin}
            title="المحافظة"
            description="حدد موقع العقار"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {governorates.map((gov) => (
                <motion.button
                  key={gov.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() =>
                    setFormData({ ...formData, governorate: gov.name })
                  }
                  className={`p-6 rounded-xl border-2 transition-all ${
                    formData.governorate === gov.name
                      ? "border-accent bg-accent/10 shadow-lg"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <h3 className="text-lg font-bold text-primary">{gov.name}</h3>
                </motion.button>
              ))}
            </div>
          </StepContainer>
        );

      case 4:
        return (
          <StepContainer
            icon={MapPin}
            title="تحديد الموقع على الخريطة"
            description="اسحب العلامة لتحديد موقع العقار بدقة"
          >
            <div ref={mapRef} className="aspect-video bg-gradient-to-br from-slate-200 to-blue-100 rounded-2xl relative overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    linear-gradient(#0F172A 1px, transparent 1px),
                    linear-gradient(90deg, #0F172A 1px, transparent 1px)
                  `,
                  backgroundSize: "40px 40px",
                  opacity: 0.1,
                }}
              />
              <motion.div
                drag
                dragConstraints={mapRef}
                className="absolute top-1/2 start-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 cursor-move"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-16 h-16 bg-gradient-to-br from-accent to-accent-blue rounded-full flex items-center justify-center shadow-2xl"
                >
                  <MapPin className="w-8 h-8 text-white" />
                </motion.div>
                <motion.div
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-accent-blue rounded-full -z-10"
                />
              </motion.div>
              <div className="absolute bottom-4 start-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl text-sm">
                اسحب العلامة لتحديد الموقع
              </div>
            </div>
          </StepContainer>
        );

      case 5:
        return (
          <StepContainer
            icon={DollarSign}
            title="السعر"
            description={`حدد ${
              formData.category === "إيجار" ? "الإيجار الشهري" : "سعر البيع"
            }`}
          >
            <div className="max-w-md mx-auto">
              <div className="relative">
                <input
                  type="text"
                  value={formData.price ? Number(formData.price).toLocaleString('en-US') : ''}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/,/g, '');
                    if (!isNaN(Number(rawValue))) {
                      setFormData({ ...formData, price: rawValue });
                    }
                  }}
                  placeholder="أدخل السعر"
                  className="w-full px-6 py-6 text-3xl font-bold text-center bg-muted rounded-2xl border-2 border-border focus:border-accent focus:outline-none transition-all"
                />
                <div className="absolute start-6 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">
                  د.أ
                </div>
              </div>
              <p className="text-center text-muted-foreground mt-4">
                {formData.category === "إيجار"
                  ? "السعر الشهري بالدينار الأردني"
                  : "السعر الإجمالي بالدينار الأردني"}
              </p>
            </div>
          </StepContainer>
        );

      case 6:
        return (
          <StepContainer
            icon={Home}
            title="المساحة والغرف"
            description="حدد مساحة العقار وعدد الغرف"
          >
            <div className="max-w-md mx-auto space-y-6">
              <div>
                <label className="block text-sm font-bold text-primary mb-2">
                  المساحة (م²)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.area}
                  onChange={(e) =>
                    setFormData({ ...formData, area: e.target.value })
                  }
                  placeholder="مثال: 150"
                  className="w-full px-6 py-4 bg-muted rounded-xl border-2 border-border focus:border-accent focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-primary mb-2">
                    غرف النوم
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.bedrooms}
                    onChange={(e) =>
                      setFormData({ ...formData, bedrooms: e.target.value })
                    }
                    placeholder="3"
                    className="w-full px-6 py-4 bg-muted rounded-xl border-2 border-border focus:border-accent focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary mb-2">
                    الحمامات
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.bathrooms}
                    onChange={(e) =>
                      setFormData({ ...formData, bathrooms: e.target.value })
                    }
                    placeholder="2"
                    className="w-full px-6 py-4 bg-muted rounded-xl border-2 border-border focus:border-accent focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </StepContainer>
        );

      case 7:
        return (
          <StepContainer
            icon={Home}
            title="الوصف"
            description="اكتب وصفاً مفصلاً للعقار"
          >
            <div className="max-w-2xl mx-auto">
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="اكتب وصفاً تفصيلاً للعقر، المميزات، والموقع..."
                rows={8}
                className="w-full px-6 py-4 bg-muted rounded-xl border-2 border-border focus:border-accent focus:outline-none transition-all resize-none"
              />
            </div>
          </StepContainer>
        );

      case 8:
        return (
          <StepContainer
            icon={ImageIcon}
            title="الصور"
            description="أضف حتى 4 صور للعقار"
          >
            <div className="max-w-2xl mx-auto">
              {formData.images.length < 4 && (
                <label className="block w-full p-12 border-2 border-dashed border-border rounded-2xl hover:border-accent transition-all cursor-pointer bg-muted/50">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="text-center">
                    <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-bold text-primary mb-2">
                      اضغط لرفع الصور
                    </p>
                    <p className="text-sm text-muted-foreground">
                      يمكنك رفع حتى {4 - formData.images.length} صور
                    </p>
                  </div>
                </label>
              )}

              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  {formData.images.map((img, index) => (
                    <motion.div
                      key={index}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="relative aspect-square rounded-xl overflow-hidden group"
                    >
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 end-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </StepContainer>
        );

      case 9:
        return (
          <StepContainer
            icon={CheckCircle2}
            title="اشتراك في الإعلان الممول"
            description="هل تريد أن يظهر عقارك في قسم الإعلانات المميزة؟"
          >
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setFormData({ ...formData, sponsoredAd: true })}
                  className={`p-8 rounded-2xl border-2 transition-all ${
                    formData.sponsoredAd
                      ? "border-accent bg-accent/10 shadow-lg ring-4 ring-accent/20"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <div className="text-5xl mb-3">⭐</div>
                  <h3 className="text-2xl font-bold text-primary mb-2">
                    {language === "ar" ? "نعم، أريد إعلان مميز" : "Yes, I want featured ad"}
                  </h3>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setFormData({ ...formData, sponsoredAd: false })}
                  className={`p-8 rounded-2xl border-2 transition-all ${
                    !formData.sponsoredAd
                      ? "border-accent bg-accent/10 shadow-lg"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <div className="text-5xl mb-3">🏠</div>
                  <h3 className="text-2xl font-bold text-primary mb-2">
                    {language === "ar" ? "لا، شكراً" : "No, thanks"}
                  </h3>
                </motion.button>
              </div>
            </div>
          </StepContainer>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center pt-24 pb-16">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />

      <div className="pt-20 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {!isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-amber-900 mb-2">
                    {language === "ar" ? "يجب تسجيل الدخول أولاً" : "Please Login First"}
                  </h3>
                  <motion.button
                    onClick={() => navigate("/auth")}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all"
                  >
                    <LogIn className="w-5 h-5" />
                    {language === "ar" ? "تسجيل الدخول الآن" : "Login Now"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-primary">
                تعديل العقار
              </h2>
              <span className="text-muted-foreground">
                الخطوة {currentStep} من {totalSteps}
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                className="h-full bg-gradient-to-r from-accent to-accent-blue"
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-col items-center justify-between mt-12 gap-4">
            {errorMsg && (
              <div className="w-full bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-4 text-center">
                {errorMsg}
              </div>
            )}
            
            <div className="w-full flex items-center justify-between">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBack}
                disabled={currentStep === 1 || isSubmitting}
                className={`flex items-center gap-2 px-8 py-4 rounded-xl transition-all ${
                  currentStep === 1 || isSubmitting
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-white text-primary hover:shadow-lg"
                }`}
              >
                <ChevronRight className="w-5 h-5 rtl:rotate-180" />
                السابق
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-70"
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-4"></div>
                ) : (
                  <>
                    {currentStep === totalSteps ? "حفظ التعديلات" : "التالي"}
                    <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="bg-white rounded-3xl p-12 text-center max-w-md"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-16 h-16 text-white" />
              </motion.div>
              <h2 className="text-3xl font-bold text-primary mb-3">
                تم إرسال التعديلات!
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                ⏳ سيتم مراجعة تعديلاتك من قبل الأدمن ونشرها بعد الموافقة
              </p>
              <div className="w-16 h-1 bg-accent rounded-full mx-auto" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

function StepContainer({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: any;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-accent to-accent-blue rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-primary mb-2">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}