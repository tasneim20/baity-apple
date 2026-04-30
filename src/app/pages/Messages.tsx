import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageCircle, Send, Search, RefreshCw, Loader2,
  Check, CheckCheck, X, Image, MapPin, Trash2, AlertCircle,
} from "lucide-react";
import { useApp, getValidToken } from "../context/AppContext";
import Navbar from "../components/Navbar";
import { Link } from "react-router";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

// ─── Countdown hook for 10-min delete window ─────────────────────────────────
function useDeleteCountdown(timestamp: string) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const update = () => {
      const age = Date.now() - new Date(timestamp).getTime();
      const rem = Math.max(0, 10 * 60 * 1000 - age);
      setRemaining(rem);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [timestamp]);
  return remaining;
}

// ─── Message bubble component ──────────────────────────────────────────────
function MessageBubble({
  message, isMe, isFirstInGroup, isLastInGroup,
  otherUserName, onDelete, language,
}: {
  message: any; isMe: boolean; isFirstInGroup: boolean; isLastInGroup: boolean;
  otherUserName: string; onDelete: (id: string) => void; language: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const remaining = useDeleteCountdown(message.timestamp);
  const canDelete = isMe && remaining > 0;
  const ar = language === "ar";

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const countdownStr = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"} ${isLastInGroup ? "mb-3" : "mb-0.5"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false); }}
    >
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full bg-primary/10 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary dark:text-slate-300 self-end transition-opacity ${
        !isMe && isLastInGroup ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}>
        {(otherUserName || "؟").charAt(0)}
      </div>

      {/* Bubble + actions */}
      <div className={`flex items-end gap-1 max-w-[70%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
        {/* Delete actions */}
        <AnimatePresence>
          {isMe && hovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center gap-1 self-end mb-1"
            >
              {canDelete && !confirmDelete && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  title={ar ? `حذف (${countdownStr} متبقي)` : `Delete (${countdownStr} left)`}
                  className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-500 hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              {canDelete && confirmDelete && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => { onDelete(message.id); setConfirmDelete(false); }}
                    className="px-2 py-1 text-[10px] bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors"
                  >
                    {ar ? "تأكيد" : "Yes"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1 text-[10px] bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    {ar ? "إلغاء" : "No"}
                  </button>
                </div>
              )}
              {canDelete && (
                <span className="text-[9px] text-muted-foreground font-mono">{countdownStr}</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bubble */}
        <div className="flex flex-col gap-0.5">
          {!isMe && isFirstInGroup && (
            <span className="text-[10px] font-semibold text-accent px-1">{message.senderName || otherUserName}</span>
          )}
          <div className={`px-3.5 py-2.5 shadow-sm ${
            isMe
              ? `bg-accent text-white ${isFirstInGroup ? "rounded-t-2xl" : "rounded-t-lg"} ${isLastInGroup ? "rounded-s-2xl rounded-e-md" : "rounded-s-lg rounded-e-lg"}`
              : `bg-card dark:bg-slate-700 border border-border dark:border-slate-600 ${isFirstInGroup ? "rounded-t-2xl" : "rounded-t-lg"} ${isLastInGroup ? "rounded-e-2xl rounded-s-md" : "rounded-e-lg rounded-s-lg"}`
          }`}>
            {/* Text */}
            {message.text && (
              <p className={`text-sm leading-relaxed ${isMe ? "text-white" : "text-foreground dark:text-slate-100"}`} dir="auto">
                {message.text}
              </p>
            )}

            {/* Image */}
            {message.fileUrl && message.fileUrl !== "__has_file__" && message.fileType?.startsWith("image") && (
              <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="block mt-1">
                <img
                  src={message.fileUrl}
                  alt={ar ? "صورة" : "Image"}
                  className="max-w-[220px] max-h-[200px] rounded-xl object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </a>
            )}

            {/* Non-image file */}
            {message.fileUrl && message.fileUrl !== "__has_file__" && !message.fileType?.startsWith("image") && (
              <a
                href={message.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs underline mt-1 block ${isMe ? "text-white/80" : "text-accent"}`}
              >
                📎 {message.fileName || (ar ? "ملف مرفق" : "Attachment")}
              </a>
            )}

            {/* Location */}
            {message.location && (
              <a
                href={`https://www.google.com/maps?q=${message.location.lat},${message.location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 mt-1 text-xs rounded-xl px-3 py-2 ${
                  isMe ? "bg-white/20 text-white hover:bg-white/30" : "bg-accent/10 text-accent hover:bg-accent/20"
                } transition-colors`}
              >
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="font-semibold">{ar ? "📍 موقعي الحالي" : "📍 My Location"}</p>
                  {message.location.label && (
                    <p className="text-[10px] opacity-75 truncate max-w-[160px]">{message.location.label}</p>
                  )}
                  <p className="text-[10px] opacity-60 font-mono">
                    {Number(message.location.lat).toFixed(4)}, {Number(message.location.lng).toFixed(4)}
                  </p>
                </div>
              </a>
            )}

            {/* Timestamp + read status */}
            <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end text-white/60" : "justify-start text-muted-foreground"}`}>
              <span className="text-[10px]">
                {new Date(message.timestamp).toLocaleTimeString(language === "ar" ? "ar-JO" : "en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
              {isMe && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }}>
                  {message.isRead
                    ? <CheckCheck className="w-3 h-3 text-white/80" />
                    : <Check className="w-3 h-3 text-white/60" />}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right spacer for incoming messages */}
      {!isMe && <div className="w-7 flex-shrink-0" />}
    </motion.div>
  );
}

// ─── Main Messages page ───────────────────────────────────────────────────────
export default function Messages() {
  const {
    language, user, isAuthenticated,
    threads, refreshThreads,
    fetchThreadById, markThreadAsRead,
  } = useApp();
  const ar = language === "ar";

  useEffect(() => {
    document.title = ar ? "بيتي - الرسائل" : "Baity - Messages";
  }, [ar]);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated) handleRefreshThreads();
  }, [isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedThread?.messages?.length]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [newMessage]);

  const handleRefreshThreads = async () => {
    setIsRefreshing(true);
    refreshThreads();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const loadThread = async (threadId: string) => {
    setIsLoadingThread(true);
    const thread = await fetchThreadById(threadId);
    if (thread) {
      setSelectedThread(thread);
      markThreadAsRead(threadId);
    }
    setIsLoadingThread(false);
  };

  const getOtherUser = (thread: any) => {
    if (!user || !thread) return { name: "...", id: "" };
    if (user.id === thread.inquirerId) return { name: thread.ownerName || "مالك العقار", id: thread.ownerId };
    return { name: thread.inquirerName || "مستفسر", id: thread.inquirerId };
  };

  const getUnreadCount = (thread: any) => {
    if (!user || !thread?.messages) return 0;
    return thread.messages.filter((m: any) => !m.isRead && m.senderId !== user.id).length;
  };

  const getLastMessage = (thread: any) => {
    if (!thread?.messages?.length) return "";
    const last = thread.messages[thread.messages.length - 1];
    if (last.location) return ar ? "📍 موقع" : "📍 Location";
    if (last.fileType?.startsWith("image")) return ar ? "🖼️ صورة" : "🖼️ Image";
    if (last.fileUrl && last.fileUrl !== "__has_file__") return ar ? "📎 ملف مرفق" : "📎 Attachment";
    return last.text || "";
  };

  const handleSelectThread = async (threadId: string) => {
    setSelectedThreadId(threadId);
    await loadThread(threadId);
  };

  // ── Send text ───────────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedThread || isSending) return;
    setIsSending(true);
    const text = newMessage.trim();
    setNewMessage("");
    try {
      const userToken = await getValidToken();
      if (!userToken) { setIsSending(false); return; }
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}`, "X-User-Token": userToken },
          body: JSON.stringify({ text, propertyId: selectedThread.propertyId, ownerId: selectedThread.ownerId, inquirerId: selectedThread.inquirerId }),
        }
      );
      const data = await res.json();
      if (data.success) await loadThread(selectedThread.id);
      else console.error("sendMessage failed:", data.error);
    } catch (e) { console.error("sendMessage error:", e); }
    finally { setIsSending(false); }
  };

  // ── Send image ───────────────────────────────────────────────────────────────
  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedThread) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(ar ? "الصورة أكبر من 5 ميغابايت" : "Image exceeds 5 MB");
      return;
    }
    setIsUploadingImage(true);
    try {
      const userToken = await getValidToken();
      if (!userToken) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}`, "X-User-Token": userToken },
            body: JSON.stringify({
              text: "",
              fileUrl: base64,
              fileType: file.type,
              fileName: file.name,
              propertyId: selectedThread.propertyId,
              ownerId: selectedThread.ownerId,
              inquirerId: selectedThread.inquirerId,
            }),
          }
        );
        const data = await res.json();
        if (data.success) await loadThread(selectedThread.id);
        else console.error("sendImage failed:", data.error);
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error("sendImage error:", e);
      setIsUploadingImage(false);
    }
    e.target.value = "";
  };

  // ── Send location ────────────────────────────────────────────────────────────
  const handleSendLocation = () => {
    if (!selectedThread || isGettingLocation) return;
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError(ar ? "المتصفح لا يدعم تحديد الموقع" : "Geolocation not supported");
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          const userToken = await getValidToken();
          if (!userToken) return;
          const res = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/messages`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}`, "X-User-Token": userToken },
              body: JSON.stringify({
                text: "",
                location: { lat, lng, label: "" },
                propertyId: selectedThread.propertyId,
                ownerId: selectedThread.ownerId,
                inquirerId: selectedThread.inquirerId,
              }),
            }
          );
          const data = await res.json();
          if (data.success) await loadThread(selectedThread.id);
          else console.error("sendLocation failed:", data.error);
        } catch (e) { console.error("sendLocation error:", e); }
        finally { setIsGettingLocation(false); }
      },
      (err) => {
        setIsGettingLocation(false);
        const msgs: Record<number, string> = {
          1: ar ? "تم رفض الإذن. يرجى السماح بالوصول للموقع" : "Permission denied. Allow location access",
          2: ar ? "تعذّر تحديد موقعك" : "Could not determine location",
          3: ar ? "انتهت مهلة تحديد الموقع" : "Location timeout",
        };
        setLocationError(msgs[err.code] || (ar ? "خطأ في تحديد الموقع" : "Location error"));
        setTimeout(() => setLocationError(""), 4000);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ── Delete message ────────────────────────────────────────────────────────────
  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedThread) return;
    try {
      const userToken = await getValidToken();
      if (!userToken) return;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/messages/${selectedThread.id}/${messageId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${publicAnonKey}`, "X-User-Token": userToken },
        }
      );
      const data = await res.json();
      if (data.success) await loadThread(selectedThread.id);
      else console.error("deleteMessage failed:", data.error);
    } catch (e) { console.error("deleteMessage error:", e); }
  };

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return ar ? "الآن" : "Now";
    if (minutes < 60) return ar ? `${minutes}د` : `${minutes}m`;
    if (hours < 24) return ar ? `${hours}س` : `${hours}h`;
    if (days < 7) return ar ? `${days}ي` : `${days}d`;
    return date.toLocaleDateString(ar ? "ar-JO" : "en-US");
  };

  const filteredThreads = (threads || []).filter((thread: any) => {
    const otherUser = getOtherUser(thread);
    const q = searchQuery.toLowerCase();
    return (
      (otherUser.name || "").toLowerCase().includes(q) ||
      (thread.propertyTitle || "").toLowerCase().includes(q)
    );
  });

  const totalUnread = (threads || []).reduce(
    (sum: number, t: any) => sum + getUnreadCount(t), 0
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background dark:bg-slate-950">
        <Navbar />
        <div className="pt-24 flex items-center justify-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md mx-auto px-4"
          >
            <div className="w-24 h-24 bg-muted dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <MessageCircle className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-primary dark:text-slate-100 mb-2">
              {ar ? "يجب تسجيل الدخول" : "Login Required"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {ar ? "سجل دخولك للوصول إلى رسائلك والتواصل مع أصحاب العقارات" : "Please login to access your messages"}
            </p>
            <Link to="/auth" className="inline-block bg-accent text-white px-8 py-3 rounded-xl font-bold hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20">
              {ar ? "تسجيل الدخول" : "Login Now"}
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <Navbar />
      <div className="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center shadow-lg shadow-accent/20">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold text-primary dark:text-slate-100">{ar ? "الرسائل" : "Messages"}</h1>
                  <AnimatePresence>
                    {totalUnread > 0 && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {totalUnread}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <p className="text-sm text-muted-foreground">{ar ? "تواصل مع المهتمين بعقاراتك" : "Connect with interested buyers"}</p>
              </div>
              <button onClick={handleRefreshThreads} className="ms-auto p-2 hover:bg-muted dark:hover:bg-slate-800 rounded-xl transition-colors" title={ar ? "تحديث" : "Refresh"}>
                <RefreshCw className={`w-5 h-5 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </motion.div>

          {/* Main Container */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-card dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-border dark:border-slate-700"
            style={{ height: "calc(100vh - 220px)", minHeight: "580px" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 h-full">

              {/* ── Sidebar ── */}
              <div className="md:col-span-1 border-e border-border dark:border-slate-700 bg-muted/20 dark:bg-slate-800/50 flex flex-col">
                <div className="p-3 border-b border-border dark:border-slate-700">
                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={ar ? "بحث في المحادثات..." : "Search chats..."}
                      className="w-full ps-9 pe-3 py-2 bg-background dark:bg-slate-700 rounded-xl border border-border dark:border-slate-600 focus:border-accent focus:ring-1 focus:ring-accent text-foreground dark:text-slate-100 text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-border/50 dark:divide-slate-700/50">
                  {filteredThreads.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                      <p className="text-sm text-muted-foreground">{ar ? "لا توجد محادثات بعد" : "No conversations yet"}</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {filteredThreads.map((thread: any, i: number) => {
                        const otherUser = getOtherUser(thread);
                        const unread = getUnreadCount(thread);
                        const lastMsg = getLastMessage(thread);
                        const isSelected = selectedThreadId === thread.id;
                        return (
                          <motion.button
                            key={thread.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.04 }}
                            onClick={() => handleSelectThread(thread.id)}
                            className={`w-full p-3.5 text-start transition-all duration-150 ${
                              isSelected
                                ? "bg-accent/10 dark:bg-accent/20 border-s-2 border-s-accent"
                                : "hover:bg-muted/60 dark:hover:bg-slate-700/50 border-s-2 border-s-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm flex-shrink-0 ${
                                isSelected ? "bg-accent" : "bg-primary/70 dark:bg-slate-500"
                              }`}>
                                {(otherUser.name || "؟").charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="font-semibold text-sm text-foreground dark:text-slate-100 truncate">{otherUser.name}</span>
                                  <span className="text-[10px] text-muted-foreground whitespace-nowrap ms-2">{formatTime(thread.lastUpdated)}</span>
                                </div>
                                <p className="text-[11px] text-accent font-medium truncate mb-0.5">{thread.propertyTitle}</p>
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs text-muted-foreground truncate">{lastMsg}</p>
                                  {unread > 0 && (
                                    <span className="bg-accent text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                                      {unread}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>
              </div>

              {/* ── Chat Window ── */}
              <div className="md:col-span-2 flex flex-col bg-background dark:bg-slate-900">
                {selectedThread ? (
                  <>
                    {/* Chat Header */}
                    <div className="px-4 py-3 border-b border-border dark:border-slate-700 bg-card/80 dark:bg-slate-800/80 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-primary dark:text-slate-100">
                            {(getOtherUser(selectedThread).name || "؟").charAt(0)}
                          </div>
                          <div>
                            <h2 className="font-bold text-sm text-foreground dark:text-slate-100 leading-tight">
                              {getOtherUser(selectedThread).name}
                            </h2>
                            <p className="text-xs text-muted-foreground">{ar ? "مستخدم بيتي" : "Baity User"}</p>
                          </div>
                        </div>
                        <button onClick={() => loadThread(selectedThread.id)} className="p-2 hover:bg-muted dark:hover:bg-slate-700 rounded-lg transition-colors">
                          <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoadingThread ? "animate-spin" : ""}`} />
                        </button>
                      </div>
                      {/* Property banner */}
                      <div className="mt-2.5 p-2.5 bg-accent/5 dark:bg-accent/10 rounded-xl flex items-center gap-3 border border-accent/15">
                        {selectedThread.propertyImage ? (
                          <img src={selectedThread.propertyImage} alt={selectedThread.propertyTitle} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted dark:bg-slate-700 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground dark:text-slate-100 truncate">{selectedThread.propertyTitle}</p>
                          <Link to={`/property/${selectedThread.propertyId}`} className="text-[11px] text-accent hover:underline mt-0.5 font-medium inline-flex items-center gap-1">
                            {ar ? "عرض العقار" : "View Property"} <span className="rtl:rotate-180 inline-block">→</span>
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Messages area */}
                    <div
                      className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
                      style={{ backgroundImage: "radial-gradient(circle at 20% 80%, rgba(218,165,32,0.03) 0%, transparent 50%)" }}
                    >
                      {isLoadingThread ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="w-8 h-8 text-accent animate-spin" />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-border/50 dark:bg-slate-700/50" />
                            <span className="text-[10px] text-muted-foreground bg-muted/50 dark:bg-slate-700/50 px-3 py-1 rounded-full font-medium">
                              {ar ? "المحادثة" : "Conversation"}
                            </span>
                            <div className="flex-1 h-px bg-border/50 dark:bg-slate-700/50" />
                          </div>

                          {(selectedThread.messages || []).length === 0 && (
                            <div className="text-center py-8">
                              <p className="text-sm text-muted-foreground">{ar ? "لا توجد رسائل بعد" : "No messages yet"}</p>
                            </div>
                          )}

                          <AnimatePresence initial={false}>
                            {(selectedThread.messages || []).map((message: any, index: number) => {
                              const isMe = message.senderId === user?.id;
                              const prevMsg = (selectedThread.messages || [])[index - 1];
                              const nextMsg = (selectedThread.messages || [])[index + 1];
                              const isFirstInGroup = !prevMsg || prevMsg.senderId !== message.senderId;
                              const isLastInGroup = !nextMsg || nextMsg.senderId !== message.senderId;
                              return (
                                <MessageBubble
                                  key={message.id}
                                  message={message}
                                  isMe={isMe}
                                  isFirstInGroup={isFirstInGroup}
                                  isLastInGroup={isLastInGroup}
                                  otherUserName={getOtherUser(selectedThread).name}
                                  onDelete={handleDeleteMessage}
                                  language={language}
                                />
                              );
                            })}
                          </AnimatePresence>

                          {/* Typing/sending indicator */}
                          <AnimatePresence>
                            {(isSending || isUploadingImage || isGettingLocation) && (
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-row-reverse items-end gap-2"
                              >
                                <div className="bg-accent/20 rounded-2xl rounded-e-md px-4 py-2.5">
                                  <div className="flex gap-1 items-center h-4">
                                    {[0, 1, 2].map((i) => (
                                      <motion.span
                                        key={i}
                                        animate={{ y: [0, -4, 0] }}
                                        transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                                        className="w-1.5 h-1.5 bg-accent rounded-full inline-block"
                                      />
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <div ref={messagesEndRef} />
                        </>
                      )}
                    </div>

                    {/* Input area */}
                    <div className="px-3 py-3 border-t border-border dark:border-slate-700 bg-card/50 dark:bg-slate-800/50 backdrop-blur-sm">
                      {/* Location error */}
                      <AnimatePresence>
                        {locationError && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-2 text-xs text-red-500 mb-2 px-1"
                          >
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            {locationError}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex items-end gap-2">
                        {/* Image upload button */}
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageSelected}
                        />
                        <button
                          onClick={() => imageInputRef.current?.click()}
                          disabled={isUploadingImage || isSending}
                          title={ar ? "إرسال صورة" : "Send image"}
                          className="p-2.5 rounded-xl bg-muted dark:bg-slate-700 text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all disabled:opacity-40 flex-shrink-0"
                        >
                          {isUploadingImage
                            ? <Loader2 className="w-4 h-4 animate-spin text-accent" />
                            : <Image className="w-4 h-4" />}
                        </button>

                        {/* Location button */}
                        <button
                          onClick={handleSendLocation}
                          disabled={isGettingLocation || isSending}
                          title={ar ? "إرسال موقعي" : "Send location"}
                          className="p-2.5 rounded-xl bg-muted dark:bg-slate-700 text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all disabled:opacity-40 flex-shrink-0"
                        >
                          {isGettingLocation
                            ? <Loader2 className="w-4 h-4 animate-spin text-accent" />
                            : <MapPin className="w-4 h-4" />}
                        </button>

                        {/* Text input */}
                        <div className="flex-1 relative">
                          <textarea
                            ref={textareaRef}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            placeholder={ar ? "اكتب رسالتك..." : "Type your message..."}
                            className="w-full px-3.5 py-2 bg-muted dark:bg-slate-700 rounded-xl border border-transparent focus:border-accent resize-none text-foreground dark:text-slate-100 text-sm leading-relaxed outline-none transition-all"
                            rows={1}
                            dir="auto"
                            style={{ maxHeight: "120px", overflow: "auto", lineHeight: "1.5rem", minHeight: "36px" }}
                          />
                        </div>

                        {/* Send button */}
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          whileHover={{ scale: 1.05 }}
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || isSending}
                          className="w-9 h-9 bg-accent text-white rounded-xl hover:bg-accent/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-md shadow-accent/20 flex items-center justify-center"
                        >
                          {isSending
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Send className="w-4 h-4 rtl:-scale-x-100" />}
                        </motion.button>
                      </div>

                      <p className="text-[10px] text-muted-foreground mt-1.5 text-center opacity-40">
                        {ar ? "Enter للإرسال · Shift+Enter لسطر جديد · 🖼️ صور · 📍 موقع" : "Enter to send · Shift+Enter for new line · 🖼️ Images · 📍 Location"}
                      </p>
                    </div>
                  </>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex items-center justify-center">
                    <div className="text-center px-4">
                      <div className="w-20 h-20 rounded-2xl bg-muted dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                        <MessageCircle className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground dark:text-slate-100 mb-1">{ar ? "اختر محادثة للبدء" : "Select a chat to start"}</h3>
                      <p className="text-sm text-muted-foreground">{ar ? "اختر محادثة من القائمة للبدء بالمراسلة" : "Choose a conversation from the list"}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
