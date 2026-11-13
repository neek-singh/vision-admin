"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
}

export default function MultiSelect({ options, selected, onChange, placeholder = "Select...", label }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const removeTag = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(v => v !== value));
  };

  const selectedLabels = selected.map(v => options.find(o => o.value === v)?.label || v);

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}

      <div
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[42px] px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer flex items-center gap-2 flex-wrap hover:border-blue-300 dark:hover:border-slate-700 transition-colors"
      >
        {selected.length === 0 ? (
          <span className="text-sm text-slate-400 dark:text-slate-500 font-medium">{placeholder}</span>
        ) : (
          selectedLabels.map((tagLabel, i) => (
            <span
              key={selected[i]}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40 rounded-md text-xs font-normal"
            >
              <span>{tagLabel}</span>
              <button
                type="button"
                onClick={(e) => removeTag(selected[i], e)}
                aria-label={`Remove ${tagLabel}`}
                className="p-1 min-h-[44px] min-w-[44px] -my-2.5 -mr-2 inline-flex items-center justify-center hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </span>
          ))
        )}
        <ChevronDown
          size={14}
          className={`ml-auto text-slate-400 dark:text-slate-500 transition-transform duration-200 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500">No options available</div>
          ) : (
            options.map(option => {
              const isSelected = selected.includes(option.value);
              return (
                <div
                  key={option.value}
                  onClick={() => toggle(option.value)}
                  className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors text-sm font-normal ${isSelected
                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected
                    ? "bg-blue-600 border-blue-600"
                    : "border-slate-300 dark:border-slate-600"
                    }`}>
                    {isSelected && <Check size={10} className="text-white" />}
                  </div>
                  {option.label}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
