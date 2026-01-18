import { useState, useRef } from "react";

interface DropdownOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = "Select",
  className = "",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(value || options[0]?.value || "");

  const handleSelect = (val: string) => {
    setSelected(val);
    setOpen(false);
    if (onChange) onChange(val);
  };

  return (
    <div className={`relative w-40 ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-md shadow-sm text-sm font-medium text-gray-900 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary-600"
        onClick={() => setOpen((o) => !o)}
      >
        {options.find((opt) => opt.value === selected)?.label || placeholder}
        <svg
          className="w-4 h-4 ml-2 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M19 9l-7 7-7-7"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-full bg-white border border-gray-200 rounded-md shadow-lg z-10">
          {options.map((opt) => (
            <button
              key={opt.value}
              disabled={opt.disabled}
              onClick={() => !opt.disabled && handleSelect(opt.value)}
              className={`w-full text-left px-4 py-2 text-sm ${
                opt.disabled
                  ? "text-gray-400 cursor-not-allowed bg-gray-50"
                  : "hover:bg-primary-50 text-gray-900"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
