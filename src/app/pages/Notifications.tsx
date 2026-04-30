import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  Bell, Check, X, Clock, CheckCircle, AlertTriangle,
  Shield, Flag, MessageSquare, Home
} from "lucide-react";
import Navbar from "../components/Navbar";
import { useApp, getValidToken } from "../context/AppContext";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b`;

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("ar-JO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "—";
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "منذ لحظات";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} يوم`;
}

// ─── Notification Icons
const NOTIFICATION_ICONS: Record<string, { icon: any; color: string }> = {
  property_pending: { icon: Clock, color: "amber" },
  property_approved: { icon: CheckCircle, color: "green" },
  property_rejected: { icon: X, color: "red" },
  property_hidden: { icon: AlertTriangle, color: "orange" },
  report_action: { icon: Flag, color: "red" },
};

export default function Notifications() {
  const navigate = useNavigate();
  const { user, notifications: contextNotifications, refreshNotifications } = useApp();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // Sync with context notifications when they change
  useEffect(() => {
    if (contextNotifications.length > 0) {
      setNotifications(contextNotifications);
      setIsLoading(false);
    }
  }, [contextNotifications]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchNotifications();
  }, [user, navigate]);

  const getUserToken = getValidToken;

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const token = await getUserToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const headers = {
        Authorization: `Bearer ${publicAnonKey}`,
        "X-User-Token": token,
        "Content-Type": "application/json",
      };

      const res = await fetch(`${API}/notifications`, { headers });
      const data = await res.json();

      if (data.success) {
        setNotifications(data.data || []);
      }
    } catch (e) {
      console.error("fetchNotifications error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = await getUserToken();
      if (!token) return;

      const headers = {
        Authorization: `Bearer ${publicAnonKey}`,
        "X-User-Token": token,
        "Content-Type": "application/json",
      };

      await fetch(`${API}/notifications/${notificationId}/read`, {
        method: "POST",
        headers,
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      // Refresh context notifications count
      refreshNotifications();
    } catch (e) {
      console.error("markAsRead error:", e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = await getUserToken();
      if (!token) return;

      const headers = {
        Authorization: `Bearer ${publicAnonKey}`,
        "X-User-Token": token,
        "Content-Type": "application/json",
      };

      await fetch(`${API}/notifications/read-all`, {
        method: "POST",
        headers,
      });

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      // Refresh context notifications count
      refreshNotifications();
    } catch (e) {
      console.error("markAllAsRead error:", e);
    }
  };

  if (!user) return null;

  const filteredNotifications =
    filter === "all"
      ? notifications
      : notifications.filter((n) => !n.read);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
      <Navbar />

      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center shadow-lg">
                <Bell className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-primary dark:text-white">
                  الإشعارات
                </h1>
                <p className="text-muted-foreground">
                  {unreadCount > 0
                    ? `لديك ${unreadCount} إشعار غير مقروء`
                    : "لا توجد إشعارات جديدة"}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold text-sm transition-colors shadow-lg"
              >
                <CheckCircle className="w-4 h-4" />
                تعليم الكل كمقروء
              </button>
            )}
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-border dark:border-slate-700 mb-6">
          {(
            [
              ["all", `الكل`, notifications.length],
              ["unread", `غير مقروءة`, unreadCount],
            ] as const
          ).map(([tab, label, count]) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`relative px-6 py-3 font-bold text-sm transition-colors ${
                filter === tab
                  ? "text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                {label}
                {(count as number) > 0 && (
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded-full text-white ${
                      tab === "unread" ? "bg-red-500" : "bg-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </span>
              {filter === tab && (
                <motion.div
                  layoutId="notifTab"
                  className="absolute bottom-0 inset-x-0 h-0.5 bg-accent"
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-14 h-14 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground font-bold">
                جارٍ تحميل الإشعارات...
              </p>
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-16 text-center border border-border">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-primary dark:text-white mb-2">
              لا توجد إشعارات
            </h3>
            <p className="text-muted-foreground">
              {filter === "unread"
                ? "جميع إشعاراتك مقروءة"
                : "لا توجد أي إشعارات"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Notification Card
function NotificationCard({
  notification,
  onMarkAsRead,
}: {
  notification: any;
  onMarkAsRead: (id: string) => void;
}) {
  const navigate = useNavigate();
  const iconInfo = NOTIFICATION_ICONS[notification.type] || {
    icon: Bell,
    color: "blue",
  };
  const Icon = iconInfo.icon;

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    if (notification.property_id) {
      navigate(`/property/${notification.property_id}`);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onClick={handleClick}
      className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border overflow-hidden cursor-pointer transition-all hover:shadow-md ${
        notification.read
          ? "border-border opacity-70"
          : `border-${iconInfo.color}-200 dark:border-${iconInfo.color}-800`
      }`}
    >
      <div className="flex gap-4 p-4">
        <div
          className={`w-12 h-12 rounded-xl bg-${iconInfo.color}-100 dark:bg-${iconInfo.color}-900/20 flex items-center justify-center shrink-0`}
        >
          <Icon className={`w-6 h-6 text-${iconInfo.color}-500`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-primary dark:text-white">
              {notification.title}
            </h3>
            {!notification.read && (
              <div className="w-2 h-2 bg-accent rounded-full shrink-0 mt-1.5" />
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-2">
            {notification.message}
          </p>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{timeAgo(notification.created_at)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}