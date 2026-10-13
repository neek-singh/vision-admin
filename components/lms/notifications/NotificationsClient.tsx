"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Bell,
  Send,
  History,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Trash2,
  Users,
  BookOpen,
  User,
  Loader2,
  Calendar,
  X,
  Search,
  CheckCheck,
  Eye,
} from "lucide-react";
import { sendNotification, deleteNotification } from "@/app/actions/lms/notifications";

const NOTIFICATION_TYPES = [
  {
    value: "info",
    label: "Info",
    icon: Info,
    activeBadge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    dotColor: "bg-blue-500",
  },
  {
    value: "success",
    label: "Success",
    icon: CheckCircle2,
    activeBadge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    dotColor: "bg-emerald-500",
  },
  {
    value: "warning",
    label: "Warning",
    icon: AlertTriangle,
    activeBadge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    dotColor: "bg-amber-500",
  },
  {
    value: "alert",
    label: "Urgent",
    icon: AlertCircle,
    activeBadge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    dotColor: "bg-rose-500",
  },
] as const;

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  target_type?: string;
  created_at: string;
  total_delivered: number;
  read_count: number;
};

interface NotificationsClientProps {
  initialNotifications: NotificationItem[];
  courses: { id: string; title: string }[];
  students: { id: string; name: string; student_id?: string }[];
  batches: string[];
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function NotificationsClient({
  initialNotifications,
  courses,
  students,
  batches,
}: NotificationsClientProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info",
    target_type: "all",
    target_value: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!formData.title.trim() || !formData.message.trim()) {
      setFeedback({ type: "error", message: "Please enter both title and message." });
      return;
    }

    if (formData.target_type !== "all" && !formData.target_value) {
      setFeedback({
        type: "error",
        message: `Please select a target ${formData.target_type}.`,
      });
      return;
    }

    startTransition(async () => {
      const result = await sendNotification({
        title: formData.title.trim(),
        message: formData.message.trim(),
        type: formData.type,
        target_type: formData.target_type,
        target_value: formData.target_value,
      });

      if (result.success) {
        setFeedback({
          type: "success",
          message: `Announcement broadcast successfully to ${result.count || 0} students!`,
        });
        setFormData({
          title: "",
          message: "",
          type: "info",
          target_type: "all",
          target_value: "",
        });
        // Reload to sync latest history
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setFeedback({
          type: "error",
          message: result.error || "Failed to send notification.",
        });
      }
    });
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteNotification(id);
      if (result.error) {
        setFeedback({ type: "error", message: result.error });
      } else {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        setFeedback({ type: "success", message: "Notification deleted from history." });
      }
      setDeletingId(null);
    });
  };

  const filteredNotifications = useMemo(() => {
    if (!searchQuery.trim()) return notifications;
    const query = searchQuery.toLowerCase().trim();
    return notifications.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        (n.type && n.type.toLowerCase().includes(query))
    );
  }, [notifications, searchQuery]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Compose Announcement Card */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 md:p-6 space-y-5 lg:sticky lg:top-8">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell size={15} className="text-slate-500 dark:text-slate-400" />
            Send New Announcement
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Push instant alerts & in-app updates to enrolled students.
          </p>
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div
            className={`p-3 rounded-lg flex items-start gap-2.5 text-xs ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50"
                : "bg-rose-50 text-rose-800 border border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/50"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            )}
            <div className="flex-1 font-medium">{feedback.message}</div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={13} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Severity / Type Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
              {NOTIFICATION_TYPES.map((t) => {
                const isSelected = formData.type === t.value;
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: t.value })}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold"
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${t.dotColor}`} />
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              required
              type="text"
              placeholder="e.g., Practical Exam Schedule Released"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-slate-50/60 focus:bg-white dark:bg-slate-800/40 dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 transition-colors"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Message <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Write the full announcement details here..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-slate-50/60 focus:bg-white dark:bg-slate-800/40 dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 transition-colors resize-none"
            />
          </div>

          {/* Target Audience Segmented Control */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Target Audience
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
              {[
                { id: "all", label: "All" },
                { id: "batch", label: "Batch" },
                { id: "course", label: "Course" },
                { id: "student", label: "Student" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      target_type: item.id,
                      target_value: "",
                    })
                  }
                  className={`py-1.5 text-xs font-medium rounded-md transition-all text-center ${
                    formData.target_type === item.id
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Dynamic Specific Selector */}
            {formData.target_type === "batch" && (
              <select
                required
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="">Select Target Batch...</option>
                {batches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            )}

            {formData.target_type === "course" && (
              <select
                required
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="">Select Target Course...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.title}>
                    {c.title}
                  </option>
                ))}
              </select>
            )}

            {formData.target_type === "student" && (
              <select
                required
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="">Select Specific Student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.student_id ? `(${s.student_id})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full h-10 mt-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-semibold shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Broadcasting...</span>
              </>
            ) : (
              <>
                <Send size={13} />
                <span>Send Announcement</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right Column: Recent Notification History */}
      <div className="lg:col-span-7 space-y-4">
        {/* Header with Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <History size={14} className="text-slate-400" />
              Notification History
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
              {filteredNotifications.length}
            </span>
          </div>

          {notifications.length > 0 && (
            <div className="relative w-full sm:w-56">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
              />
            </div>
          )}
        </div>

        {/* History List */}
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800/50 text-slate-400 mx-auto mb-3 flex items-center justify-center">
              <Bell size={18} />
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {searchQuery ? "No matching announcements" : "No notifications dispatched yet"}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
              {searchQuery
                ? "Try searching for a different keyword."
                : "Broadcast announcements from the form on the left to keep students informed."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => {
              const typeConfig =
                NOTIFICATION_TYPES.find((t) => t.value === notif.type) ||
                NOTIFICATION_TYPES[0];
              const Icon = typeConfig.icon;

              const readRate =
                notif.total_delivered > 0
                  ? Math.round((notif.read_count / notif.total_delivered) * 100)
                  : 0;

              return (
                <div
                  key={notif.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all p-4 space-y-3"
                >
                  {/* Card Header Row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${typeConfig.activeBadge}`}
                      >
                        <Icon size={11} />
                        {typeConfig.label}
                      </span>

                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        Target: {notif.target_type || "All"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar size={11} />
                        {formatDate(notif.created_at)}
                      </span>

                      <button
                        onClick={() => handleDelete(notif.id)}
                        disabled={isPending || deletingId === notif.id}
                        title="Delete notification"
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors disabled:opacity-50"
                      >
                        {deletingId === notif.id ? (
                          <Loader2 size={13} className="animate-spin text-rose-500" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                      {notif.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                      {notif.message}
                    </p>
                  </div>

                  {/* Footer Metrics */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-[11px]">
                        <CheckCheck size={13} className="text-blue-500" />
                        <span>{notif.total_delivered} delivered</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Eye size={13} className="text-emerald-500" />
                        <span>
                          {notif.read_count} read ({readRate}%)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
