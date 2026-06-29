interface DateFieldProps {
  label: string;
  value: string;
  onChange: (iso: string) => void;
}

export function DateField({ label, value, onChange }: DateFieldProps) {
  return (
    <label className="date-field date-field--doodle">
      <span className="date-field__label">{label}</span>
      <input
        type="date"
        className="date-field__input date-field__input--doodle"
        value={value}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
        aria-label={label}
      />
    </label>
  );
}
