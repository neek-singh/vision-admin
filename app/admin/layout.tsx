"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState, useEffect } from "react";
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
  ClipboardList
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
      { href: "/admin/lms/content", label: "Course Content", icon: FileText },
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
  const [adminMode, setAdminMode] = useState<"web" | "lms" | "all">("all");
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
    
    // Auto-set mode based on pathname
    if (pathname.includes('/lms') || pathname.includes('/courses') || pathname.includes('/students') || pathname.includes('/admissions')) {
      setAdminMode("lms");
    } else if (pathname.includes('/blogs') || pathname.includes('/gallery') || pathname.includes('/contacts') || pathname.includes('/batches')) {
      setAdminMode("web");
    } else {
      setAdminMode("all");
    }
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const filteredGroups = navGroups.filter(group => {
    if (adminMode === "all") return true;
    if (group.label === "Core" || group.label === "System") return true;
    if (adminMode === "lms") return group.label.includes("Learn");
    if (adminMode === "web") return group.label.includes("Web");
    return true;
  });

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 bg-[#0f172a] text-slate-300 transition-all duration-300 ease-in-out border-r border-slate-800
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${isCollapsed ? "lg:w-[80px]" : "lg:w-[260px]"} w-[260px] flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className={`h-16 flex items-center border-b border-slate-800 ${isCollapsed ? "justify-center" : "justify-between px-4"}`}>
          {!isCollapsed && (
            <Link href="/admin" className="font-bold text-xl text-white tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm">V</div>
              <span>Vision IT</span>
            </Link>
          )}
          <button 
            onClick={toggleSidebar}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
          {filteredGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              {!isCollapsed && (
                <h3 className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  {group.label}
                </h3>
              )}
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                    ${isActive 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                      : "hover:bg-slate-800/50 hover:text-white"}`}
                  >
                    <item.icon size={20} className={`${isActive ? "text-white" : "text-slate-400 group-hover:text-blue-400"} transition-colors`} />
                    {!isCollapsed && (
                      <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>
                    )}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-slate-700">
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
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all group"
          >
            <LogOut size={20} />
            {!isCollapsed && <span className="font-medium text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out
        ${isCollapsed ? "lg:ml-[80px]" : "lg:ml-[260px]"}`}
      >
        {/* Header/Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
            
            <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <Link 
                href="/admin" 
                onClick={() => setAdminMode("all")}
                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  adminMode === "all"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                All
              </Link>
              <Link 
                href="/admin/blogs" 
                onClick={() => setAdminMode("web")}
                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  adminMode === "web"
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Vision Web
              </Link>
              <Link 
                href="/admin/lms" 
                onClick={() => setAdminMode("lms")}
                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  adminMode === "lms"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Vision Learn
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <div className="hidden sm:flex items-center relative group">
              <Search className="absolute left-3 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-1.5 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 text-sm rounded-full w-40 lg:w-60 transition-all outline-none"
              />
            </div>

            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

            <button className="flex items-center gap-2 pl-2 pr-1 py-1 hover:bg-slate-100 rounded-full transition-colors">
              <div className="hidden text-right lg:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">Admin User</p>
                <p className="text-[10px] text-slate-500 leading-tight">Super Admin</p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center rounded-full shadow-md">
                <User size={18} />
              </div>
            </button>
          </div>
        </header>

        {/* Content */}
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
      `}</style>
    </div>
  );
}