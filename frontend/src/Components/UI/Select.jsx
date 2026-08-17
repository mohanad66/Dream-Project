const Select = ({
  label,
  hint,
  error,
  icon,
  options = [],
  placeholder,
  className = "",
  id,
  children,
  ...props
}) => {
  const selectId = id || props.name || `select-${label || ""}`;

  const cls = [
    "input-custom",
    error ? "input-custom--error" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="field-custom">
      {label && (
        <label className="field-custom__label" htmlFor={selectId}>
          {label}
        </label>
      )}
      <div className="field-custom__wrap">
        {icon && <span className="field-custom__icon">{icon}</span>}
        <select id={selectId} className={cls} {...props}>
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children ||
            options.map((opt) => {
              const value = opt.id ?? opt.slug ?? opt.value;
              const label = opt.name ?? opt.label ?? String(value);
              return (
                <option key={value} value={value}>
                  {label}
                </option>
              );
            })}
        </select>
      </div>
      {error ? (
        <p className="field-custom__error">{error}</p>
      ) : hint ? (
        <p className="field-custom__hint">{hint}</p>
      ) : null}
    </div>
  );
};

export default Select;
