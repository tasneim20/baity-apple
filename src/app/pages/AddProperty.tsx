import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Home, MapPin, DollarSign, CheckCircle2, AlertCircle,
  X, Upload, ChevronRight, ChevronLeft, Loader2, LogIn,
  Image as ImageIcon,
} from "lucide-react";
import Navbar from "../components/Navbar";
import LocationPicker from "../components/LocationPicker";
import { governorates, propertyTypes } from "../data/mockData";
import { useApp, getValidToken } from "../context/AppContext";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { motion, AnimatePresence } from "motion/react";

// ─── Real Jordan governorate center coordinates
const GOVERNORATE_COORDS: Record<string, { lat: number; lng: number }> = {
  "عمان":    { lat: 31.9539, lng: 35.9106 },
  "عمّان":   { lat: 31.9539, lng: 35.9106 },
  "الزرقاء": { lat: 32.0728, lng: 36.0879 },
  "إربد":    { lat: 32.5568, lng: 35.8469 },
  "العقبة":  { lat: 29.5326, lng: 35.0063 },
  "المفرق":  { lat: 32.3411, lng: 36.2036 },
  "البلقاء": { lat: 32.0318, lng: 35.7314 },
  "الكرك":   { lat: 31.1847, lng: 35.7024 },
  "مادبا":   { lat: 31.7168, lng: 35.7935 },
  "مأدبا":   { lat: 31.7168, lng: 35.7935 },
  "جرش":     { lat: 32.2797, lng: 35.8993 },
  "عجلون":   { lat: 32.3261, lng: 35.7523 },
  "معان":    { lat: 30.1928, lng: 35.7364 },
  "الطفيلة": { lat: 30.8394, lng: 35.6055 },
};

// Convert a blob/object URL to base64 data URL
async function blobUrlToBase64(blobUrl: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    const mimeType = blob.type || "image/jpeg";
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ base64: reader.result as string, mimeType });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Format number with thousands commas  (e.g. 50555 → "50,555")
function formatPrice(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return parseInt(digits, 10).toLocaleString("en-US");
}

export default function AddProperty() {
  const navigate = useNavigate();
  const { isAuthenticated, language, addProperty, uploadFile } = useApp();
  const ar = language === "ar";
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [stepError, setStepError] = useState(""); // per-step validation error
  const mapRef = useRef<HTMLDivElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    category: "",
    type: "",
    governorate: "",
    location: { lat: 31.9454, lng: 35.9284 },
    price: "",        // stored as formatted string e.g. "50,555"
    area: "",
    bedrooms: "",
    bathrooms: "",
    phone: "",        // رقم الهاتف - إلزامي
    description: "",
    images: [] as string[],
    sponsoredAd: false,
  });

  const totalSteps = 9;

  // ── Step validation ─────────────────────────────────────────────────────
  const validateStep = (step: number): string => {
    switch (step) {
      case 1:
        if (!formData.category)
          return ar ? "يرجى اختيار نوع العملية (بيع أو إيجار)" : "Please select operation type (sale or rent)";
        return "";
      case 2:
        if (!formData.type)
          return ar ? "يرجى اختيار نوع العقار" : "Please select a property type";
        return "";
      case 3:
        if (!formData.governorate)
          return ar ? "يرجى اختيار المحافظة" : "Please select a governorate";
        return "";
      case 4:
        return ""; // location has default value
      case 5: {
        const raw = formData.price.replace(/,/g, "");
        if (!raw || parseInt(raw, 10) <= 0)
          return ar ? "يرجى إدخال سعر صحيح أكبر من صفر" : "Please enter a valid price greater than zero";
        return "";
      }
      case 6:
        if (!formData.area || parseInt(formData.area, 10) <= 0)
          return ar ? "يرجى إدخال مساحة العقار" : "Please enter the property area";
        return "";
      case 7: {
        // phone validation — 9 digits only (country code +962 is fixed)
        const cleanPhone = formData.phone.replace(/\D/g, "");
        if (!cleanPhone)
          return ar ? "رقم الهاتف مطلوب" : "Phone number is required";
        if (cleanPhone.length !== 9)
          return ar ? "رقم الهاتف يجب أن يكون 9 أرقام بالضبط" : "Phone must be exactly 9 digits";
        return "";
      }
      case 8:
        if (!formData.description.trim() || formData.description.trim().length < 10)
          return ar ? "يرجى كتابة وصف للعقار (10 أحرف على الأقل)" : "Please write a description (at least 10 characters)";
        return "";
      case 9: // images (was 8 before phone step)
        return "";
      default:
        return "";
    }
  };

  const handleSubmitProperty = async () => {
    if (!isAuthenticated) return;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const userToken = await getValidToken();
      if (!userToken) {
        setSubmitError(ar ? "يجب تسجيل الدخول" : "Please login first");
        setIsSubmitting(false);
        return;
      }

      // Upload images to storage
      let imageUrls: string[] = [];
      for (const imgUrl of formData.images) {
        if (imgUrl.startsWith("blob:") || imgUrl.startsWith("data:")) {
          const imgData = imgUrl.startsWith("blob:")
            ? await blobUrlToBase64(imgUrl)
            : { base64: imgUrl, mimeType: "image/jpeg" };

          if (imgData) {
            const ext = imgData.mimeType.split("/")[1] || "jpg";
            const uploaded = await uploadFile(imgData.base64, imgData.mimeType, `property.${ext}`);
            // Prefer publicUrl (never expires), fallback to signedUrl
            const finalUrl = uploaded?.publicUrl || uploaded?.signedUrl;
            if (finalUrl) imageUrls.push(finalUrl);
          }
        } else if (imgUrl.startsWith("http")) {
          imageUrls.push(imgUrl);
        }
      }

      // Build auto-generated title
      const catLabel = formData.category === "بيع" ? "للبيع" : formData.category === "إيجار" ? "��لإيجار" : formData.category;
      const title = `${formData.type} ${catLabel} في ${formData.governorate}`;

      // Remove commas from price before sending
      const rawPrice = parseInt(formData.price.replace(/,/g, ""), 10) || 0;

      const propertyPayload = {
        title,
        description: formData.description,
        type: formData.type,
        category: formData.category,
        governorate: formData.governorate,
        price: rawPrice,
        area: parseInt(formData.area) || 0,
        bedrooms: parseInt(formData.bedrooms) || 0,
        bathrooms: parseInt(formData.bathrooms) || 0,
        phone: formData.phone,
        image: imageUrls[0] || "",
        images: imageUrls,
        views: 0,
        inquiries: 0,
        featured: false,
        location: formData.location,
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/properties`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "X-User-Token": userToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(propertyPayload),
        }
      );

      const data = await response.json();
      if (data.success) {
        // Property submitted for admin review — refresh public properties list
        // (won't appear publicly until admin approves it)
        setShowSuccess(true);
        setTimeout(() => navigate("/my-properties"), 3000);
      } else {
        setSubmitError(data.error || (ar ? "تعذر نشر العقار" : "Failed to publish property"));
      }
    } catch (e: any) {
      console.error("Submit property error:", e);
      setSubmitError(ar ? "حدث خطأ أثناء النشر" : "An error occurred while publishing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    // Validate current step first
    const err = validateStep(currentStep);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError("");

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmitProperty();
    }
  };

  const handleBack = () => {
    setStepError("");
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).slice(0, 10 - formData.images.length);
      const imageUrls = newImages.map((file) => URL.createObjectURL(file));
      setFormData({
        ...formData,
        images: [...formData.images, ...imageUrls],
      });
      if (stepError && imageUrls.length > 0) setStepError("");
    }
  };

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    });
  };

  // Step error component (reusable inline)
  const StepError = () =>
    stepError ? (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl px-4 py-3 text-sm mb-4"
      >
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{stepError}</span>
      </motion.div>
    ) : null;

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepContainer
            icon={Home}
            title={ar ? "نوع العملية" : "Operation Type"}
            description={ar ? "هل تريد بيع أو تأجير العقار؟" : "Do you want to sell or rent the property?"}
          >
            <StepError />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["بيع", "إيجار"].map((cat) => (
                <motion.button
                  key={cat}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setFormData({ ...formData, category: cat });
                    setStepError("");
                  }}
                  className={`p-8 rounded-2xl border-2 transition-all ${
                    formData.category === cat
                      ? "border-accent bg-accent/10 shadow-lg"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-center">
                    {cat === "بيع"
                      ? <DollarSign className="w-10 h-10 text-accent" />
                      : <Home className="w-10 h-10 text-primary" />}
                  </div>
                  <h3 className="text-2xl font-bold text-primary">{cat}</h3>
                  {formData.category === cat && (
                    <CheckCircle2 className="w-5 h-5 text-accent mx-auto mt-2" />
                  )}
                </motion.button>
              ))}
            </div>
          </StepContainer>
        );

      case 2:
        return (
          <FormStep
            icon={Home}
            title={ar ? "نوع العقار" : "Property Type"}
            description={ar ? "حدد نوع العقار الذي تريد عرضه" : "Select the property type you want to list"}
          >
            <StepError />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {propertyTypes.slice(1).map((type, index) => (
                <motion.button
                  key={`${type.id}-${index}`}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setFormData({ ...formData, type: type.name });
                    setStepError("");
                  }}
                  className={`p-6 rounded-xl border-2 transition-all relative ${
                    formData.type === type.name
                      ? "border-accent bg-accent/10 shadow-lg"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <h3 className="text-lg font-bold text-primary">{type.name}</h3>
                  {formData.type === type.name && (
                    <CheckCircle2 className="w-4 h-4 text-accent absolute top-2 end-2" />
                  )}
                </motion.button>
              ))}
            </div>
          </FormStep>
        );

      case 3:
        return (
          <StepContainer
            icon={MapPin}
            title={ar ? "المحافظة" : "Governorate"}
            description={ar ? "حدد موقع العقار" : "Select the property location"}
          >
            <StepError />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {governorates.map((gov) => (
                <motion.button
                  key={gov.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    const coords = GOVERNORATE_COORDS[gov.name] || { lat: 31.9539, lng: 35.9106 };
                    setFormData({ ...formData, governorate: gov.name, location: coords });
                    setStepError("");
                  }}
                  className={`p-6 rounded-xl border-2 transition-all relative ${
                    formData.governorate === gov.name
                      ? "border-accent bg-accent/10 shadow-lg"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <h3 className="text-lg font-bold text-primary">{gov.name}</h3>
                  {formData.governorate === gov.name && (
                    <CheckCircle2 className="w-4 h-4 text-accent absolute top-2 end-2" />
                  )}
                </motion.button>
              ))}
            </div>
          </StepContainer>
        );

      case 4:
        return (
          <StepContainer
            icon={MapPin}
            title={ar ? "الموقع الجغرافي" : "Geographic Location"}
            description={ar
              ? `اضغط على الخريطة أو اسحب العلامة لتحديد الموقع الدقيق في ${formData.governorate || "المحافظة"}`
              : `Click on the map or drag the pin to set the exact location in ${formData.governorate}`}
          >
            {formData.location?.lat && formData.location?.lng ? (
              <LocationPicker
                lat={formData.location.lat}
                lng={formData.location.lng}
                governorate={formData.governorate}
                language={language}
                onChange={(newLat, newLng) => {
                  setFormData(prev => ({
                    ...prev,
                    location: { lat: newLat, lng: newLng },
                  }));
                }}
              />
            ) : (
              <div className="w-full h-72 bg-muted rounded-2xl flex items-center justify-center border-2 border-dashed border-border">
                <div className="text-center">
                  <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    {ar ? "يرجى اختيار المحافظة أولاً لتفعيل الخريطة" : "Please select a governorate first to enable the map"}
                  </p>
                </div>
              </div>
            )}
          </StepContainer>
        );

      case 5:
        return (
          <StepContainer
            icon={DollarSign}
            title={ar ? "السعر" : "Price"}
            description={ar
              ? `حدد ${formData.category === "إيجار" ? "الإيجار الشهري" : "سعر البيع"}`
              : `Set the ${formData.category === "إيجار" ? "monthly rent" : "sale price"}`}
          >
            <StepError />
            <div className="max-w-md mx-auto">
              <div className="relative">
                <div className="absolute start-6 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground select-none">
                  {ar ? "د.أ" : "JOD"}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.price}
                  onChange={(e) => {
                    const formatted = formatPrice(e.target.value);
                    setFormData({ ...formData, price: formatted });
                    if (stepError) setStepError("");
                  }}
                  placeholder={ar ? "0" : "0"}
                  className={`w-full ps-20 pe-6 py-6 text-3xl font-bold text-center bg-muted rounded-2xl border-2 focus:outline-none transition-all ${
                    stepError ? "border-red-400 bg-red-50 dark:bg-red-900/10" : "border-border focus:border-accent"
                  }`}
                  dir="ltr"
                />
              </div>
              {formData.price && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-accent font-bold mt-3 text-lg"
                >
                  {formData.price} {ar ? "دينار أردني" : "JOD"}
                </motion.p>
              )}
              <p className="text-center text-muted-foreground mt-2 text-sm">
                {formData.category === "إيجار"
                  ? (ar ? "السعر الشهري بالدينار الردني" : "Monthly price in Jordanian Dinar")
                  : (ar ? "السعر الإجمالي بالدينار الأردني" : "Total price in Jordanian Dinar")}
              </p>
            </div>
          </StepContainer>
        );

      case 6:
        return (
          <StepContainer
            icon={Home}
            title={ar ? "المساحة والغرف" : "Area & Rooms"}
            description={ar ? "حدد مساحة العقار وعدد الغرف" : "Set the property area and room count"}
          >
            <StepError />
            <div className="max-w-md mx-auto space-y-6">
              <div>
                <label className="block text-sm font-bold text-primary mb-2">
                  {ar ? "المساحة (م²)" : "Area (m²)"}
                  <span className="text-red-500 ms-1">*</span>
                </label>
                <input
                  type="number"
                  value={formData.area}
                  onChange={(e) => {
                    setFormData({ ...formData, area: e.target.value });
                    if (stepError) setStepError("");
                  }}
                  placeholder={ar ? "مثال: 150" : "e.g. 150"}
                  min="1"
                  className={`w-full px-6 py-4 bg-muted rounded-xl border-2 focus:outline-none transition-all ${
                    stepError ? "border-red-400 bg-red-50" : "border-border focus:border-accent"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-primary mb-2">
                    {ar ? "غرف النوم" : "Bedrooms"}
                  </label>
                  <input
                    type="number"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                    placeholder="3"
                    min="0"
                    className="w-full px-6 py-4 bg-muted rounded-xl border-2 border-border focus:border-accent focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary mb-2">
                    {ar ? "الحمامات" : "Bathrooms"}
                  </label>
                  <input
                    type="number"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                    placeholder="2"
                    min="0"
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
            title={ar ? "رقم الهاتف" : "Phone Number"}
            description={ar ? "أدخل رقم هاتفك الأردني للتواصل مع المهتمين بالعقار" : "Enter your Jordanian phone number for property inquiries"}
          >
            <StepError />
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <label className="block text-sm font-bold text-primary mb-2">
                  {ar ? "رقم الهاتف" : "Phone Number"}
                  <span className="text-red-500 ms-1">*</span>
                </label>
                {/* Fixed +962 prefix + 9-digit input */}
                <div className={`flex items-center overflow-hidden rounded-xl border-2 transition-all ${
                  stepError ? "border-red-400 bg-red-50 dark:bg-red-900/10" : "border-border focus-within:border-accent"
                }`}>
                  <div className="flex items-center gap-2 px-4 py-4 bg-accent/10 border-e border-border shrink-0 select-none">
                    <span className="text-lg">🇯🇴</span>
                    <span className="font-bold text-primary text-base tracking-wide" dir="ltr">+962</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={formData.phone}
                    onChange={(e) => {
                      // Only digits, max 9
                      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 9);
                      setFormData({ ...formData, phone: digitsOnly });
                      if (stepError) setStepError("");
                    }}
                    placeholder={ar ? "7XXXXXXXX" : "7XXXXXXXX"}
                    dir="ltr"
                    maxLength={9}
                    className="flex-1 px-4 py-4 text-lg bg-transparent outline-none text-primary tracking-widest"
                  />
                  <div className="px-3 shrink-0">
                    <span className={`text-xs font-bold ${formData.phone.length === 9 ? "text-green-500" : "text-muted-foreground"}`}>
                      {formData.phone.length}/9
                    </span>
                  </div>
                </div>
                {formData.phone.length === 9 && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                    <span>✓</span>
                    <span dir="ltr" className="font-mono">+962 {formData.phone}</span>
                  </p>
                )}
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <span className="text-lg">📞</span>
                  {ar
                    ? "سيتم عرض رقم هاتفك للمهتمين بشراء أو استئجار العقار. تأكد من إدخال رقم أردني صحيح."
                    : "Your phone number will be shown to interested buyers/renters. Make sure to enter a valid Jordanian number."}
                </p>
              </div>
            </div>
          </StepContainer>
        );

      case 8:
        return (
          <StepContainer
            icon={Home}
            title={ar ? "الوصف" : "Description"}
            description={ar ? "اكتب وصفاً مفصلاً للعقار" : "Write a detailed description of the property"}
          >
            <StepError />
            <div className="max-w-2xl mx-auto">
              <textarea
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (stepError) setStepError("");
                }}
                placeholder={ar ? "اكتب وصفاً تفصيلاً للعقار، المميزات، والموقع..." : "Write a detailed description of the property, its features, and location..."}
                rows={8}
                className={`w-full px-6 py-4 bg-muted rounded-xl border-2 focus:outline-none transition-all resize-none ${
                  stepError ? "border-red-400 bg-red-50" : "border-border focus:border-accent"
                }`}
              />
              <div className="flex justify-between items-center mt-2">
                <span className={`text-xs ${formData.description.length < 10 ? "text-red-400" : "text-muted-foreground"}`}>
                  {formData.description.length} {ar ? "رف" : "chars"} {ar ? "(10 على الأقل)" : "(min 10)"}
                </span>
              </div>
            </div>
          </StepContainer>
        );

      case 9:
        return (
          <StepContainer
            icon={ImageIcon}
            title={ar ? "الصور" : "Photos"}
            description={ar ? "أضف حتى 4 صور للعقار (صورة واحدة مطلوبة)" : "Add up to 4 photos (at least 1 required)"}
          >
            <StepError />
            <div className="max-w-2xl mx-auto">
              {/* Image Upload */}
              {formData.images.length < 10 && (
                <label className={`block w-full p-12 border-2 border-dashed rounded-2xl hover:border-accent transition-all cursor-pointer bg-muted/50 ${
                  stepError ? "border-red-400 bg-red-50" : "border-border"
                }`}>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="text-center">
                    <Upload className={`w-16 h-16 mx-auto mb-4 ${stepError ? "text-red-400" : "text-muted-foreground"}`} />
                    <p className="text-lg font-bold text-primary mb-2">
                      {ar ? "اضغط لرفع الصور" : "Click to upload photos"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {ar
                        ? `يمكنك رفع حتى ${10 - formData.images.length} صور`
                        : `Upload up to ${10 - formData.images.length} photos`}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {ar ? `${formData.images.length}/10 صور` : `${formData.images.length}/10 photos`}
                    </p>
                  </div>
                </label>
              )}

              {/* Image Preview */}
              {formData.images.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mt-6">
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
                      {index === 0 && (
                        <div className="absolute bottom-1 start-1 bg-accent text-white text-[10px] px-2 py-0.5 rounded-lg">
                          {ar ? "رئيسية" : "Main"}
                        </div>
                      )}
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

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
      <Navbar />

      <div className="pt-20 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Login Warning - Only show if not authenticated */}
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
                    {ar ? "يجب تسجيل الدخول أولاً" : "Please Login First"}
                  </h3>
                  <p className="text-amber-700 mb-4">
                    {ar
                      ? "لإضافة عقارك على المنصة، يجب عليك تسجيل الدخول أو إنشاء حساب جديد."
                      : "To add your property to the platform, you need to login or create a new account."}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/auth")}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all"
                  >
                    <LogIn className="w-5 h-5" />
                    {ar ? "تسجيل الدخول الآن" : "Login Now"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Progress Bar */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-primary">
                {ar ? "أضف عقارك" : "Add Property"}
              </h2>
              <span className="text-muted-foreground text-sm">
                {ar
                  ? `الخطوة ${currentStep} من ${totalSteps}`
                  : `Step ${currentStep} of ${totalSteps}`}
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
            {/* Step labels */}
            <div className="flex justify-between mt-2">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                <div
                  key={s}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    s < currentStep
                      ? "bg-accent text-white"
                      : s === currentStep
                      ? "bg-accent/20 text-accent border-2 border-accent"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s < currentStep ? "✓" : s}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Step Content */}
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

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-12">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBack}
              disabled={currentStep === 1 || isSubmitting}
              className={`flex items-center gap-2 px-8 py-4 rounded-xl transition-all ${
                currentStep === 1
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-white dark:bg-slate-700 text-primary dark:text-slate-100 hover:shadow-lg"
              }`}
            >
              <ChevronRight className="w-5 h-5 rtl:rotate-180" />
              {ar ? "السابق" : "Back"}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-accent to-amber-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {ar ? "جاري الإرسال..." : "Submitting..."}
                </>
              ) : currentStep === totalSteps ? (
                ar ? "إرسال للمراجعة" : "Submit for Review"
              ) : (
                ar ? "التالي" : "Next"
              )}
              {!isSubmitting && <ChevronLeft className="w-5 h-5 rtl:rotate-180" />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
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
              <h2 className="text-3xl font-bold text-primary mb-4">
                {ar ? "تم إرسال عقارك بنجاح! ⏳" : "Property Submitted! ⏳"}
              </h2>
              <p className="text-muted-foreground mb-4">
                {ar
                  ? "عقارك الآن قيد مراجعة الأدمن وسيظهر على الموقع بعد الموافقة عليه."
                  : "Your property is now under admin review and will appear on the site once approved."}
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-700">
                {ar ? "يمكنك متابعة حالة عقارك من صفحة \"عقاراتي\"" : "You can track your property status from \"My Properties\""}
              </div>
              <div className="w-16 h-1 bg-accent rounded-full mx-auto" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submitting Modal */}
      <AnimatePresence>
        {isSubmitting && (
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
              <Loader2 className="w-24 h-24 text-accent animate-spin mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-primary mb-4">
                {ar ? "جاري إرسال العقار للمراجعة..." : "Submitting for Review..."}
              </h2>
              <p className="text-muted-foreground mb-6">
                {ar ? "يرجى الانتظار، يتم الآن رفع الصور وحفظ بيانات العقار" : "Please wait while we upload images and save your property"}
              </p>
              <div className="w-16 h-1 bg-accent rounded-full mx-auto" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Modal */}
      <AnimatePresence>
        {submitError && !isSubmitting && (
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
              <AlertCircle className="w-24 h-24 text-red-500 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-primary mb-4">
                {ar ? "حدث خطأ!" : "Error!"}
              </h2>
              <p className="text-muted-foreground mb-6">{submitError}</p>
              <button
                onClick={() => setSubmitError("")}
                className="bg-accent text-white px-8 py-3 rounded-xl font-bold hover:bg-accent/90 transition-colors"
              >
                {ar ? "حسناً" : "OK"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Step Container Component
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
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 md:p-12 shadow-xl">
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

// Form Step Container Component
function FormStep({
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
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 md:p-12 shadow-xl">
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