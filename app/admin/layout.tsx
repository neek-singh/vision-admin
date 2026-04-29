"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { supabase } from "@/lib/supabase";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/courses", label: "Courses", icon: "📚" },
  { href: "/admin/blogs", label: "Blogs", icon: "✍️" },
  { href: "/admin/batches", label: "Batches", icon: "📅" },
  { href: "/admin/gallery", label: "Gallery", icon: "🖼️" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/admissions", label: "Admissions", icon: "🎓" },
  { href: "/admin/contacts", label: "Contacts", icon: "📩" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      setIsMobileOpen(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 bg-blue-950 text-white transition-all duration-300
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${isCollapsed ? "lg:w-20" : "lg:w-64"} w-64`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <Link href="/admin" className="font-bold text-lg">
            {!isCollapsed && "Vision IT"}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleLinkClick}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition"
            >
              <span>{item.icon}</span>
              {!isCollapsed && item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <Link href="/" className="block text-sm text-blue-300">
            View Website
          </Link>

          <button
            onClick={handleLogout}
            className="w-full text-left text-red-400 hover:text-white py-2"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300
        ${isCollapsed ? "lg:ml-20" : "lg:ml-64"}`}
      >

        {/* Header */}
        <header className="bg-white border-b px-4 py-3 flex justify-between items-center">
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setIsMobileOpen(!isMobileOpen);
              } else {
                setIsCollapsed(!isCollapsed);
              }
            }}
            className="p-2 border rounded"
          >
            ☰
          </button>

          <div className="text-sm font-semibold">
            Admin Panel
          </div>

          <div className="w-8 h-8 bg-blue-600 text-white flex items-center justify-center rounded">
            A
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          {children}
        </main>

      </div>
    </div>
  );
}