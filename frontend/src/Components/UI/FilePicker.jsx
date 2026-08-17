import { useRef, useState } from "react";
import { FaImage } from "react-icons/fa6";

const FilePicker = ({
  label,
  hint,
  onChange,
  accept = "image/*",
  initialPreview,
  value,
}) => {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const handleChange = (e) => {
    const file = e.target.files?.[0] || null;
    onChange(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  };

  const showImage = preview || (initialPreview && !preview ? initialPreview : null);

  return (
    <div className="field-custom">
      {label && <label className="field-custom__label">{label}</label>}
      <button
        type="button"
        className="filepicker"
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          hidden
        />
        {showImage ? (
          <img className="filepicker__preview" src={showImage} alt="Preview" />
        ) : (
          <span className="filepicker__placeholder">
            <FaImage /> Click to choose an image
          </span>
        )}
      </button>
      {value?.name ? (
        <p className="filepicker__name">{value.name}</p>
      ) : hint ? (
        <p className="field-custom__hint">{hint}</p>
      ) : null}
    </div>
  );
};

export default FilePicker;
