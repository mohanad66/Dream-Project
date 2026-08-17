const Input = ({
  label,
  hint,
  error,
  icon,
  textarea = false,
  className = "",
  id,
  ...props
}) => {
  const inputId =
    id || props.name || `input-${props.type || "text"}-${label || ""}`;

  const cls = [
    "input-custom",
    textarea ? "" : "",
    error ? "input-custom--error" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const Tag = textarea ? "textarea" : "input";

  return (
    <div className="field-custom">
      {label && (
        <label className="field-custom__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="field-custom__wrap">
        {icon && <span className="field-custom__icon">{icon}</span>}
        <Tag id={inputId} className={cls} {...props} />
      </div>
      {error ? (
        <p className="field-custom__error">{error}</p>
      ) : hint ? (
        <p className="field-custom__hint">{hint}</p>
      ) : null}
    </div>
  );
};

export default Input;
