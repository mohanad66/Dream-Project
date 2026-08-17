import "./css/style.scss";

const Button = ({
  variant = "gold",
  size = "md",
  loading = false,
  children,
  className = "",
  ...props
}) => {
  const cls = [
    "btn-custom",
    `btn-custom--${variant}`,
    `btn-custom--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={cls}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <span className="btn-custom__loader" aria-hidden="true" />}
      {children}
    </button>
  );
};

export default Button;
