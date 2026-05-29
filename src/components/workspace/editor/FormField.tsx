type FormFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
};

export function FormField({
  label,
  value,
  onChange,
  multiline = false,
  rows = 4,
  placeholder,
}: FormFieldProps) {
  const id = label.replace(/\s/g, "-");
  return (
    <label className="form-field">
      <span className="form-field__label">{label}</span>
      {multiline ? (
        <textarea
          id={id}
          className="form-field__input form-field__input--area"
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          type="text"
          className="form-field__input"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
