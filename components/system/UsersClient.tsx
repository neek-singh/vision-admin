"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Users, 
  ShieldAlert, 
  GraduationCap, 
  Search, 
  X, 
  Loader2, 
  ShieldCheck, 
  UserCheck, 
  Sparkles, 
  Clock, 
  Mail, 
  Calendar 
} from "lucide-react";

export default function UsersClient({ initialUsers }: { initialUsers: any[] }) {
  const router = useRouter();
  const [localUsers, setLocalUsers] = useState<any[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); // all, admin, student
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Compute Stats
  const totalCount = localUsers.length;
  const adminCount = localUsers.filter(u => u.role === "admin").length;
  const studentCount = localUsers.filter(u => u.role !== "admin").length;

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return localUsers.filter(user => {
      const matchesSearch = 
        !searchTerm.trim() ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = 
        roleFilter === "all" || 
        (roleFilter === "admin" && user.role === "admin") ||
        (roleFilter === "student" && user.role !== "admin");

      return matchesSearch && matchesRole;
    });
  }, [localUsers, searchTerm, roleFilter]);

  // Handle Role Toggling
  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "student" : "admin";
    const confirmChange = confirm(
      `Are you sure you want to change the role for this user to ${newRole.toUpperCase()}?`
    );
    if (!confirmChange) return;

    setUpdatingUserId(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw error;

      // Update locally for instant responsiveness
      setLocalUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, role: newRole } : u))
      );
      router.refresh();
    } catch (err: any) {
      alert("Failed to update role: " + err.message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Avatar Gradient Selector
  const getAvatarGradient = (name: string) => {
    const gradients = [
      "from-pink-500 to-rose-500 text-white",
      "from-purple-500 to-indigo-500 text-white",
      "from-blue-500 to-cyan-500 text-white",
      "from-teal-500 to-emerald-500 text-white",
      "from-amber-500 to-orange-500 text-white",
      "from-violet-500 to-fuchsia-500 text-white"
    ];
    let hash = 0;
    const cleanName = name || "New User";
    for (let i = 0; i < cleanName.length; i++) {
      hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard 
          title="Total Users" 
          value={totalCount} 
          icon={<Users size={22} />} 
          color="border-blue-100/50 bg-gradient-to-br from-blue-50/40 via-white to-white dark:from-blue-950/20 dark:to-slate-900" 
          sub="Registered accounts"
          accentColor="blue"
        />
        <StatCard 
          title="Administrators" 
          value={adminCount} 
          icon={<ShieldCheck size={22} />} 
          color="border-purple-100/50 bg-gradient-to-br from-purple-50/40 via-white to-white dark:from-purple-950/20 dark:to-slate-900" 
          sub="Full system control"
          accentColor="purple"
        />
        <StatCard 
          title="Learners / Students" 
          value={studentCount} 
          icon={<GraduationCap size={22} />} 
          color="border-emerald-100/50 bg-gradient-to-br from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:to-slate-900" 
          sub="Active student profiles"
          accentColor="emerald"
        />
      </div>

      {/* Filter and Control Center */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Table Controls Header */}
        <div className="p-6 sm:p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">System Users</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Manage credentials, permissions, and roles for registered staff and students.</p>
          </div>
        </div>

        {/* Dynamic Filters Bar */}
        <div className="px-6 sm:px-8 py-4 bg-slate-50/40 dark:bg-slate-900/50 border-b border-slate-50 dark:border-slate-800/80 flex flex-col lg:flex-row items-center gap-4 justify-between">
          
          {/* Search bar */}
          <div className="relative w-full lg:max-w-xs shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 dark:border-slate-800 dark:bg-slate-950/40 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-xs font-bold text-slate-850 dark:text-slate-200"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")} 
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={12}/>
              </button>
            )}
          </div>

          {/* Tab filters */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-955/60 p-1 border border-slate-200 dark:border-slate-800 rounded-xl">
            {[
              { id: "all", label: "All Users" },
              { id: "admin", label: "Admins" },
              { id: "student", label: "Learners" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  roleFilter === tab.id 
                    ? "bg-slate-900 text-white dark:bg-slate-800"
                    : "text-slate-550 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          {filteredUsers.length === 0 ? (
            <div className="px-8 py-20 text-center text-slate-450 font-bold">
              No matching system users found.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/30 dark:bg-slate-900/10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 dark:border-slate-850">
                  <th className="px-8 py-4">User Details</th>
                  <th className="px-8 py-4">Email Address</th>
                  <th className="px-8 py-4">Joined Date</th>
                  <th className="px-8 py-4">Current Role</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                {filteredUsers.map((user) => {
                  const avatarGradient = getAvatarGradient(user.full_name);
                  const formattedDate = user.created_at 
                    ? new Date(user.created_at).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })
                    : "N/A";
                  
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 bg-gradient-to-br ${avatarGradient} rounded-xl flex items-center justify-center font-black text-sm shadow-sm`}>
                            {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">{user.full_name || "New User"}</div>
                            <div className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">UID: {user.id.slice(0,8)}...</div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-8 py-5 text-xs font-bold text-slate-600 dark:text-slate-350">
                        <div className="flex items-center gap-1.5">
                          <Mail size={12} className="opacity-40" />
                          {user.email}
                        </div>
                      </td>

                      <td className="px-8 py-5 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="opacity-40" />
                          {formattedDate}
                        </div>
                      </td>

                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all ${
                          user.role === 'admin' 
                            ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30' 
                            : 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30'
                        }`}>
                          {user.role}
                        </span>
                      </td>

                      <td className="px-8 py-5 text-right">
                        <button
                          disabled={updatingUserId !== null}
                          onClick={() => handleToggleRole(user.id, user.role)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm hover:shadow active:scale-95 cursor-pointer disabled:opacity-40 flex items-center gap-1.5 ml-auto ${
                            user.role === 'admin'
                              ? 'text-indigo-600 border-indigo-100 hover:bg-indigo-50 dark:border-indigo-950/40 dark:hover:bg-indigo-950/30 dark:text-indigo-400'
                              : 'text-purple-600 border-purple-100 hover:bg-purple-50 dark:border-purple-950/40 dark:hover:bg-purple-950/30 dark:text-purple-400'
                          }`}
                        >
                          {updatingUserId === user.id ? (
                            <Loader2 className="animate-spin" size={12} />
                          ) : user.role === 'admin' ? (
                            <UserCheck size={12} />
                          ) : (
                            <ShieldAlert size={12} />
                          )}
                          {updatingUserId === user.id ? "Updating..." : (user.role === 'admin' ? "Make Learner" : "Make Admin")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile View Cards */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredUsers.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-400 dark:text-slate-500 font-bold">
              No matching users found.
            </div>
          ) : (
            filteredUsers.map((user) => {
              const avatarGradient = getAvatarGradient(user.full_name);
              const formattedDate = user.created_at 
                ? new Date(user.created_at).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })
                : "N/A";
              
              return (
                <div key={user.id} className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 bg-gradient-to-br ${avatarGradient} rounded-2xl flex items-center justify-center text-lg font-black shadow-sm`}>
                        {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{user.full_name || "New User"}</h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-550 uppercase tracking-widest mt-0.5">UID: {user.id.slice(0,8)}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                      user.role === 'admin' 
                        ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30' 
                        : 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30'
                    }`}>
                      {user.role}
                    </span>
                  </div>

                  <div className="bg-slate-50/50 dark:bg-slate-955/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Email Address</span>
                      <p className="text-slate-700 dark:text-slate-200">{user.email}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/40 dark:border-slate-800/80">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Joined Date</span>
                      <p className="text-slate-700 dark:text-slate-200">{formattedDate}</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      disabled={updatingUserId !== null}
                      onClick={() => handleToggleRole(user.id, user.role)}
                      className={`w-full py-3 rounded-xl text-xs font-bold transition-all border shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 ${
                        user.role === 'admin'
                          ? 'text-indigo-650 border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50 dark:border-indigo-950/40 dark:hover:bg-indigo-955/40'
                          : 'text-purple-650 border-purple-100 bg-purple-50/30 hover:bg-purple-50 dark:border-purple-950/40 dark:hover:bg-purple-955/40'
                      }`}
                    >
                      {updatingUserId === user.id ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : user.role === 'admin' ? (
                        <UserCheck size={14} />
                      ) : (
                        <ShieldAlert size={14} />
                      )}
                      {updatingUserId === user.id ? "Updating User role..." : (user.role === 'admin' ? "Demote to Learner" : "Promote to Admin")}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}

function StatCard({ title, value, icon, color, sub, accentColor }: any) {
  const accentStyles: Record<string, string> = {
    purple: "group-hover:bg-purple-500 group-hover:text-white",
    emerald: "group-hover:bg-emerald-500 group-hover:text-white",
    blue: "group-hover:bg-blue-600 group-hover:text-white"
  };

  return (
    <div className={`p-6 rounded-[2rem] border transition-all duration-300 relative overflow-hidden group hover:-translate-y-0.5 ${color}`}>
      <div className={`absolute top-4 right-4 p-2.5 rounded-xl transition-all duration-300 bg-white dark:bg-slate-950 shadow-sm border border-slate-100/50 dark:border-slate-850/80 ${accentStyles[accentColor]}`}>
        {icon}
      </div>
      <div className="relative z-10 space-y-1.5">
        <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">{value.toLocaleString()}</h3>
        <p className="text-[10px] font-semibold text-slate-450 dark:text-slate-500 opacity-80">{sub}</p>
      </div>
    </div>
  );
}
