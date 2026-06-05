"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export default function SearchAndFilter({ currentStatus }: { currentStatus: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set("query", term);
    } else {
      params.delete("query");
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams);
    if (status) {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
      <div className="relative flex-1 sm:w-64">
        <input
          type="text"
          placeholder="Search name or phone..."
          defaultValue={searchParams.get("query")?.toString()}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-white border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all font-black text-black placeholder:text-slate-400"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="flex bg-gray-100 p-1 rounded-2xl">
        {[
          { label: "All", value: "" },
          { label: "Pending", value: "pending" },
          { label: "Approved", value: "approved" },
          { label: "Rejected", value: "rejected" },
        ].map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleStatusFilter(tab.value)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentStatus === tab.value
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
