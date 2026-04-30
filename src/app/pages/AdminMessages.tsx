import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  MessageSquare, Search, RefreshCw, CheckCircle, XCircle,
  Shield, Eye, Trash2, Edit3, Clock, User, X, Check,
  MapPin, ArrowRight, MessageCircle, AlertTriangle,
  ChevronLeft, Filter, Calendar, Send, PenSquare,
  Home, ChevronDown, Reply,
} from "lucide-react";
import AdminNavbar from "../components/AdminNavbar";
import { useApp, getValidToken } from "../context/AppContext";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b`;

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("ar-JO", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function timeAgo(dateStr: string): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "منذ لحظات";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  return `منذ ${Math.floor(hrs / 24)} يوم`;
}

// ─── Message bubble (admin view) ─────────────────────────────────────────────
function MessageBubble({
  message, convSenderId, senderName, receiverName,
  adminId, onDelete, onEdit, loading,
}: {
  message: any; convSenderId: string;
  senderName: string; receiverName: string;
  adminId: string;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  loading: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || "");
  const isSender = message.sender_id === convSenderId;
  const isAdmin  = message.sender_id === adminId;

  const handleEditSave = () => {
    if (!editText.trim()) return;
    onEdit(message.id, editText);
    setEditing(false);
  };

  return (
    <div className={`flex flex-col gap-1 ${isSender ? "items-start" : "items-end"}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        {isAdmin && (
          <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-black px-1.5 py-0.5 rounded-full">
            🛡️ أدمن
          </span>
        )}
        <User className="w-3 h-3" />
        <span className="font-bold">{isSender ? senderName : receiverName}</span>
        <span>•</span>
        <span>{formatDate(message.created_at)}</span>
        {message.edited_at && <span className="text-amber-500">(مُعدَّل)</span>}
      </div>

      <div className={`max-w-[85%] rounded-2xl px-4 py-3 border ${
        isAdmin
          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
          : isSender
            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
            : "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600"
      }`}>
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editText} onChange={(e) => setEditText(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={handleEditSave} disabled={loading || !editText.trim()}
                className="flex items-center gap-1 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-bold disabled:opacity-50">
                <Check className="w-3 h-3" /> حفظ
              </button>
              <button onClick={() => { setEditing(false); setEditText(message.text || ""); }}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-bold hover:bg-muted">
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <>
            {message.type === "text" && message.text && (
              <p className="text-sm leading-relaxed whitespace-pre-line">{message.text}</p>
            )}
            {message.type === "file" && message.image_url && (
              <div>
                <img src={message.image_url} alt="مرفق" className="max-w-xs rounded-xl"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                {message.text && <p className="text-sm mt-2">{message.text}</p>}
              </div>
            )}
            {message.type === "location" && message.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-accent" />
                <span>{message.location.lat?.toFixed(4)}, {message.location.lng?.toFixed(4)}</span>
              </div>
            )}
            <div className="flex gap-2 mt-2 pt-2 border-t border-border/40">
              {message.text && (
                <button onClick={() => { setEditing(true); setEditText(message.text || ""); }}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-200 rounded-lg text-xs font-bold transition-colors">
                  <Edit3 className="w-3 h-3" /> تعديل
                </button>
              )}
              <button onClick={() => { if (confirm("حذف هذه الرسالة؟")) onDelete(message.id); }}
                disabled={loading}
                className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
                <Trash2 className="w-3 h-3" /> حذف
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Conversation Modal (view + reply as admin) ───────────────────────────────
function ConversationModal({
  conv, adminId, onClose, onDeleteMsg, onEditMsg, onDeleteConv, onAdminReply, loading,
}: {
  conv: any; adminId: string;
  onClose: () => void;
  onDeleteMsg: (id: string) => void;
  onEditMsg: (id: string, text: string) => void;
  onDeleteConv: (id: string) => void;
  onAdminReply: (convId: string, ownerId: string, propertyId: string, text: string) => Promise<void>;
  loading: boolean;
}) {
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.messages?.length]);

  const handleSend = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      // حدّد الطرف الآخر (غير الأدمن)
      const otherId = conv.sender_id !== adminId ? conv.sender_id : conv.receiver_id;
      await onAdminReply(conv.id, otherId, conv.property_id || conv.propertyId || "", replyText.trim());
      setReplyText("");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full my-4 overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black">تفاصيل المحادثة</h3>
                <p className="text-slate-400 text-xs">{conv.messages?.length || 0} رسالة</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              <span className="text-slate-400">المستفسر:</span>
              <span className="font-bold">{conv.sender_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-green-400" />
              <span className="text-slate-400">المالك:</span>
              <span className="font-bold">{conv.receiver_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">العقار:</span>
              <span className="font-bold">{conv.property_title}</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="p-5 max-h-[400px] overflow-y-auto space-y-4">
          {conv.messages && conv.messages.length > 0 ? (
            conv.messages.map((msg: any) => (
              <MessageBubble
                key={msg.id} message={msg}
                convSenderId={conv.sender_id}
                senderName={conv.sender_name}
                receiverName={conv.receiver_name}
                adminId={adminId}
                onDelete={onDeleteMsg} onEdit={onEditMsg}
                loading={loading}
              />
            ))
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>لا توجد رسائل</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Admin Reply Box ── */}
        <div className="px-5 pb-3 border-t border-border bg-amber-50/50 dark:bg-amber-900/10">
          <div className="flex items-center gap-2 py-2 mb-2">
            <Reply className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-black text-amber-700 dark:text-amber-300">
              رد الأدمن 🛡️
            </span>
            <span className="text-xs text-muted-foreground">— سيظهر للطرفين في المحادثة</span>
          </div>
          <div className="flex gap-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب ردك هنا... (Enter للإرسال، Shift+Enter لسطر جديد)"
              rows={2}
              className="flex-1 px-3 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
            <button
              onClick={handleSend}
              disabled={!replyText.trim() || sending}
              className="self-end px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 shrink-0"
            >
              {sending
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Send className="w-4 h-4" />}
              إرسال
            </button>
          </div>
        </div>

        {/* Delete conv */}
        <div className="p-4 border-t border-border bg-red-50 dark:bg-red-950/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p className="text-xs">حذف المحادثة بالكامل لا يمكن التراجع عنه</p>
          </div>
          <button
            onClick={() => { if (confirm("حذف هذه المحادثة؟ لا يمكن التراجع.")) onDeleteConv(conv.id); }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 shrink-0"
          >
            <Trash2 className="w-4 h-4" /> حذف المحادثة
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Compose Modal (admin → user new conversation) ───────────────────────────
function ComposeModal({
  conversations, properties, adminId, onClose, onSend, loading,
}: {
  conversations: any[];
  properties: any[];
  adminId: string;
  onClose: () => void;
  onSend: (ownerId: string, propertyId: string, text: string) => Promise<boolean>;
  loading: boolean;
}) {
  const [step, setStep] = useState<"user" | "message">("user");
  const [search, setSearch]               = useState("");
  const [selectedUser, setSelectedUser]   = useState<any>(null);
  const [selectedProp, setSelectedProp]   = useState<any>(null);
  const [messageText, setMessageText]     = useState("");
  const [sending, setSending]             = useState(false);
  const [showProps, setShowProps]         = useState(false);

  // استخرج المستخدمين الفريدين من المحادثات
  const uniqueUsers = (() => {
    const map = new Map<string, any>();
    conversations.forEach(c => {
      if (c.sender_id && c.sender_id !== adminId) {
        map.set(c.sender_id, { id: c.sender_id, name: c.sender_name || "مستخدم", email: c.sender_email || "" });
      }
      if (c.receiver_id && c.receiver_id !== adminId) {
        map.set(c.receiver_id, { id: c.receiver_id, name: c.receiver_name || "مستخدم", email: c.receiver_email || "" });
      }
    });
    return Array.from(map.values());
  })();

  const filteredUsers = uniqueUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // عقارات المستخدم المحدد من conversations
  const userProperties = selectedUser
    ? conversations
        .filter(c => c.sender_id === selectedUser.id || c.receiver_id === selectedUser.id)
        .map(c => ({ id: c.property_id || c.propertyId, title: c.property_title || "عقار" }))
        .filter((p, i, arr) => p.id && arr.findIndex(x => x.id === p.id) === i)
    : [];

  // أيضاً من قائمة العقارات العامة
  const adminOwnedProps = properties
    .filter((p: any) => p.uploadedByEmail === "admin@baity.com")
    .slice(0, 20);

  const allProps = [
    ...userProperties,
    ...adminOwnedProps.filter((p: any) => !userProperties.find(x => x.id === p.id))
      .map((p: any) => ({ id: p.id, title: p.title })),
  ];

  const handleSend = async () => {
    if (!selectedUser || !messageText.trim() || sending) return;
    if (!selectedProp && allProps.length > 0) {
      if (!confirm("لم تحدد عقاراً. هل تريد الإرسال بدون عقار محدد؟")) return;
    }
    setSending(true);
    const ok = await onSend(selectedUser.id, selectedProp?.id || "", messageText.trim());
    setSending(false);
    if (ok) onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <PenSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black">رسالة جديدة من الأدمن</h3>
                <p className="text-white/70 text-xs">
                  {step === "user" ? "اختر المستخدم" : `إلى: ${selectedUser?.name}`}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/20 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Steps */}
          <div className="flex items-center gap-2 mt-4">
            {[{ label: "المستخدم", key: "user" }, { label: "الرسالة", key: "message" }].map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all ${
                  step === s.key
                    ? "bg-white text-amber-600"
                    : i === 0 && step === "message"
                      ? "bg-white/30 text-white"
                      : "bg-white/10 text-white/50"
                }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    step === s.key ? "bg-amber-500 text-white" : i === 0 && step === "message" ? "bg-green-400 text-white" : "bg-white/20 text-white"
                  }`}>
                    {i === 0 && step === "message" ? "✓" : i + 1}
                  </span>
                  {s.label}
                </div>
                {i < 1 && <ArrowRight className="w-3 h-3 text-white/40" />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5">
          {/* Step 1: اختيار المستخدم */}
          {step === "user" && (
            <div>
              <div className="relative mb-4">
                <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="ابحث باسم المستخدم..."
                  autoFocus
                  className="w-full ps-9 pe-4 py-2.5 rounded-xl border border-border bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">لا توجد مستخدمون مطابقون</p>
                  <p className="text-xs mt-1 opacity-60">المستخدمون مستخرَجون من المحادثات الموجودة</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => { setSelectedUser(u); setStep("message"); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-200 dark:hover:border-amber-800 transition-all text-start"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black shrink-0">
                        {(u.name || "م").charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-primary dark:text-white text-sm truncate">{u.name}</p>
                        {u.email && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: كتابة الرسالة */}
          {step === "message" && selectedUser && (
            <div className="space-y-4">
              {/* المستخدم المحدد */}
              <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black">
                  {(selectedUser.name || "م").charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-black text-primary dark:text-white text-sm">{selectedUser.name}</p>
                </div>
                <button onClick={() => { setSelectedUser(null); setStep("user"); }}
                  className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-800/40 text-muted-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* اختيار عقار (اختياري) */}
              {allProps.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowProps(!showProps)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-amber-500" />
                      <span className="text-primary dark:text-white font-bold">
                        {selectedProp ? selectedProp.title : "اختر عقاراً (اختياري)"}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showProps ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {showProps && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-1 border border-border rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                          {allProps.map(p => (
                            <button
                              key={p.id}
                              onClick={() => { setSelectedProp(p); setShowProps(false); }}
                              className={`w-full flex items-center gap-2 px-3 py-2.5 text-start text-sm hover:bg-muted/50 transition-colors border-b border-border last:border-0 ${
                                selectedProp?.id === p.id ? "bg-amber-50 dark:bg-amber-900/20 font-black" : ""
                              }`}
                            >
                              <Home className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="truncate">{p.title}</span>
                              {selectedProp?.id === p.id && <Check className="w-3.5 h-3.5 text-amber-500 ms-auto shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* نص الرسالة */}
              <div>
                <label className="block text-xs font-black text-primary dark:text-white mb-1.5 flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5 text-amber-500" />
                  نص الرسالة
                </label>
                <textarea
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  rows={4}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">{messageText.length} حرف</p>
              </div>

              {/* Quick templates */}
              <div>
                <p className="text-xs font-black text-muted-foreground mb-2">رسائل جاهزة سريعة:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "مرحباً، نود إعلامك بأن...",
                    "تم مراجعة طلبك وسيتم التواصل معك قريباً.",
                    "يرجى تحديث معلومات عقارك.",
                    "شكراً لاستخدامك منصة بيتي.",
                  ].map(t => (
                    <button key={t}
                      onClick={() => setMessageText(prev => prev ? `${prev}\n${t}` : t)}
                      className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-muted-foreground hover:text-amber-700 dark:hover:text-amber-300 rounded-lg transition-colors border border-border hover:border-amber-200">
                      {t.length > 30 ? t.slice(0, 30) + "…" : t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Send */}
              <div className="flex gap-3">
                <button onClick={() => setStep("user")}
                  className="px-4 py-2.5 rounded-xl border-2 border-border hover:bg-muted dark:hover:bg-slate-700 transition-colors font-bold text-sm text-primary dark:text-white">
                  رجوع
                </button>
                <button
                  onClick={handleSend}
                  disabled={!messageText.trim() || sending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl font-bold transition-colors"
                >
                  {sending
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Send className="w-4 h-4" />}
                  إرسال الرسالة
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════
export default function AdminMessages() {
  const navigate = useNavigate();
  const { user, authReady, properties } = useApp();

  const [conversations, setConversations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm]       = useState("");
  const [sortOrder, setSortOrder]         = useState<"newest" | "oldest" | "most_messages">("newest");
  const [isLoading, setIsLoading]         = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selected, setSelected]           = useState<any>(null);
  const [showCompose, setShowCompose]     = useState(false);
  const [notification, setNotification]   = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const isAdmin = user?.email === "admin@baity.com";
  const adminId = user?.id || "";

  useEffect(() => {
    if (!authReady) return;
    if (!user)       { navigate("/admin/login", { replace: true }); return; }
    if (!isAdmin)      navigate("/", { replace: true });
  }, [user, isAdmin, authReady, navigate]);

  const showNotif = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const adminHeaders = async () => {
    const token = await getValidToken();
    return {
      "Authorization": `Bearer ${publicAnonKey}`,
      "X-User-Token": token || "",
      "Content-Type": "application/json",
    };
  };

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = await adminHeaders();
      const res  = await fetch(`${API}/admin/conversations`, { headers });
      const data = await res.json();
      if (data.success) setConversations(data.data || []);
      else showNotif("تعذّر جلب المحادثات", "error");
    } catch { showNotif("خطأ في الاتصال", "error"); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    if (isAdmin && authReady) fetchConversations();
  }, [isAdmin, authReady, fetchConversations]);

  // ── Delete message ──────────────────────────────────────────────────────────
  const handleDeleteMsg = async (msgId: string) => {
    setActionLoading(true);
    try {
      const headers = await adminHeaders();
      const res  = await fetch(`${API}/admin/messages/${msgId}`, { method: "DELETE", headers });
      const data = await res.json();
      if (data.success) {
        showNotif("✅ تم حذف الرسالة");
        await fetchConversations();
        if (selected) {
          setSelected((prev: any) => prev
            ? { ...prev, messages: (prev.messages || []).filter((m: any) => m.id !== msgId) }
            : null
          );
        }
      } else showNotif(data.error || "حدث خطأ", "error");
    } catch { showNotif("تعذّر حذف الرسالة", "error"); }
    finally { setActionLoading(false); }
  };

  // ── Edit message ────────────────────────────────────────────────────────────
  const handleEditMsg = async (msgId: string, text: string) => {
    setActionLoading(true);
    try {
      const headers = await adminHeaders();
      const res  = await fetch(`${API}/admin/messages/${msgId}/edit`, {
        method: "POST", headers, body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.success) {
        showNotif("✅ تم تعديل الرسالة");
        await fetchConversations();
      } else showNotif(data.error || "حدث خطأ", "error");
    } catch { showNotif("تعذّر تعديل الرسالة", "error"); }
    finally { setActionLoading(false); }
  };

  // ── Delete conversation ─────────────────────────────────────────────────────
  const handleDeleteConv = async (convId: string) => {
    setActionLoading(true);
    try {
      const headers = await adminHeaders();
      const res  = await fetch(`${API}/admin/conversations/${encodeURIComponent(convId)}`, {
        method: "DELETE", headers,
      });
      const data = await res.json();
      if (data.success) {
        showNotif("✅ تم حذف المحادثة");
        setSelected(null);
        await fetchConversations();
      } else showNotif(data.error || "حدث خطأ", "error");
    } catch { showNotif("تعذّر حذف المحادثة", "error"); }
    finally { setActionLoading(false); }
  };

  // ── Admin Reply (داخل محادثة موجودة) ─────────────────────────────────────
  const handleAdminReply = async (
    _convId: string, ownerId: string, propertyId: string, text: string
  ): Promise<void> => {
    if (!text.trim()) return;
    try {
      const token = await getValidToken();
      const res = await fetch(`${API}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${publicAnonKey}`,
          "X-User-Token": token || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, propertyId: propertyId || undefined, ownerId }),
      });
      const data = await res.json();
      if (data.success) {
        showNotif("✅ تم إرسال الرد بنجاح");
        await fetchConversations();
        // حدّث الـ modal
        const updated = conversations.find(c => c.id === _convId);
        if (updated) setSelected({ ...updated });
      } else {
        showNotif(data.error || "فشل إرسال الرد", "error");
      }
    } catch { showNotif("خطأ في إرسال الرد", "error"); }
  };

  // ── Admin Compose (محادثة جديدة) ──────────────────────────────────────────
  const handleAdminCompose = async (
    ownerId: string, propertyId: string, text: string
  ): Promise<boolean> => {
    try {
      const token = await getValidToken();
      const body: any = { text, ownerId };
      if (propertyId) body.propertyId = propertyId;
      const res = await fetch(`${API}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${publicAnonKey}`,
          "X-User-Token": token || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        showNotif("✅ تم إرسال الرسالة بنجاح");
        await fetchConversations();
        return true;
      } else {
        showNotif(data.error || "فشل إرسال الرسالة", "error");
        return false;
      }
    } catch {
      showNotif("خطأ في إرسال الرسالة", "error");
      return false;
    }
  };

  if (!authReady || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400">جارٍ التحقق...</p>
        </div>
      </div>
    );
  }
  if (!isAdmin) return null;

  const filtered = conversations.filter(c =>
    (c.sender_name   || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.receiver_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.property_title|| "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === "newest")  return new Date(b.last_updated || 0).getTime() - new Date(a.last_updated || 0).getTime();
    if (sortOrder === "oldest")  return new Date(a.last_updated || 0).getTime() - new Date(b.last_updated || 0).getTime();
    return (b.message_count || 0) - (a.message_count || 0);
  });
  const totalMessages = conversations.reduce((s, c) => s + (c.message_count || 0), 0);

  // محادثات يشارك فيها الأدمن
  const adminConvs  = conversations.filter(c => c.sender_id === adminId || c.receiver_id === adminId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
      <AdminNavbar />

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -80 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -80 }}
            className="fixed top-24 inset-x-0 z-[60] flex justify-center px-4"
          >
            <div className={`${notification.type === "success" ? "bg-green-500" : "bg-red-500"} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3`}>
              {notification.type === "success"
                ? <CheckCircle className="w-6 h-6" />
                : <XCircle className="w-6 h-6" />}
              <span className="font-bold">{notification.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {selected && (
          <ConversationModal
            conv={selected} adminId={adminId}
            onClose={() => setSelected(null)}
            onDeleteMsg={handleDeleteMsg}
            onEditMsg={handleEditMsg}
            onDeleteConv={handleDeleteConv}
            onAdminReply={handleAdminReply}
            loading={actionLoading}
          />
        )}
        {showCompose && (
          <ComposeModal
            conversations={conversations}
            properties={properties}
            adminId={adminId}
            onClose={() => setShowCompose(false)}
            onSend={handleAdminCompose}
            loading={actionLoading}
          />
        )}
      </AnimatePresence>

      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <button onClick={() => navigate("/admin")}
              className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-primary dark:text-white">التحكم بالرسائل</h1>
                <p className="text-muted-foreground text-sm">إدارة جميع محادثات المنصة + إرسال رسائل مباشرة</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* زر رسالة جديدة */}
              <button
                onClick={() => setShowCompose(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-500/25 transition-colors text-sm"
              >
                <PenSquare className="w-4 h-4" /> رسالة جديدة
              </button>
              <button onClick={fetchConversations} disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-border rounded-xl hover:shadow-md transition-all text-sm font-bold">
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                تحديث
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "محادثات",    val: conversations.length, bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300" },
              { label: "رسائل",      val: totalMessages,         bg: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300" },
              { label: "رسائل الأدمن", val: adminConvs.length, bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300" },
              { label: "صلاحيات كاملة", val: "✓",              bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300" },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl border p-4 text-center ${s.bg}`}>
                <p className="text-2xl font-black">{s.val}</p>
                <p className="text-xs font-bold mt-1 opacity-70">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Permission Note */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-5 flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700 dark:text-amber-300">
            <span className="font-black">صلاحيات الأدمن:</span> عرض وتعديل وحذف أي رسالة أو محادثة.{" "}
            <span className="font-black">الجديد:</span> إرسال رسائل مباشرة لأي مستخدم عبر زر{" "}
            <span className="bg-amber-200 dark:bg-amber-800 px-1.5 py-0.5 rounded font-black">رسالة جديدة</span>{" "}
            أو الرد داخل أي محادثة مفتوحة.
          </div>
        </div>

        {/* Search & Sort */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-muted-foreground" />
            <input
              type="text" placeholder="ابحث عن مستخدم أو عقار..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full ps-12 pe-4 py-3 rounded-2xl border border-border bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-border rounded-2xl px-3 py-2 shadow-sm">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)}
              className="bg-transparent text-sm font-bold focus:outline-none text-foreground">
              <option value="newest">الأحدث أولاً</option>
              <option value="oldest">الأقدم أولاً</option>
              <option value="most_messages">الأكثر رسائل</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-14 h-14 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground font-bold">جارٍ تحميل المحادثات...</p>
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-16 text-center border border-border">
            <MessageSquare className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-primary dark:text-white mb-2">
              {searchTerm ? "لا توجد نتائج" : "لا توجد محادثات"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm ? "جرّب كلمات بحث مختلفة" : "لا توجد محادثات في النظام حالياً"}
            </p>
            <button onClick={() => setShowCompose(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors">
              <PenSquare className="w-4 h-4" /> ابدأ أول محادثة
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {sorted.map(conv => (
              <ConversationCard
                key={conv.id} conv={conv} adminId={adminId}
                onView={() => setSelected(conv)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Conversation Card ────────────────────────────────────────────────────────
function ConversationCard({
  conv, adminId, onView,
}: {
  conv: any; adminId: string; onView: () => void;
}) {
  const lastMsg  = conv.messages?.[conv.messages.length - 1];
  const preview  = lastMsg?.type === "text" ? lastMsg.text
    : lastMsg?.type === "file" ? "📎 مرفق" : lastMsg?.type === "location" ? "📍 موقع" : "—";
  const hasAdmin = conv.sender_id === adminId || conv.receiver_id === adminId;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border hover:shadow-md transition-shadow ${
        hasAdmin ? "border-amber-200 dark:border-amber-800" : "border-border"
      }`}
    >
      <div className="flex items-start gap-4 p-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          hasAdmin
            ? "bg-gradient-to-br from-amber-400 to-orange-500"
            : "bg-gradient-to-br from-purple-400 to-blue-500"
        }`}>
          {hasAdmin
            ? <Shield className="w-5 h-5 text-white" />
            : <MessageSquare className="w-5 h-5 text-white" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-bold text-primary dark:text-white text-sm">
                  {conv.sender_name}
                  <span className="text-muted-foreground font-normal mx-1.5">→</span>
                  {conv.receiver_name}
                </p>
                {hasAdmin && (
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-black shrink-0">
                    🛡️ أدمن
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                🏠 {conv.property_title}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                {conv.message_count} رسالة
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {timeAgo(conv.last_updated)}
              </span>
            </div>
          </div>

          {preview && (
            <p className="text-xs text-muted-foreground truncate mb-2 bg-muted/50 rounded-lg px-2 py-1">
              آخر رسالة: {preview}
            </p>
          )}

          <button onClick={onView}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              hasAdmin
                ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                : "bg-purple-50 dark:bg-purple-900/20 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30"
            }`}>
            <Eye className="w-3 h-3" /> عرض وإدارة • رد الأدمن
          </button>
        </div>
      </div>
    </motion.div>
  );
}
