import { useState, Suspense, lazy, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

// Lazy load the heavy picker
const RichDatePicker = lazy(() => import('./RichDatePicker'));

interface SmartDateInputProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  enableTime?: boolean;
  className?: string;
}

export default function SmartDateInput({
  value,
  onChange,
  placeholder = "Select date",
  enableTime = false,
  className
}: SmartDateInputProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simple mobile detection
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
  }, []);

  const preloadPicker = () => {
    // Preload the chunk
    import('./RichDatePicker');
  };

  const handleDateChange = (date: string) => {
    onChange(date);
    // Don't close immediately if enableTime is true, let user pick time? 
    // Flatpickr usually handles this. But RichDatePicker calls onChange on every selection.
    // If we want to close on selection (for date only), we can do it here.
    // But RichDatePicker handles onClose from flatpickr.
  };

  if (isMobile) {
    return (
      <div className={cn("relative", className)}>
        <input
          type={enableTime ? "datetime-local" : "date"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
        />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn("relative inline-block", className)}
      onMouseEnter={preloadPicker}
      onFocus={preloadPicker}
    >
      <button
        type="button"
        onClick={() => setShowPicker(true)}
        className="flex items-center gap-2 w-full bg-transparent border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left"
      >
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className={cn("flex-1 truncate", !value && "text-gray-400")}>
          {value ? new Date(value).toLocaleDateString("en-US", {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: enableTime ? '2-digit' : undefined,
            minute: enableTime ? '2-digit' : undefined
          }) : placeholder}
        </span>
      </button>

      {showPicker && (
        <Suspense fallback={null}>
          <RichDatePicker
            value={value}
            onChange={handleDateChange}
            onClose={() => setShowPicker(false)}
            enableTime={enableTime}
          />
        </Suspense>
      )}
    </div>
  );
}
