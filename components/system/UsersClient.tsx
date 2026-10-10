"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toggleBlockUser, updateUserRole } from "@/app/actions/system/users";
import { 
  Users, 
  Globe, 
  Smartphone, 
  ShieldCheck, 
  ShieldAlert, 
  Ban, 
  Search, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Mail, 
  Phone, 
  RotateCcw, 
  Lock, 
  Unlock, 
  UserCheck, 
  Copy, 
  Check, 
  ExternalLink,
  Shield,
  UserCog
} from "lucide-react";

interface SystemUser {
  id: string;
  full_name: string;
  role: "admin" | "student" | "staff" | string;
  email?: string;
  phone?: string;
  roll_number?: string | null;
  platform?: "website" | "app" | "admin" | string;
  is_blocked?: boolean;
  blocked_at?: string | null;
  blocked_reason?: string | null;
  created_at: string;
  updated_at?: string;
}

interface UsersClientProps {
  initialUsers: SystemUser[];
  currentAdminId?: string;
}

export default function UsersClient({ initialUsers, currentAdminId }: UsersClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState<SystemUser[]>(initialUsers || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "website" | "app" | "admin" | "blocked">("all");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Block Modal State
  const [blockingUser, setBlockingUser] = useState<SystemUser | null>(null);
  const [selectedBlockReason, setSelectedBlockReason] = useState("Spam or suspicious registration");
  const [customReasonText, setCustomReasonText] = useState("");
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);

  // Sync with initialUsers if server revalidates
  useEffect(() => {
    setUsers(initialUsers || []);
  }, [initialUsers]);

  // Compute live counts
  const totalCount = users.length;
  const webUsersCount = users.filter(u => u.platform === "website" && u.role !== "admin").length;
  const appUsersCount = users.filter(u => u.platform === "app" && u.role !== "admin").length;
  const adminCount = users.filter(u => u.role === "admin").length;
  const blockedCount = users.filter(u => Boolean(u.is_blocked)).length;

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = 
        !q ||
        user.full_name?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q) ||
        (user.phone && user.phone.includes(q)) ||
        (user.roll_number && user.roll_number.toLowerCase().includes(q)) ||
        user.id.toLowerCase().includes(q);

      const matchesTab = 
        activeTab === "all" ||
        (activeTab === "website" && user.platform === "website" && user.role !== "admin") ||
        (activeTab === "app" && user.platform === "app" && user.role !== "admin") ||
        (activeTab === "admin" && user.role === "admin") ||
        (activeTab === "blocked" && Boolean(user.is_blocked));

      return matchesSearch && matchesTab;
    });
  }, [users, searchTerm, activeTab]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Toggle Role Handler
  const handleToggleRole = async (user: SystemUser) => {
    if (user.id === currentAdminId) {
      alert("You cannot change the role of your own administrative account.");
      return;
    }

    const newRole = user.role === "admin" ? "student" : "admin";
    const confirmPrompt = confirm(
      `Change role for "${user.full_name}" to ${newRole.toUpperCase()}?`
    );
    if (!confirmPrompt) return;

    setUpdatingUserId(user.id);
    // Optimistic update
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));

    try {
      const res = await updateUserRole(user.id, newRole);
      if (res?.error) {
        // Rollback
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: user.role } : u));
        alert(res.error);
        return;
      }
      router.refresh();
    } catch (err: any) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: user.role } : u));
      alert(err.message || "Failed to update role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Open Block Modal
  const openBlockModal = (user: SystemUser) => {
    if (user.id === currentAdminId) {
      alert("You cannot block your own account.");
      return;
    }
    setBlockingUser(user);
    setSelectedBlockReason("Spam or suspicious registration");
    setCustomReasonText("");
  };

  // Confirm Block Action
  const handleConfirmBlock = async () => {
    if (!blockingUser) return;
    setIsSubmittingBlock(true);

    const finalReason = selectedBlockReason === "Other" 
      ? (customReasonText.trim() || "Blocked by administrator") 
      : selectedBlockReason;

    const targetId = blockingUser.id;

    // Optimistic update
    setUsers(prev => prev.map(u => u.id === targetId ? {
      ...u,
      is_blocked: true,
      blocked_at: new Date().toISOString(),
      blocked_reason: finalReason
    } : u));

    try {
      const res = await toggleBlockUser(targetId, true, finalReason);
      if (res?.error) {
        // Rollback
        setUsers(prev => prev.map(u => u.id === targetId ? {
          ...u,
          is_blocked: false,
          blocked_at: null,
          blocked_reason: null
        } : u));
        alert(res.error);
        return;
      }
      setBlockingUser(null);
      router.refresh();
    } catch (err: any) {
      setUsers(prev => prev.map(u => u.id === targetId ? {
        ...u,
        is_blocked: false,
        blocked_at: null,
        blocked_reason: null
      } : u));
      alert(err.message || "Failed to block user.");
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  // Unblock Handler (1-click with confirmation)
  const handleUnblockUser = async (user: SystemUser) => {
    const confirmPrompt = confirm(`Unblock and restore full access for "${user.full_name}"?`);
    if (!confirmPrompt) return;

    setUpdatingUserId(user.id);
    const prevBlocked = user.is_blocked;
    const prevReason = user.blocked_reason;
    const prevAt = user.blocked_at;

    // Optimistic update
    setUsers(prev => prev.map(u => u.id === user.id ? {
      ...u,
      is_blocked: false,
      blocked_at: null,
      blocked_reason: null
    } : u));

    try {
      const res = await toggleBlockUser(user.id, false);
      if (res?.error) {
        setUsers(prev => prev.map(u => u.id === user.id ? {
          ...u,
          is_blocked: prevBlocked,
          blocked_at: prevAt,
          blocked_reason: prevReason
        } : u));
        alert(res.error);
        return;
      }
      router.refresh();
    } catch (err: any) {
      setUsers(prev => prev.map(u => u.id === user.id ? {
        ...u,
        is_blocked: prevBlocked,
        blocked_at: prevAt,
        blocked_reason: prevReason
      } : u));
      alert(err.message || "Failed to unblock user.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Generate dynamic initials gradient
  const getAvatarGradient = (name: string) => {
    const gradients = [
      "from-blue-600 to-indigo-600 text-white",
      "from-violet-600 to-purple-600 text-white",
      "from-emerald-600 to-teal-600 text-white",
      "from-amber-600 to-orange-600 text-white",
      "from-rose-600 to-pink-600 text-white",
      "from-cyan-600 to-blue-600 text-white"
    ];
    let hash = 0;
    const cleanName = name || "User";
    for (let i = 0; i < cleanName.length; i++) {
      hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % gradients.length;
    return gradients[idx];
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-16">
      
      {/* ── Page Header (Minimal & Clean) ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <UserCog size={22} className="text-blue-600 dark:text-blue-400" />
              Manage Users
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">
              {totalCount} Total Accounts
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Website vs App user separation, role permissions &amp; account blocking controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all cursor-pointer"
            title="Refresh Users"
          >
            <RotateCcw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Single Unified Stats Bar (5 Minimal Cards) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        
        {/* Total Users */}
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-blue-50/50 dark:bg-blue-950/30 border-blue-500/50 shadow-2xs"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Total Users
            </span>
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users size={12} />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1 leading-tight">
            {totalCount}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-normal">
            All registered profiles
          </p>
        </button>

        {/* Website Users */}
        <button
          type="button"
          onClick={() => setActiveTab("website")}
          className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
            activeTab === "website"
              ? "bg-amber-50/50 dark:bg-amber-950/30 border-amber-500/50 shadow-2xs"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Website Users
            </span>
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Globe size={12} />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1 leading-tight">
            {webUsersCount}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-normal">
            Public web portal
          </p>
        </button>

        {/* App Users (LMS) */}
        <button
          type="button"
          onClick={() => setActiveTab("app")}
          className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
            activeTab === "app"
              ? "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500/50 shadow-2xs"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              App / LMS Users
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Smartphone size={12} />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1 leading-tight">
            {appUsersCount}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-normal">
            Vision Learn students
          </p>
        </button>

        {/* Administrators */}
        <button
          type="button"
          onClick={() => setActiveTab("admin")}
          className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
            activeTab === "admin"
              ? "bg-violet-50/50 dark:bg-violet-950/30 border-violet-500/50 shadow-2xs"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
              Admins
            </span>
            <div className="w-6 h-6 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <ShieldCheck size={12} />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1 leading-tight">
            {adminCount}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-normal">
            Full admin access
          </p>
        </button>

        {/* Blocked Users */}
        <button
          type="button"
          onClick={() => setActiveTab("blocked")}
          className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
            activeTab === "blocked"
              ? "bg-rose-50/50 dark:bg-rose-950/30 border-rose-500/50 shadow-2xs"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-700 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Blocked Users
            </span>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
              blockedCount > 0 ? "bg-rose-500 text-white" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            }`}>
              <Ban size={12} />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1 leading-tight">
            {blockedCount}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-normal">
            Suspended accounts
          </p>
        </button>

      </div>

      {/* ── Filter Toolbar ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 space-y-2.5 transition-colors">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          
          {/* Search bar */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={14} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, phone, roll..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Segment Filter Tabs */}
          <div className="flex flex-wrap bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200/70 dark:border-slate-800 text-xs w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("website")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "website"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Globe size={11} />
              <span>Website ({webUsersCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("app")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "app"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Smartphone size={11} />
              <span>App / LMS ({appUsersCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "admin"
                  ? "bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <ShieldCheck size={11} />
              <span>Admins ({adminCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("blocked")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "blocked"
                  ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Ban size={11} />
              <span>Blocked ({blockedCount})</span>
            </button>
          </div>

        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-3.5 py-2.5 w-60">User Details</th>
                <th className="px-3.5 py-2.5 w-48">Platform &amp; Roll No.</th>
                <th className="px-3.5 py-2.5 w-52">Contact Info</th>
                <th className="px-3.5 py-2.5 w-28">Role</th>
                <th className="px-3.5 py-2.5 w-24">Status</th>
                <th className="px-3.5 py-2.5 text-right w-44">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-2">
                        <Users size={18} />
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        No users matching criteria
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        Try clearing search query or switching tabs.
                      </p>
                      {(searchTerm || activeTab !== "all") && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm("");
                            setActiveTab("all");
                          }}
                          className="mt-3 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrentAdmin = user.id === currentAdminId;
                  const isBlocked = Boolean(user.is_blocked);
                  const isAppUser = user.platform === "app" && user.role !== "admin";
                  const isWebUser = user.platform === "website" && user.role !== "admin";
                  const isAdmin = user.role === "admin";
                  const avatarGrad = getAvatarGradient(user.full_name);

                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors ${
                        isBlocked ? "bg-rose-50/20 dark:bg-rose-950/10" : ""
                      }`}
                    >
                      
                      {/* User Column */}
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarGrad} flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}>
                            {user.full_name ? user.full_name[0].toUpperCase() : "U"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 dark:text-white truncate">
                                {user.full_name || "Unnamed User"}
                              </span>
                              {isCurrentAdmin && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
                              <span>UID: {user.id.slice(0, 8)}...</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(user.id, `uid-${user.id}`)}
                                className="hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                title="Copy UID"
                              >
                                {copiedId === `uid-${user.id}` ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Platform & Roll No */}
                      <td className="px-3.5 py-2.5">
                        <div className="flex flex-col gap-1 items-start">
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border border-violet-200/70 dark:border-violet-900/40">
                              <Shield size={10} />
                              <span>System Admin</span>
                            </span>
                          ) : isAppUser ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-900/40">
                              <Smartphone size={10} />
                              <span>App / LMS User</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/70 dark:border-amber-900/40">
                              <Globe size={10} />
                              <span>Website User</span>
                            </span>
                          )}

                          {user.roll_number && (
                            <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200/60 dark:border-slate-700">
                              {user.roll_number}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-3.5 py-2.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <Mail size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate max-w-[160px] text-xs font-medium">
                              {user.email || "No email"}
                            </span>
                            {user.email && (
                              <button
                                type="button"
                                onClick={() => handleCopy(user.email!, `email-${user.id}`)}
                                className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                                title="Copy Email"
                              >
                                {copiedId === `email-${user.id}` ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                              </button>
                            )}
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                              <Phone size={10} className="text-slate-400 shrink-0" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Role Toggle */}
                      <td className="px-3.5 py-2.5">
                        <button
                          type="button"
                          disabled={updatingUserId === user.id || isCurrentAdmin}
                          onClick={() => handleToggleRole(user)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                            isCurrentAdmin
                              ? "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200"
                              : isAdmin
                              ? "bg-violet-100/50 hover:bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:hover:bg-violet-900/50 dark:text-violet-300 border-violet-200/80 cursor-pointer"
                              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200/80 cursor-pointer"
                          }`}
                          title={isCurrentAdmin ? "Cannot change own role" : "Click to toggle Admin / Learner"}
                        >
                          {updatingUserId === user.id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <UserCheck size={10} />
                          )}
                          <span className="capitalize">{user.role}</span>
                        </button>
                      </td>

                      {/* Status (Active vs Blocked) */}
                      <td className="px-3.5 py-2.5">
                        {isBlocked ? (
                          <div className="group relative inline-flex">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/40">
                              <Ban size={10} />
                              <span>Blocked</span>
                            </span>
                            {user.blocked_reason && (
                              <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-20 w-48 p-2 rounded-lg bg-slate-900 text-white text-[10px] shadow-lg leading-tight pointer-events-none">
                                <p className="font-semibold text-rose-300">Reason:</p>
                                <p>{user.blocked_reason}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isCurrentAdmin ? (
                            <span className="text-[10px] text-slate-400 italic">
                              Owner account
                            </span>
                          ) : isBlocked ? (
                            <button
                              type="button"
                              disabled={updatingUserId === user.id}
                              onClick={() => handleUnblockUser(user)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer disabled:opacity-50"
                              title="Restore account access"
                            >
                              {updatingUserId === user.id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <Unlock size={11} />
                              )}
                              <span>Unblock</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={updatingUserId === user.id}
                              onClick={() => openBlockModal(user)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900 transition-all cursor-pointer disabled:opacity-50"
                              title="Suspend account access"
                            >
                              <Ban size={11} />
                              <span>Block</span>
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
          {filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              No matching users found.
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isCurrentAdmin = user.id === currentAdminId;
              const isBlocked = Boolean(user.is_blocked);
              const isAppUser = user.platform === "app" && user.role !== "admin";
              const isWebUser = user.platform === "website" && user.role !== "admin";
              const isAdmin = user.role === "admin";
              const avatarGrad = getAvatarGradient(user.full_name);

              return (
                <div 
                  key={user.id} 
                  className={`p-3 space-y-2.5 ${isBlocked ? "bg-rose-50/20 dark:bg-rose-950/10" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarGrad} flex items-center justify-center font-bold text-xs shrink-0`}>
                        {user.full_name ? user.full_name[0].toUpperCase() : "U"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                            {user.full_name || "Unnamed User"}
                          </p>
                          {isCurrentAdmin && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-blue-100 text-blue-700">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">UID: {user.id.slice(0, 8)}...</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isBlocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                          <Ban size={9} />
                          <span>Blocked</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Active</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    {isAdmin ? (
                      <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 font-semibold">
                        System Admin
                      </span>
                    ) : isAppUser ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                        App / LMS User {user.roll_number ? `(${user.roll_number})` : ""}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                        Website User
                      </span>
                    )}

                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 dark:text-slate-300">{user.email || "No email"}</span>
                    {user.phone && (
                      <>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600 dark:text-slate-300">{user.phone}</span>
                      </>
                    )}
                  </div>

                  {!isCurrentAdmin && (
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleToggleRole(user)}
                        disabled={updatingUserId === user.id}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        {isAdmin ? "Make Learner" : "Make Admin"}
                      </button>

                      {isBlocked ? (
                        <button
                          type="button"
                          onClick={() => handleUnblockUser(user)}
                          disabled={updatingUserId === user.id}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
                        >
                          Unblock User
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openBlockModal(user)}
                          disabled={updatingUserId === user.id}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                        >
                          Block User
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* ── Block User Confirmation Modal ── */}
      {blockingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
                  <Ban size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Block User Account
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Suspend portal login and feature access
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBlockingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3.5 text-xs">
              {/* Target User Info */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 shrink-0">
                  {blockingUser.full_name ? blockingUser.full_name[0].toUpperCase() : "U"}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white truncate">
                    {blockingUser.full_name}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {blockingUser.email || "No email"} • {blockingUser.platform === "app" ? "App User" : "Website User"}
                  </p>
                </div>
              </div>

              {/* Block Reason Radio Options */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Select Suspension Reason:
                </label>
                <div className="space-y-1.5">
                  {[
                    "Spam or suspicious registration",
                    "Course fees pending / Defaulted",
                    "Disciplinary or policy violation",
                    "Security precaution / Account compromise",
                    "Other"
                  ].map((reason) => (
                    <label 
                      key={reason}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        selectedBlockReason === reason
                          ? "bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-slate-900 dark:text-white font-semibold"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="block_reason"
                        value={reason}
                        checked={selectedBlockReason === reason}
                        onChange={() => setSelectedBlockReason(reason)}
                        className="text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Reason Textbox */}
              {selectedBlockReason === "Other" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Specify Custom Reason:
                  </label>
                  <input
                    type="text"
                    value={customReasonText}
                    onChange={(e) => setCustomReasonText(e.target.value)}
                    placeholder="Enter reason for suspension..."
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-rose-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              {/* Warning note */}
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                <span>
                  The user will be immediately blocked from portal features. You can unblock this user anytime with 1 click.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setBlockingUser(null)}
                disabled={isSubmittingBlock}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBlock}
                disabled={isSubmittingBlock}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingBlock ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Blocking...</span>
                  </>
                ) : (
                  <>
                    <Ban size={12} />
                    <span>Confirm Block</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
