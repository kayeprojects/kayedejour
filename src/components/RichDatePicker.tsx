import { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import '../styles/flatpickr-overrides.css';
import type { Instance } from 'flatpickr/dist/types/instance';

interface RichDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  onClose?: () => void;
  enableTime?: boolean;
}

export default function RichDatePicker({ value, onChange, onClose, enableTime = false }: RichDatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<Instance | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    // Initialize flatpickr
    fpRef.current = flatpickr(inputRef.current, {
      defaultDate: value,
      enableTime: enableTime,
      dateFormat: enableTime ? "Y-m-d H:i" : "Y-m-d",
      appendTo: document.body,
      animate: false, // Disable animation for performance
      onChange: (_, dateStr) => {
        onChange(dateStr);
      },
      onClose: () => {
        if (onClose) onClose();
      },
    });

    // Open immediately on mount since this component is lazy loaded when needed
    fpRef.current.open();

    return () => {
      if (fpRef.current) {
        fpRef.current.destroy();
        fpRef.current = null;
      }
    };
  }, []); // Run once on mount

  // Update value if prop changes
  useEffect(() => {
    if (fpRef.current && value) {
      fpRef.current.setDate(value, false);
    }
  }, [value]);

  return <input ref={inputRef} type="hidden" />;
}
