import { FaTriangleExclamation, FaCircleQuestion } from "react-icons/fa6";
import Button from "../UI/Button";
import "./css/style.scss";

const ConfirmDialog = ({
  open = false,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  tone = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="confirm-overlay" onClick={loading ? undefined : onCancel}>
      <div
        className={`confirm-dialog confirm-dialog--${tone}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="confirm-dialog__icon">
          {tone === "danger" ? (
            <FaTriangleExclamation />
          ) : (
            <FaCircleQuestion />
          )}
        </span>
        <h3 className="confirm-dialog__title">{title}</h3>
        <p className="confirm-dialog__message">{message}</p>
        <div className="confirm-dialog__actions">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "gold"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
