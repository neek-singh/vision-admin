import React from 'react';

interface BoneyardProps {
  className?: string;
  count?: number;
}

/**
 * Boneyard (Skeleton) Component
 * A premium shimmer loading state for lazy-loaded content.
 */
export const Boneyard: React.FC<BoneyardProps> = ({ className = "", count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className={`relative overflow-hidden bg-gray-200/50 rounded-2xl animate-pulse ${className}`}
        >
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.5s_infinite]" />
        </div>
      ))}
    </>
  );
};

export const BoneyardCard = () => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-4 w-full">
        <Boneyard className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Boneyard className="h-4 w-3/4" />
          <Boneyard className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  </div>
);

export const BoneyardProfile = () => (
  <div className="space-y-6">
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
      <Boneyard className="w-24 h-24 rounded-full mx-auto" />
      <div className="space-y-2">
        <Boneyard className="h-6 w-1/2 mx-auto" />
        <Boneyard className="h-4 w-1/3 mx-auto" />
      </div>
      <Boneyard className="h-8 w-24 rounded-full mx-auto" />
    </div>

    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
      <Boneyard className="h-4 w-1/4 px-2" />
      <div className="space-y-3">
        <div className="flex justify-between px-2">
          <Boneyard className="h-4 w-1/4" />
          <Boneyard className="h-4 w-1/4" />
        </div>
        <div className="flex justify-between px-2">
          <Boneyard className="h-4 w-1/4" />
          <Boneyard className="h-4 w-1/4" />
        </div>
      </div>
    </div>
  </div>
);
