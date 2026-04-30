import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, Sparkles, User as UserIcon } from "lucide-react";
import { useApp } from "../context/AppContext";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

function buildPropertySummary(properties: any[], language: string): string {
  if (!properties || properties.length === 0) return language === "ar" ? "لا توجد عقارات متاحة حالياً" : "No properties available currently";
  
  const sample = properties.slice(0, 20);
  return sample.map(p =>
    language === "ar"
      ? `- ${p.title || ""} | نوع: ${p.type || ""} | ${p.category || ""} | محافظة: ${p.governorate || ""} | سعر: ${(p.price || 0).toLocaleString()} د.أ | مساحة: ${p.area || 0}م²`
      : `- ${p.title || ""} | Type: ${p.type || ""} | ${p.category || ""} | Gov: ${p.governorate || ""} | Price: ${(p.price || 0).toLocaleString()} JOD | Area: ${p.area || 0}sqm`
  ).join("\n");
}

function NashmiRobot({ size = 80 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }}
    >
      <circle cx="60" cy="60" r="55" fill="url(#mg1)" />
      <defs>
        <linearGradient id="mg1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="50%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
        <radialGradient id="eg1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.5" />
        </radialGradient>
      </defs>
      <rect x="35" y="35" width="50" height="45" rx="8" fill="url(#mg1)" stroke="#475569" strokeWidth="2" />
      <ellipse cx="55" cy="42" rx="12" ry="6" fill="white" opacity="0.3" />
      <path d="M 35 32 Q 60 28 85 32 L 85 40 Q 60 36 35 40 Z" fill="white" stroke="#DC2626" strokeWidth="1" />
      <line x1="35" y1="34" x2="85" y2="34" stroke="#DC2626" strokeWidth="2" />
      <line x1="35" y1="37" x2="85" y2="37" stroke="#DC2626" strokeWidth="1" />
      {[40, 50, 60, 70].map((x) => (
        <line key={x} x1={x} y1="32" x2={x + 5} y2="40" stroke="#DC2626" strokeWidth="1" opacity="0.6" />
      ))}
      <ellipse cx="60" cy="31" rx="26" ry="4" fill="#1F2937" />
      <ellipse cx="60" cy="32.5" rx="26" ry="3" fill="#111827" />
      <ellipse cx="60" cy="34" rx="26" ry="2" fill="#000000" />
      <path d="M 30 40 L 35 50 L 33 60 L 28 55 Z" fill="white" stroke="#DC2626" strokeWidth="1" />
      <line x1="30" y1="45" x2="33" y2="55" stroke="#DC2626" strokeWidth="1.5" />
      <path d="M 90 40 L 85 50 L 87 60 L 92 55 Z" fill="white" stroke="#DC2626" strokeWidth="1" />
      <line x1="90" y1="45" x2="87" y2="55" stroke="#DC2626" strokeWidth="1.5" />
      <circle cx="48" cy="52" r="5" fill="url(#eg1)" />
      <circle cx="72" cy="52" r="5" fill="url(#eg1)" />
      <circle cx="49" cy="50" r="2" fill="white" opacity="0.8" />
      <circle cx="73" cy="50" r="2" fill="white" opacity="0.8" />
      <line x1="60" y1="28" x2="60" y2="18" stroke="#64748B" strokeWidth="2" />
      <circle cx="60" cy="18" r="3" fill="#DC2626">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <path d="M 48 65 Q 60 70 72 65" stroke="#475569" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <line x1="40" y1="58" x2="45" y2="58" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="75" y1="58" x2="80" y2="58" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
      {[[38, 38], [82, 38], [38, 77], [82, 77]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.5" fill="#1F2937" />
      ))}
      <g transform="translate(85, 10)">
        <circle cx="0" cy="0" r="8" fill="white" stroke="#DC2626" strokeWidth="1" />
        <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fontSize="10">🇯🇴</text>
      </g>
    </svg>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 py-1">
      {[0, 0.2, 0.4].map((delay, i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.6, repeat: Infinity, delay }}
          className="w-2 h-2 bg-accent rounded-full"
        />
      ))}
    </div>
  );
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { language, properties } = useApp();

  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        text:
          language === "ar"
            ? "يا هلا وغلا! 🤵 أنا نشمي، مساعدك العقاري الذكي في بيتي.\n\nبقدر أساعدك في:\n\n🔹 البحث عن عقارات في أي محافظة\n🔹 معلومات عن المدارس والأسواق\n🔹 تفاصيل المواصلات والخدمات\n🔹 مقارنة الأسعار بين المناطق\n🔹 نصائح الشراء والإيجار\n\nتفضل، كيف بقدر أخدمك اليوم؟ 🏡"
            : "Welcome! 🤵 I'm Nashmi, your AI real estate assistant at Baity.\n\nI can help you with:\n\n🔹 Search for properties in any governorate\n🔹 Schools, markets & services info\n🔹 Transportation details\n🔹 Price comparisons between areas\n🔹 Buying & renting advice\n\nHow can I help you today? 🏡",
        sender: "bot",
        timestamp: new Date(),
      },
    ]);
  }, [language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    const history = [...messages, userMsg]
      .filter((m) => m.id !== "welcome")
      .slice(-10)
      .map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

    const propertySummary = buildPropertySummary(properties, language);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/chatbot`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            messages: history,
            language,
            propertySummary,
          }),
        }
      );

      const data = await response.json();
      const replyText =
        data?.data?.reply ||
        (language === "ar" ? "عذراً، صار خطأ. حاول مرة ثانية 🙏" : "Sorry, something went wrong. Please try again 🙏");

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), text: replyText, sender: "bot", timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: language === "ar"
            ? "عذراً، في مشكلة بالاتصال. تأكد من الاتصال بالإنترنت وحاول مجدداً. 🙏"
            : "Sorry, connection issue. Please check your internet and try again. 🙏",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        style={{ position: "fixed", insetInlineStart: "24px", bottom: "24px", insetInlineEnd: "auto" }}
        className="z-50 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:shadow-accent/50 transition-all relative overflow-visible"
      >
        {/* Ripple ring 1 */}
        <motion.span
          animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          className="absolute inset-0 rounded-full border-2 border-accent"
          style={{ pointerEvents: "none" }}
        />
        {/* Ripple ring 2 */}
        <motion.span
          animate={{ scale: [1, 1.6], opacity: [0.35, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
          className="absolute inset-0 rounded-full border border-accent/60"
          style={{ pointerEvents: "none" }}
        />
        <div className="relative z-10 w-full h-full">
          <NashmiRobot size={64} />
        </div>
      </motion.button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}

            className="fixed bottom-6 start-6 z-50 w-[92vw] max-w-[360px] h-[540px] max-h-[85vh] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col"
          >
            <div className="bg-gradient-to-r from-accent to-accent-blue p-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-11 h-11 flex-shrink-0">
                  <NashmiRobot size={44} />
                </div>
                <div>
                  <h3 className="font-bold text-white flex items-center gap-1.5 text-base">
                    {language === "ar" ? "نشمي 🤖" : "Nashmi 🤖"}
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  </h3>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-xs text-white/90 font-medium">
                      {language === "ar" ? "مساعد ذكاء اصطناعي · متصل" : "AI Assistant · Online"}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="bg-accent/5 border-b border-border px-3 py-1 flex items-center justify-center gap-1 flex-shrink-0">
              <Sparkles className="w-3 h-3 text-accent" />
              <span className="text-xs text-muted-foreground">
                {language === "ar" ? "🧠 قاعدة بيانات ذكية للمحافظات الأردنية الـ 12" : "🧠 Smart knowledge base · 12 Jordanian governorates"}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-background to-muted/20">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.sender === "bot" && (

                    <div className="w-8 h-8 flex-shrink-0">
                      <NashmiRobot size={32} />
                    </div>
                  )}

                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2.5 ${
                      message.sender === "user"
                        ? "bg-accent text-white rounded-ee-sm"
                        : "bg-card border border-border rounded-es-sm"
                    }`}
                  >
                    <p
                      className={`text-xs whitespace-pre-line leading-relaxed ${
                        message.sender === "user" ? "text-white" : "text-foreground"
                      }`}
                    >
                      {message.text}
                    </p>
                    <p
                      className={`text-[10px] mt-1 ${
                        message.sender === "user" ? "text-white/60 text-end" : "text-muted-foreground"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString(language === "ar" ? "ar-JO" : "en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {message.sender === "user" && (

                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <UserIcon className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2 justify-start"
                >
                  <div className="w-8 h-8 flex-shrink-0">
                    <NashmiRobot size={32} />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-es-sm px-3 py-2.5">
                    <TypingDots />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
            {messages.length === 1 && (
              <div className="px-3 pb-2 flex gap-1.5 flex-wrap flex-shrink-0">
                {(language === "ar"
                  ? ["🏠 عقارات في عمان", "💰 مقارنة الأسعار", "🏖️ شقق في العقبة", "🏡 فلل للبيع"]
                  : ["🏠 Amman properties", "💰 Price compare", "🏖️ Aqaba apartments", "🏡 Villas for sale"]
                ).map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => { setInputValue(prompt.replace(/^[^ ]+ /, "")); inputRef.current?.focus(); }}
                    className="text-xs px-2.5 py-1 bg-muted hover:bg-accent/10 hover:text-accent border border-border rounded-full transition-all whitespace-nowrap"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            <div className="p-3 border-t border-border bg-card flex-shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  disabled={isTyping}
                  placeholder={language === "ar" ? "اكتب سؤالك هنا..." : "Type your question here..."}
                  className="flex-1 px-3 py-2.5 bg-muted rounded-xl border-0 focus:ring-2 focus:ring-accent text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-50"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isTyping}
                  className="w-10 h-10 bg-gradient-to-br from-accent to-accent-blue text-white rounded-xl hover:shadow-lg hover:shadow-accent/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isTyping ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}