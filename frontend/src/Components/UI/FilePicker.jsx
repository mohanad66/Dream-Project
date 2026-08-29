import { useRef, useState } from "react";
import { FaImage, FaVideo } from "react-icons/fa6";

const FilePicker = ({
  label,
  hint,
  onChange,
  accept = "image/*",
  initialPreview,
  value,
  isVideo = false,
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

  const showPreview = preview || (!preview && initialPreview ? initialPreview : null);

  const renderPreview = () => {
    if (isVideo) {
      return showPreview ? (
        <video className="filepicker__preview filepicker__preview--video" src={showPreview} muted playsInline controls />
      ) : (
        <span className="filepicker__placeholder">
          <FaVideo /> Click to choose a video
        </span>
      );
    }
    return showPreview ? (
      <img className="filepicker__preview" src={showPreview} alt="Preview" />
    ) : (
      <span className="filepicker__placeholder">
        <FaImage /> Click to choose an image
      </span>
    );
  };

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
        {renderPreview()}
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