import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Phone, Mail, MessageCircle } from "lucide-react";
import ContactSellerModal from "./ContactSellerModal";
import { useApp } from "../context/AppContext";

interface ContactSellerProps {
  property: {
    id: string;
    title: string;
    ownerName?: string;
    ownerPhone?: string;
    ownerEmail?: string;
    userId?: string;
    [key: string]: any;
  };
}

export default function ContactSeller({ property }: ContactSellerProps) {
  const [showModal, setShowModal] = useState(false);
  const { language } = useApp();

  // استخدام البيانات الحقيقية من property أو fallback إلى بيانات تجريبية
  const seller = {
    name: property.ownerName || (language === "ar" ? "مالك العقار" : "Property Owner"),
    // ownerPhone (from user metadata) OR property.phone (from AddProperty form)
    phone: property.ownerPhone || property.phone || "",
    email: property.ownerEmail || "",
  };

  const hasPhone = !!seller.phone;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="sticky top-24 bg-card dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-border space-y-4"
      >
        <h3 className="text-xl font-bold text-primary dark:text-slate-100 mb-4">
          {language === "ar" ? "تواصل مع المالك" : "Contact Owner"}
        </h3>

        {/* Seller Info */}
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="w-12 h-12 bg-gradient-to-br from-accent to-accent-blue rounded-full flex items-center justify-center text-white font-bold text-lg">
            {seller.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-primary dark:text-slate-100">{seller.name}</p>
            <p className="text-sm text-muted-foreground">
              {language === "ar" ? "صاحب العقار" : "Property Owner"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Message Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowModal(true)}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-primary to-accent-blue text-white py-4 rounded-xl hover:shadow-lg transition-all font-bold"
          >
            <MessageCircle className="w-5 h-5" />
            {language === "ar" ? "أرسل رسالة" : "Send Message"}
          </motion.button>

          {/* Phone Button */}
          {hasPhone ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.open(`tel:${seller.phone}`)}
              className="w-full flex items-center justify-center gap-3 bg-accent/10 text-accent py-4 rounded-xl hover:bg-accent/20 transition-all font-bold"
            >
              <Phone className="w-5 h-5" />
              <span>{seller.phone}</span>
            </motion.button>
          ) : null}

          {/* WhatsApp Button */}
          {hasPhone && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const cleaned = seller.phone.replace(/\s+/g, "").replace(/^\+/, "");
                window.open(`https://wa.me/${cleaned}`, "_blank");
              }}
              className="w-full flex items-center justify-center gap-3 bg-green-500 text-white py-4 rounded-xl hover:bg-green-600 transition-all font-bold"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              {language === "ar" ? "واتساب" : "WhatsApp"}
            </motion.button>
          )}

          {/* Email Button */}
          {seller.email && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.open(`mailto:${seller.email}`)}
              className="w-full flex items-center justify-center gap-3 bg-accent-blue/10 text-accent-blue py-4 rounded-xl hover:bg-accent-blue/20 transition-all font-bold"
            >
              <Mail className="w-5 h-5" />
              {language === "ar" ? "إرسال بريد" : "Send Email"}
            </motion.button>
          )}
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            {language === "ar"
              ? "💡 تواصل مباشرة من خلال التطبيق للحصول على رد سريع"
              : "💡 Contact directly through the app for a quick response"}
          </p>
        </div>
      </motion.div>

      {/* Contact Modal */}
      <AnimatePresence>
        {showModal && (
          <ContactSellerModal
            propertyId={property.id}
            propertyTitle={property.title}
            ownerId={property.userId || ""}
            sellerName={seller.name}
            sellerPhone={seller.phone}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}