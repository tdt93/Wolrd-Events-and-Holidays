import { useEffect, useState } from "react";
import { displayToIso, isoToDisplay } from "../lib/dateFormat";

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (iso: string) => void;
}

export function DateField({ label, value, onChange }: DateFieldProps) {
  const [text, setText] = useState(() => isoToDisplay(value));

  useEffect(() => {
    setText(isoToDisplay(value));
  }, [value]);

  const commit = () => {
    const iso = displayToIso(text);
    if (iso) {
      onChange(iso);
      setText(isoToDisplay(iso));
      return;
    }
    setText(isoToDisplay(value));
  };

  return (
    <label className="date-field">
      <span className="date-field__label">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        className="date-field__input"
        placeholder="DD/MM/YYYY"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        aria-label={label}
        autoComplete="off"
        spellCheck={false}
      />
    </label>
  );
}
