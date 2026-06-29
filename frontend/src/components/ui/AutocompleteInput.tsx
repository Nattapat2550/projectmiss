"use client";
import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface AutocompleteOption {
  label: string;
  value: string;
  extra?: any;
}

interface AutocompleteInputProps {
  name: string;
  value: string;
  options: (string | AutocompleteOption)[];
  onChange: (e: any) => void;
  onSelectOption?: (option: AutocompleteOption) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export default function AutocompleteInput({
  name, value, options, onChange, onSelectOption, placeholder = "", required = false, className = "", disabled = false
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== search) {
      setSearch(value || "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizedSearch = search.toLowerCase().replace(/^(ตำบล|ต\.|แขวง|อำเภอ|อ\.|เขต|จังหวัด|จ\.|จว\.)\s*/, '').trim();

  const filteredOptions = options.filter(opt => {
    const textToSearch = typeof opt === "string" ? opt : opt.label;
    return textToSearch.toLowerCase().includes(normalizedSearch);
  });

  const handleSelect = (opt: string | AutocompleteOption) => {
    const selectVal = typeof opt === "string" ? opt : opt.value;
    setSearch(selectVal);
    setIsOpen(false);
    onChange({ target: { name, type: "text", value: selectVal, checked: false } });
    if (typeof opt !== "string" && onSelectOption) {
      onSelectOption(opt);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setIsOpen(true);
    onChange({ target: { name, type: "text", value: e.target.value, checked: false } });
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        name={name}
        value={search}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`${className} pr-8`}
        autoComplete="off"
      />
      <div 
        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) setSearch(""); 
          }
        }}
      >
        <ChevronDown size={16} />
      </div>
      
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-background border border-stone-200 dark:border-stone-700 rounded-md shadow-lg scrollbar-thin">
          {filteredOptions.map((opt, idx) => {
            const label = typeof opt === "string" ? opt : opt.label;
            const selectVal = typeof opt === "string" ? opt : opt.value;
            return (
              <li
                key={idx}
                onClick={() => handleSelect(opt)}
                className="px-3 py-2 cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 text-sm flex justify-between items-center text-stone-800 dark:text-stone-200"
              >
                {label}
                {value === selectVal && <Check size={14} className="text-emerald-500" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
