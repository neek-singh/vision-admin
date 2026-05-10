import { BoneyardProfile, BoneyardCard } from "@/components/ui/Boneyard";

export default function StudentDashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Shell */}
      <header className="bg-white border-b border-gray-100 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 animate-pulse rounded-xl" />
          <div className="h-6 w-32 bg-gray-100 animate-pulse rounded-lg hidden md:block" />
        </div>
        <div className="h-10 w-24 bg-gray-100 animate-pulse rounded-xl" />
      </header>

      <main className="container mx-auto px-6 py-12 max-w-5xl">
        <div className="space-y-8">
          {/* Profile Skeleton */}
          <BoneyardProfile />

          {/* Modules Skeleton */}
          <div className="space-y-4">
            <div className="h-4 w-32 bg-gray-200/50 animate-pulse rounded px-2" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <BoneyardCard />
              <BoneyardCard />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
