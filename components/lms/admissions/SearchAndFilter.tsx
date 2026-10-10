"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";
import { Search, X } from "lucide-react";

export default function SearchAndFilter({ currentStatus: _currentStatus }: { currentStatus?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [term, setTerm] = useState(searchParams.get("query")?.toString() || "");

  const handleSearch = (value: string) => {
    setTerm(value);
    const params = new URLSearchParams(searchParams);
    if (value.trim()) {
      params.set("query", value.trim());
    } else {
      params.delete("query");
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const clearSearch = () => {
    setTerm("");
    const params = new URLSearchParams(searchParams);
    params.delete("query");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="relative w-full sm:w-72">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={14} />
      <input
        type="text"
        placeholder="Search by name, phone or email..."
        value={term}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full pl-8.5 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-blue-500 dark:focus:border-blue-500 shadow-2xs transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
      />
      {term && (
        <button
          onClick={clearSearch}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer p-0.5"
          title="Clear search"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
