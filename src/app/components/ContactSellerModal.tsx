import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, Phone, MessageCircle, Loader2, CheckCircle } from "lucide-react";
import { useApp } from "../context/AppContext";

interface ContactSellerModalProps {
  propertyId: string;
  propertyTitle: string;
  ownerId: string;
  sellerName: string;
  sellerPhone: string;
  onClose: () => void;
}

export default function ContactSellerModal({
  propertyId,
  propertyTitle,
  ownerId,
  sellerName,
  sellerPhone,
  onClose,
}: ContactSellerModalProps) {
  const { language, sendMessage, isAuthenticated, user } = useApp();
  const ar = language === "ar";
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sentSuccess]);

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;
    if (!isAuthenticated) {
      setError(ar ? "يجب تسجيل الدخول لإرسال رسالة" : "You must log in to send a message");
      return;
    }
    if (!ownerId) {
      setError(ar ? "لا يمكن تحديد المالك" : "Cannot identify owner");
      return;
    }

    setIsSending(true);
    setError("");

    try {
      // sendMessage in AppContext calls POST /messages with propertyId and recipientId
      // The server builds threadId = "thread_" + propertyId + "_" + inquirerId
      // We need to pass ownerId to the message body
      const { sendMessageDirect } = await import("../utils/messagingHelper");
      const ok = await sendMessageDirect({
        text,
        propertyId,
        ownerId,
      });

      if (ok) {
        setSentSuccess(true);
        setInputText("");
      } else {
        setError(ar ? "فشل إرسال الرسالة، حاول مرة أخرى" : "Failed to send message, please try again");
      }
    } catch (e) {
      console.error("Send message error:", e);
      setError(ar ? "حدث خطأ أثناء الإرسال" : "An error occurred while sending");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-accent-blue p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold">{sellerName}</h3>
                <p className="text-white/70 text-xs">{ar ? "صاحب العقار" : "Property Owner"}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-white/70 text-xs mb-1">{ar ? "العقار:" : "Property:"}</p>
            <p className="text-white text-sm font-medium line-clamp-1">{propertyTitle}</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {!isAuthenticated ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-7 h-7 text-amber-500" />
              </div>
              <p className="font-bold text-primary mb-1">
                {ar ? "يجب تسجيل الدخول" : "Login Required"}
              </p>
              <p className="text-sm text-muted-foreground">
                {ar ? "سجّل دخولك لإرسال رسائل لأصحاب العقارات" : "Login to send messages to property owners"}
              </p>
            </div>
          ) : sentSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h4 className="text-xl font-bold text-primary mb-2">
                {ar ? "تم إرسال رسالتك!" : "Message Sent!"}
              </h4>
              <p className="text-muted-foreground text-sm mb-4">
                {ar
                  ? `تم إرسال رسالتك لـ ${sellerName}. يمكنك متابعة المحادثة من صندوق الرسائل.`
                  : `Your message was sent to ${sellerName}. You can follow up from your messages inbox.`}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gradient-to-r from-accent to-amber-500 text-white rounded-xl font-bold"
              >
                {ar ? "حسناً" : "OK"}
              </button>
              <div ref={messagesEndRef} />
            </motion.div>
          ) : (
            <>
              {/* Quick suggestion messages */}
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-2">
                  {ar ? "رسائل سريعة:" : "Quick messages:"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(ar
                    ? ["أريد الاستفسار عن العقار", "هل السعر قابل للتفاوض؟", "متى يمكنني المعاينة؟"]
                    : ["I want to inquire about the property", "Is the price negotiable?", "When can I view it?"]
                  ).map((msg) => (
                    <button
                      key={msg}
                      onClick={() => setInputText(msg)}
                      className="text-xs px-3 py-1.5 bg-muted hover:bg-accent/10 hover:text-accent rounded-lg border border-border transition-colors"
                    >
                      {msg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone */}
              {sellerPhone && (
                <a
                  href={`tel:${sellerPhone}`}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl hover:bg-green-100 transition-colors"
                >
                  <Phone className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">{sellerPhone}</span>
                </a>
              )}

              {/* Error */}
              {error && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              {/* Input */}
              <div className="flex items-end gap-2">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={ar ? "اكتب رسالتك هنا..." : "Type your message here..."}
                  rows={3}
                  className="flex-1 px-4 py-3 bg-muted dark:bg-slate-700 rounded-xl border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none resize-none text-sm"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendMessage}
                  disabled={isSending || !inputText.trim()}
                  className="w-11 h-11 bg-gradient-to-br from-accent to-accent-blue rounded-xl flex items-center justify-center text-white shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </motion.button>
              </div>
              <p className="text-xs text-muted-foreground">
                {ar ? "Enter للإرسال · Shift+Enter لسطر جديد" : "Enter to send · Shift+Enter for new line"}
              </p>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
