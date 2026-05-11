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
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
          {label}
        </label>
      )}

      <div
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[42px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer flex items-center gap-2 flex-wrap hover:border-blue-300 transition-colors"
      >
        {selected.length === 0 ? (
          <span className="text-sm text-slate-400 font-medium">{placeholder}</span>
        ) : (
          selectedLabels.map((label, i) => (
            <span
              key={selected[i]}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-black uppercase tracking-widest"
            >
              {label}
              <button
                onClick={(e) => removeTag(selected[i], e)}
                className="hover:text-red-600 transition-colors"
              >
                <X size={10} />
              </button>
            </span>
          ))
        )}
        <ChevronDown
          size={14}
          className={`ml-auto text-slate-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">No options available</div>
          ) : (
            options.map(option => {
              const isSelected = selected.includes(option.value);
              return (
                <div
                  key={option.value}
                  onClick={() => toggle(option.value)}
                  className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors text-sm font-bold ${
                    isSelected
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected
                      ? "bg-blue-600 border-blue-600"
                      : "border-slate-300"
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
