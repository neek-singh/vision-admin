"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Menu,
  Search,
  Moon,
  Sun,
  Bell,
  User,
  LogOut,
  ChevronDown,
  ExternalLink,
  Shield,
  ArrowRight,
  X,
  Calendar,
  BookOpen,
  Users as UsersIcon,
  FileText,
  CreditCard,
  MessageSquare,
  TrendingUp,
  GraduationCap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export interface NavSearchItem {
  title: string;
  path: string;
  category: "Core" | "LMS" | "Web" | "System";
  icon?: any;
  keywords: string[];
}

const SEARCHABLE_ITEMS: NavSearchItem[] = [
  // Core
  { title: "Admin Overview", path: "/admin", category: "Core", keywords: ["dashboard", "home", "stats", "overview"] },
  { title: "LMS Dashboard", path: "/admin/lms", category: "LMS", keywords: ["learning", "students", "batches", "classes"] },

  // LMS
  { title: "Enquiry Admissions", path: "/admin/admissions", category: "LMS", icon: GraduationCap, keywords: ["admissions", "applications", "enquiries", "students", "leads"] },
  { title: "Manage Students", path: "/admin/students", category: "LMS", icon: UsersIcon, keywords: ["students", "learners", "directory", "id cards", "profiles"] },
  { title: "Add New Student", path: "/admin/students/add", category: "LMS", icon: UsersIcon, keywords: ["add student", "register student", "new enrollment"] },
  { title: "Manage Courses", path: "/admin/courses", category: "LMS", icon: BookOpen, keywords: ["courses", "syllabus", "fees", "duration"] },
  { title: "Course Curriculum", path: "/admin/lms/content", category: "LMS", icon: FileText, keywords: ["curriculum", "modules", "chapters", "lessons", "content"] },
  { title: "Tests & Exams", path: "/admin/lms/tests", category: "LMS", icon: FileText, keywords: ["tests", "exams", "quizzes", "results", "marks"] },
  { title: "Notes & Materials", path: "/admin/lms/materials", category: "LMS", icon: FileText, keywords: ["notes", "materials", "pdf", "resources", "downloads"] },
  { title: "Projects & Assignments", path: "/admin/lms/projects", category: "LMS", keywords: ["projects", "assignments", "submissions", "code"] },
  { title: "Daily Attendance", path: "/admin/lms/attendance", category: "LMS", keywords: ["attendance", "present", "absent", "qr scanner", "roll call"] },
  { title: "Calendar & Events", path: "/admin/calendar", category: "LMS", icon: Calendar, keywords: ["calendar", "clander", "events", "dates", "schedule", "timetable"] },
  { title: "Academic Schedule", path: "/admin/schedule", category: "LMS", icon: Calendar, keywords: ["schedule", "timing", "classes", "calendar", "clander", "timetable"] },
  { title: "Notification Center", path: "/admin/notifications", category: "LMS", icon: Bell, keywords: ["notifications", "announcements", "broadcast", "alerts", "updates"] },
  { title: "Fees Management", path: "/admin/fees", category: "LMS", icon: CreditCard, keywords: ["fees", "payments", "transactions", "receipts", "dues"] },
  { title: "Expenses Management", path: "/admin/expenses", category: "LMS", keywords: ["expenses", "costs", "spending", "finance"] },
  { title: "LMS Student Chats", path: "/admin/lms/chats", category: "LMS", icon: MessageSquare, keywords: ["chats", "messages", "support", "students"] },
  { title: "LMS Analytics", path: "/admin/lms/analytics", category: "LMS", icon: TrendingUp, keywords: ["analytics", "performance", "metrics", "reports"] },

  // Web
  { title: "Batches", path: "/admin/batches", category: "Web", icon: Calendar, keywords: ["batches", "cohorts", "groups", "admissions"] },
  { title: "General Inquiries", path: "/admin/contacts", category: "Web", icon: MessageSquare, keywords: ["contacts", "inquiries", "leads", "messages", "form"] },
  { title: "Blogs & Articles", path: "/admin/blogs", category: "Web", icon: FileText, keywords: ["blogs", "posts", "news", "articles", "stories"] },
  { title: "Gallery Manager", path: "/admin/gallery", category: "Web", keywords: ["gallery", "photos", "images", "pictures", "upload"] },
  { title: "Website Stats", path: "/admin/stats", category: "Web", keywords: ["stats", "about stats", "counters", "numbers"] },
  { title: "Web Inquiries Chat", path: "/admin/chats", category: "Web", icon: MessageSquare, keywords: ["web chats", "messages", "inquiry chat"] },
  { title: "Web & Growth Analytics", path: "/admin/analytics", category: "Web", icon: TrendingUp, keywords: ["analytics", "traffic", "leads", "funnel", "pageviews"] },

  // System
  { title: "System Users & Admins", path: "/admin/users", category: "System", keywords: ["users", "admins", "staff", "permissions", "roles"] },
];

function formatDisplayName(rawName: string): string {
  if (!rawName) return "Admin User";

  // If email was passed as name, strip the domain
  let clean = rawName.includes("@") ? rawName.split("@")[0] : rawName;

  // Handle specific handles or patterns like "ishwarsingh04080" -> "Ishwar Singh"
  if (/^ishwar\s*singh/i.test(clean)) {
    return "Ishwar Singh";
  }

  // Remove trailing and embedded numbers e.g. "user1234" -> "user"
  clean = clean.replace(/\d+/g, " ");

  // Replace common delimiters (dots, underscores, hyphens) with space
  clean = clean.replace(/[._-]+/g, " ");

  // Separate camelCase words: "johnDoe" -> "john Doe"
  clean = clean.replace(/([a-z])([A-Z])/g, "$1 $2");

  // Title-case each word
  const words = clean
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

  return words.length > 0 ? words.join(" ") : "Admin User";
}

interface AdminNavbarProps {
  toggleSidebar: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  handleLogout: () => Promise<void>;
  adminMode?: "web" | "lms";
  setAdminMode?: (mode: "web" | "lms") => void;
}

export default function AdminNavbar({
  toggleSidebar,
  theme,
  toggleTheme,
  handleLogout,
}: AdminNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Popover menus state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // User details & live notifications
  const [profileData, setProfileData] = useState<{
    name: string;
    role: string;
    email: string;
  }>({
    name: "Admin User",
    role: "Super Admin",
    email: "admin@visionitinstitute.com",
  });

  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // 1. Load user profile & notification previews on mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, role, email")
            .eq("id", user.id)
            .maybeSingle();

          if (!isMounted) return;

          setProfileData({
            name: profile?.full_name || user.email?.split("@")[0] || "Admin User",
            role: profile?.role ? profile.role.toUpperCase() : "Super Admin",
            email: user.email || "",
          });
        }

        // Fetch recent notifications
        const { data: notifs } = await supabase
          .from("notifications")
          .select("id, title, message, type, created_at")
          .order("created_at", { ascending: false })
          .limit(4);

        if (!isMounted) return;

        if (notifs) {
          setRecentNotifications(notifs);
          setUnreadCount(notifs.length);
        }
      } catch (e: any) {
        if (
          e?.name === "NavigatorLockAcquireTimeoutError" ||
          e?.message?.includes("stole it") ||
          e?.name === "AbortError"
        ) {
          // Harmless lock contest / double invocation error in dev
          return;
        }
        console.error("Navbar data error:", e);
      }
    }
    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Click outside listeners for popovers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. Global keyboard shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (window.innerWidth < 640) {
          setIsMobileSearchExpanded(true);
        }
        setIsSearchOpen(true);
        setTimeout(() => {
          (window.innerWidth < 640 ? mobileSearchInputRef : searchInputRef).current?.focus();
        }, 50);
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsMobileSearchExpanded(false);
        setIsNotificationsOpen(false);
        setIsProfileOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset mobile search expansion on route change
  useEffect(() => {
    setIsMobileSearchExpanded(false);
    setIsSearchOpen(false);
  }, [pathname]);

  // 4. Search matching items
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();

    return SEARCHABLE_ITEMS.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchKeywords = item.keywords.some((kw) => kw.includes(q));
      return matchTitle || matchCategory || matchKeywords;
    }).slice(0, 8);
  }, [searchQuery]);

  const handleSelectResult = (item: NavSearchItem) => {
    setIsSearchOpen(false);
    setIsMobileSearchExpanded(false);
    setSearchQuery("");
    router.push(item.path);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchResults.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = searchResults[selectedIndex] || searchResults[0];
      if (selected) handleSelectResult(selected);
    }
  };

  // 5. Page title display based on current pathname
  const pageTitle = useMemo(() => {
    const item = SEARCHABLE_ITEMS.find((s) => s.path === pathname);
    if (item) return item.title;
    if (pathname.startsWith("/admin/lms/content")) return "Course Curriculum";
    if (pathname.startsWith("/admin/lms/tests")) return "Tests & Exams";
    if (pathname.startsWith("/admin/lms/materials")) return "Notes & Materials";
    if (pathname.startsWith("/admin/lms/projects")) return "Projects & Assignments";
    if (pathname.startsWith("/admin/lms/attendance")) return "Daily Attendance";
    if (pathname.startsWith("/admin/lms/chats")) return "Student Chats";
    if (pathname.startsWith("/admin/lms/analytics")) return "LMS Analytics";
    if (pathname.startsWith("/admin/lms")) return "LMS Portal";
    if (pathname.startsWith("/admin/students")) return "Manage Students";
    if (pathname.startsWith("/admin/batches")) return "Batches";
    if (pathname.startsWith("/admin/blogs")) return "Blogs & Articles";
    if (pathname.startsWith("/admin/courses")) return "Manage Courses";
    if (pathname.startsWith("/admin/calendar")) return "Calendar & Events";
    if (pathname.startsWith("/admin/schedule")) return "Academic Schedule";
    if (pathname.startsWith("/admin/fees")) return "Fees Management";
    if (pathname.startsWith("/admin/expenses")) return "Expenses Management";
    if (pathname.startsWith("/admin/notifications")) return "Notification Center";
    if (pathname.startsWith("/admin/users")) return "System Users";
    if (pathname.startsWith("/admin/chats")) return "Inquiries Chat";
    if (pathname.startsWith("/admin/analytics")) return "Analytics";
    return "Admin";
  }, [pathname]);

  const formattedProfileName = useMemo(() => {
    return formatDisplayName(profileData.name);
  }, [profileData.name]);

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8 transition-colors duration-200 relative">
      {/* Left side: Hamburger button + Clean prominent page title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Toggle Navigation Menu"
          aria-label="Toggle Navigation Menu"
        >
          <Menu size={18} />
        </button>

        <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white truncate">
          {pageTitle}
        </h1>
      </div>

      {/* Right side: Search, Theme Toggle, Notification Popover, Profile Popover */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Search Trigger Icon (<sm) */}
        <button
          type="button"
          onClick={() => {
            setIsMobileSearchExpanded(true);
            setIsSearchOpen(true);
          }}
          className="sm:hidden p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
          title="Search..."
          aria-label="Open search"
        >
          <Search size={18} />
        </button>

        {/* Global Working Search Bar */}
        <div ref={searchContainerRef} className="relative hidden sm:block">
          <div className="relative flex items-center">
            <Search
              size={14}
              className="absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search... (Ctrl+K)"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
                setSelectedIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              className="pl-8.5 pr-8 py-1.5 text-xs bg-slate-100/80 hover:bg-slate-100 focus:bg-white dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:focus:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-500 rounded-lg w-44 sm:w-56 md:w-64 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setIsSearchOpen(false);
                }}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {isSearchOpen && searchQuery.trim() && (
            <div className="absolute right-0 sm:left-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-80 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-2 border-b border-slate-100 dark:border-slate-800/80 text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3">
                Quick Navigation ({searchResults.length})
              </div>

              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matching modules or pages found.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto py-1 divide-y divide-slate-50 dark:divide-slate-800/40">
                  {searchResults.map((item, index) => {
                    const isSelected = index === selectedIndex;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleSelectResult(item)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors ${
                          isSelected
                            ? "bg-slate-100/90 dark:bg-slate-800 text-slate-900 dark:text-white"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.category === "LMS"
                                ? "bg-blue-500"
                                : item.category === "Web"
                                ? "bg-amber-500"
                                : item.category === "System"
                                ? "bg-purple-500"
                                : "bg-emerald-500"
                            }`}
                          />
                          <span className="font-medium truncate">{item.title}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          {item.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
          aria-label="Toggle Theme"
          title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {theme === "light" ? (
            <Moon size={16} className="text-slate-600" />
          ) : (
            <Sun size={16} className="text-amber-400" />
          )}
        </button>

        {/* Notification Bell with Working Popover */}
        <div ref={notificationsRef} className="relative">
          <button
            onClick={() => {
              setIsNotificationsOpen((prev) => !prev);
              setIsProfileOpen(false);
            }}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg transition-colors relative cursor-pointer"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-80 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Announcements
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {recentNotifications.length}
                  </span>
                </div>
                <Link
                  href="/admin/notifications"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  View All <ArrowRight size={10} />
                </Link>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {recentNotifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No recent announcements.
                  </div>
                ) : (
                  recentNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="p-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {notif.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {notif.message}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href="/admin/notifications"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="w-full py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Bell size={12} />
                  <span>Notification Center</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill with Working Dropdown (No vertical divider between notifications and profile) */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => {
              setIsProfileOpen((prev) => !prev);
              setIsNotificationsOpen(false);
            }}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer group"
            title="User Profile & Settings"
          >
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                {formattedProfileName}
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-tight">
                {profileData.role}
              </span>
            </div>
            <div className="w-7 h-7 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-semibold text-xs shadow-2xs">
              <User size={14} />
            </div>
            <ChevronDown size={12} className="text-slate-400 group-hover:text-slate-600 transition-transform" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {formattedProfileName}
                </p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {profileData.email}
                </p>
                <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 uppercase tracking-wider">
                  {profileData.role}
                </span>
              </div>

              <div className="p-1.5 space-y-0.5 text-xs">
                <Link
                  href="/admin/users"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Shield size={14} className="text-slate-400" />
                  <span>System Users</span>
                </Link>

                <Link
                  href="/admin/notifications"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Bell size={14} />
                  <span>Notification Center</span>
                </Link>

                <a
                  href={process.env.NEXT_PUBLIC_WEBSITE_URL || "https://visionitinstitute.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center justify-between px-2.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ExternalLink size={14} className="text-slate-400" />
                    <span>View Public Website</span>
                  </div>
                </a>
              </div>

              <div className="p-1.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full-width Mobile Search Bar Overlay (<sm) */}
      {isMobileSearchExpanded && (
        <div className="sm:hidden absolute inset-0 z-50 bg-white dark:bg-slate-900 px-3 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
          <Search size={16} className="text-slate-400 dark:text-slate-500 shrink-0 ml-1" />
          <input
            ref={mobileSearchInputRef}
            type="text"
            placeholder="Search... (Ctrl+K)"
            value={searchQuery}
            autoFocus
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
              setSelectedIndex(0);
            }}
            onKeyDown={handleSearchKeyDown}
            className="flex-1 py-1.5 text-xs sm:text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsMobileSearchExpanded(false);
              setIsSearchOpen(false);
              setSearchQuery("");
            }}
            className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-md cursor-pointer shrink-0"
          >
            Cancel
          </button>

          {/* Mobile Search Results Dropdown */}
          {isSearchOpen && searchQuery.trim() && (
            <div className="absolute left-2 right-2 top-full mt-2 w-[calc(100vw-1rem)] max-w-sm mx-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-2 border-b border-slate-100 dark:border-slate-800/80 text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3">
                Quick Navigation ({searchResults.length})
              </div>
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matching modules or pages found.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto py-1 divide-y divide-slate-50 dark:divide-slate-800/40">
                  {searchResults.map((item, index) => {
                    const isSelected = index === selectedIndex;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleSelectResult(item)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors ${
                          isSelected
                            ? "bg-slate-100/90 dark:bg-slate-800 text-slate-900 dark:text-white"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.category === "LMS"
                                ? "bg-blue-500"
                                : item.category === "Web"
                                ? "bg-amber-500"
                                : item.category === "System"
                                ? "bg-purple-500"
                                : "bg-emerald-500"
                            }`}
                          />
                          <span className="font-medium truncate">{item.title}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          {item.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
