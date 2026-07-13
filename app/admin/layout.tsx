"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Calendar,
  Image as ImageIcon,
  Users,
  GraduationCap,
  Mail,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  User,
  UserPlus,
  ClipboardList,
  PenTool,
  CheckCircle2,
  Wallet,
  Sun,
  Moon,
  MessageSquare,
  TrendingUp,
  TrendingDown
} from "lucide-react";

const navGroups = [
  {
    label: "Core",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ]
  },
  {
    label: "Vision Learn (LMS)",
    items: [
      { href: "/admin/lms", label: "LMS Dashboard", icon: ClipboardList },
      { href: "/admin/admissions", label: "Enquiry Admissions", icon: GraduationCap },
      { href: "/admin/students", label: "Manage Students", icon: Users },
      { href: "/admin/students/add", label: "Add Student", icon: UserPlus },
      { href: "/admin/courses", label: "Manage Courses", icon: BookOpen },
      { href: "/admin/lms/content", label: "Course Curriculum", icon: FileText },
      { href: "/admin/lms/batch-content", label: "Batch Content", icon: LayoutDashboard },
      { href: "/admin/lms/tests", label: "Manage Tests", icon: ClipboardList },
      { href: "/admin/lms/materials", label: "Notes & Materials", icon: FileText },
      { href: "/admin/lms/assignments", label: "Assignments", icon: PenTool },
      { href: "/admin/lms/attendance", label: "Daily Attendance", icon: CheckCircle2 },
      { href: "/admin/schedule", label: "Academic Schedule", icon: Calendar },
      { href: "/admin/lms/calendar", label: "Calendar & Events", icon: Calendar },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
      { href: "/admin/fees", label: "Fees Management", icon: Wallet },
      { href: "/admin/expenses", label: "Expenses Management", icon: TrendingDown },
      { href: "/admin/lms/chats", label: "LMS Chats", icon: MessageSquare },
      { href: "/admin/lms/analytics", label: "LMS Analytics", icon: TrendingUp },
    ]
  },
  {
    label: "Vision Web (Website)",
    items: [
      { href: "/admin/batches", label: "Batches", icon: Calendar },
      { href: "/admin/contacts", label: "General Enquiries", icon: Mail },
      { href: "/admin/blogs", label: "Blogs", icon: FileText },
      { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
      { href: "/admin/stats", label: "Website Stats", icon: ClipboardList },
      { href: "/admin/chats", label: "Web Chats", icon: MessageSquare },
      { href: "/admin/analytics", label: "Web Analytics", icon: TrendingUp },
    ]
  },
  {
    label: "System",
    items: [
      { href: "/admin/users", label: "Admin Users", icon: ClipboardList },
    ]
  }
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [adminMode, setAdminMode] = useState<"web" | "lms">("web");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Load configuration from localStorage & system preference on mount
  useEffect(() => {
    setMounted(true);
    
    // Theme Preference
    const savedTheme = localStorage.getItem("admin_theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }

    // Sidebar Preference
    const savedSidebar = localStorage.getItem("sidebar_collapsed");
    if (savedSidebar) {
      setIsCollapsed(savedSidebar === "true");
    }
  }, []);

  // Update DOM and localstorage when theme changes
  useEffect(() => {
    if (!mounted) return;
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("admin_theme", theme);
  }, [theme, mounted]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
    
    // Auto-set mode based on pathname
    if (
      pathname.includes('/lms') || 
      pathname.includes('/courses') || 
      pathname.includes('/students') || 
      pathname.includes('/admissions') || 
      pathname.includes('/fees') || 
      pathname.includes('/schedule')
    ) {
      setAdminMode("lms");
    } else {
      setAdminMode("web");
    }
  }, [pathname]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      const nextCollapsed = !isCollapsed;
      setIsCollapsed(nextCollapsed);
      localStorage.setItem("sidebar_collapsed", String(nextCollapsed));
    }
  };

  // Dynamically update Dashboard link target based on current mode
  const computedNavGroups = navGroups.map(group => {
    if (group.label === "Core") {
      return {
        ...group,
        items: group.items.map(item => {
          if (item.label === "Dashboard") {
            return {
              ...item,
              href: adminMode === "lms" ? "/admin/lms" : "/admin"
            };
          }
          return item;
        })
      };
    }
    return group;
  });

  const filteredGroups = computedNavGroups.filter(group => {
    if (group.label === "Core" || group.label === "System") return true;
    if (adminMode === "lms") return group.label.includes("Learn");
    if (adminMode === "web") return group.label.includes("Web");
    return true;
  });

  // Render a minimal loader during hydration to prevent mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#090f1f] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 lg:hidden transition-all duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 bg-[#0f172a] dark:bg-[#060a13] text-slate-300 dark:text-slate-400 transition-all duration-300 ease-in-out border-r border-slate-800 dark:border-slate-900/60
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${isCollapsed ? "lg:w-[84px]" : "lg:w-[270px]"} w-[270px] flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className={`h-16 flex items-center border-b border-slate-800 dark:border-slate-900/60 justify-between px-5 ${isCollapsed ? "lg:justify-center lg:px-0" : ""}`}>
          <div className={`flex items-center gap-2 ${isCollapsed ? "lg:hidden" : ""}`}>
            <Link href="/admin" className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
              <div className="w-9 h-9 bg-white rounded-xl relative flex items-center justify-center p-1 shadow-md transition-transform hover:scale-105 duration-200">
                <Image 
                  src="https://res.cloudinary.com/ddiooxxks/image/upload/f_auto,q_auto/logo_unnut8.png" 
                  alt="Vision IT Logo" 
                  width={32} 
                  height={32} 
                  className="object-contain"
                  priority
                />
              </div>
              <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent font-black tracking-wide">Vision Admin</span>
            </Link>
          </div>
          {isCollapsed && (
            <div className="hidden lg:flex w-9 h-9 bg-white rounded-xl relative items-center justify-center p-1 shadow-md">
              <Image 
                src="https://res.cloudinary.com/ddiooxxks/image/upload/f_auto,q_auto/logo_unnut8.png" 
                alt="Vision IT Logo" 
                width={32} 
                height={32} 
                className="object-contain"
                priority
              />
            </div>
          )}
          <div className="flex items-center">
            <button 
              onClick={toggleSidebar}
              className={`hidden lg:block p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900/80 rounded-lg transition-all`}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <button 
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900/80 rounded-lg transition-all"
              title="Close Menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6 custom-scrollbar">
          {filteredGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              {!isCollapsed ? (
                <h3 className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  {group.label}
                </h3>
              ) : (
                <div className="h-4 border-b border-slate-800 dark:border-slate-900/60 my-2 mx-3"></div>
              )}
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                    ${isActive 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" 
                      : "hover:bg-slate-800/60 dark:hover:bg-slate-900/40 hover:text-white"}`}
                  >
                    <item.icon size={20} className={`${isActive ? "text-white" : "text-slate-400 group-hover:text-blue-400"} transition-colors`} />
                    <span className={`font-semibold text-sm whitespace-nowrap lg:block ${isCollapsed ? "lg:hidden" : ""}`}>
                      {item.label}
                    </span>
                    {isCollapsed && (
                      <div className="hidden lg:block absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 border border-slate-700 shadow-md">
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 dark:border-slate-900/60">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all group relative"
          >
            <LogOut size={20} className="group-hover:text-red-400" />
            <span className={`font-semibold text-sm lg:block ${isCollapsed ? "lg:hidden" : ""}`}>Logout</span>
            {isCollapsed && (
              <div className="hidden lg:block absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 border border-slate-700 shadow-md">
                Logout
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out min-h-screen
        ${isCollapsed ? "lg:ml-[84px]" : "lg:ml-[270px]"}`}
      >
        {/* Header/Navbar */}
        <header className="h-16 bg-white/80 dark:bg-[#090f1f]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-4">
            {/* Sidebar toggle for mobile drawer or desktop collapse */}
            <button
              onClick={toggleSidebar}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Toggle Menu"
            >
              <Menu size={20} />
            </button>
            
            {/* Nav Mode Slider (Web / Learn) */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 sm:p-1 rounded-xl relative border border-slate-200/50 dark:border-slate-800/50 shadow-inner">
              <Link 
                href="/admin" 
                onClick={() => setAdminMode("web")}
                className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-200 whitespace-nowrap z-10 ${
                  adminMode === "web"
                    ? "bg-white dark:bg-slate-850 text-orange-600 dark:text-orange-400 shadow-sm font-extrabold scale-105"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Web
              </Link>
              <Link 
                href="/admin/lms" 
                onClick={() => setAdminMode("lms")}
                className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-200 whitespace-nowrap z-10 ${
                  adminMode === "lms"
                    ? "bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-400 shadow-sm font-extrabold scale-105"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Learn
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 lg:gap-4">
            {/* Search Bar */}
            <div className="hidden sm:flex items-center relative group">
              <Search className="absolute left-3.5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search everything..." 
                className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-blue-500/50 dark:focus:border-blue-500/50 focus:bg-white dark:focus:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm rounded-full w-40 lg:w-60 transition-all outline-none"
              />
            </div>

            {/* Light/Dark Mode Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all duration-200 relative overflow-hidden"
              aria-label="Toggle Theme"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === "light" ? (
                <Moon size={20} className="text-slate-600" />
              ) : (
                <Sun size={20} className="text-amber-400 animate-pulse" />
              )}
            </button>

            {/* Notification Center */}
            <button className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#090f1f]"></span>
            </button>

            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>

            {/* User Profile */}
            <button className="flex items-center gap-2 pl-2 pr-1 py-1 hover:bg-slate-100 dark:hover:bg-slate-900/60 rounded-full transition-colors">
              <div className="hidden text-right lg:block">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">Admin User</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Super Admin</p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center rounded-full shadow-md">
                <User size={18} />
              </div>
            </button>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
        
        /* Glassmorphism utility */
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          border: 1px border rgba(255, 255, 255, 0.3);
        }
        .dark .glass-card {
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(12px);
          border: 1px border rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
}