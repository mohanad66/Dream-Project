import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  FaCloudUploadAlt,
  FaFilm,
  FaPlay,
  FaCheckCircle,
  FaExclamationCircle,
  FaSpinner,
  FaTrashAlt,
  FaTag,
  FaArrowLeft,
} from "react-icons/fa";
import { FaVideo, FaImage, FaArrowRightLong } from "react-icons/fa6";
import api from "../../services/api";
import { useAuth } from "../../services/auth";
import "./css/style.scss";

const MAX_SIZE_MB = 300;
const MAX_DURATION_S = 90;
const ALLOWED_VIDEO = /\.(mp4|m4v|webm|mov|quicktime)$/i;

const extractList = (res) =>
  Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res?.data?.results)
      ? res.data.results
      : [];

const fieldErrorText = (data) => {
  if (!data || typeof data !== "object") return "Unexpected server error.";
  const parts = [];
  Object.entries(data).forEach(([field, val]) => {
    if (field === "detail") parts.push(Array.isArray(val) ? val.join(", ") : val);
    else if (Array.isArray(val)) parts.push(`${field}: ${val.join(", ")}`);
    else if (typeof val === "string") parts.push(`${field}: ${val}`);
  });
  return parts.length ? parts.join(" · ") : "Unexpected server error.";
};

export default function Upload() {
  const navigate = useNavigate();
  const { isAuthenticated, isSeller, refetchUser, data } = useAuth();

  const [video, setVideo] = useState(null);
  const [videoMeta, setVideoMeta] = useState({ duration: 0, error: "" });
  const [previewUrl, setPreviewUrl] = useState("");
  const [posterFile, setPosterFile] = useState(null);
  const [posterUrl, setPosterUrl] = useState("");
  const [autoPoster, setAutoPoster] = useState(null);
  const [autoPosterUrl, setAutoPosterUrl] = useState("");

  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    selectedTags: [],
  });

  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeForm, setUpgradeForm] = useState({
    business_name: "",
    contact_phone: "",
    contact_email: "",
  });

  const inputRef = useRef(null);
  const videoProbeRef = useRef(null);

  useEffect(() => {
    api.get("/api/categories/").then((res) => setCategories(extractList(res))).catch(() => {});
    api.get("/api/tags/").then((res) => setTags(extractList(res))).catch(() => {});
  }, []);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (posterUrl) URL.revokeObjectURL(posterUrl);
    if (autoPosterUrl) URL.revokeObjectURL(autoPosterUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateVideoFile = (file) => {
    const errs = [];
    if (!file) {
      errs.push("Please choose a video to upload.");
      return errs;
    }
    if (!ALLOWED_VIDEO.test(file.name) && !/^video\//.test(file.type || "")) {
      errs.push("Unsupported file type. Please upload MP4, WebM or MOV.");
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      errs.push(`Video is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_SIZE_MB} MB.`);
    }
    return errs;
  };

  const probeDuration = (file) => {
    if (!videoProbeRef.current) return;
    const url = URL.createObjectURL(file);
    videoProbeRef.current.src = url;
    videoProbeRef.current.onloadedmetadata = () => {
      const d = videoProbeRef.current.duration || 0;
      URL.revokeObjectURL(url);
      setVideoMeta({ duration: d, error: d > MAX_DURATION_S ? `Video is ${Math.round(d)}s — maximum is ${MAX_DURATION_S}s.` : "" });
      if (d > 0 && d <= MAX_DURATION_S) capturePoster(videoProbeRef.current);
    };
    videoProbeRef.current.onerror = () => {
      URL.revokeObjectURL(url);
      setVideoMeta({ duration: 0, error: "We couldn’t read this video file. Please try another one." });
    };
  };

  const capturePoster = (el) => {
    if (autoPosterUrl) URL.revokeObjectURL(autoPosterUrl);
    setAutoPosterUrl("");
    setAutoPoster(null);
    if (!el || !el.videoWidth || !el.videoHeight) return;

    const draw = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(el.videoWidth, 1920);
        canvas.height = Math.round((canvas.width / el.videoWidth) * el.videoHeight);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob && blob.size > 0) {
            setAutoPosterUrl(URL.createObjectURL(blob));
            setAutoPoster(new File([blob], "poster.jpg", { type: "image/jpeg" }));
            return;
          }
          // Fallback: some browsers return an empty blob for a video frame
          // captured before it has decoded — re-encode via data URL instead.
          try {
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            const bytes = Uint8Array.from(atob(dataUrl.split(",")[1]), (c) => c.charCodeAt(0));
            const file = new File([bytes], "poster.jpg", { type: "image/jpeg" });
            if (file.size > 0) {
              setAutoPosterUrl(URL.createObjectURL(file));
              setAutoPoster(file);
            }
          } catch (_) {
            /* leave autoPoster null — user can pick an image */
          }
        }, "image/jpeg", 0.85);
      } catch (_) {
        /* leave autoPoster null — user can pick an image */
      }
    };

    // Wait for an actual decoded frame before drawing, otherwise the canvas
    // captures a blank/empty frame (which Cloudinary rejects as an invalid
    // image). requestVideoFrameCallback -> fallback to a tiny seek + seeked.
    if (typeof el.requestVideoFrameCallback === "function") {
      el.requestVideoFrameCallback(() => {
        try { el.pause(); } catch (_) {}
        draw();
      });
    } else {
      const onSeek = () => {
        el.removeEventListener("seeked", onSeek);
        draw();
      };
      el.addEventListener("seeked", onSeek);
      try {
        el.currentTime = 0.01;
        if (el.readyState >= 2) el.removeEventListener("seeked", onSeek);
      } catch (_) {
        el.removeEventListener("seeked", onSeek);
        draw();
      }
    }
  };

  const onSelectFile = (file) => {
    const errs = validateVideoFile(file);
    setErrors(errs);
    if (errs.length) {
      setVideo(null);
      setPreviewUrl("");
      setVideoMeta({ duration: 0, error: "" });
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setVideo(file);
    setPreviewUrl(url);
    setVideoMeta({ duration: 0, error: "" });
    setAutoPoster(null);
    probeDuration(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) onSelectFile(file);
  };

  const handlePosterChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !/^image\//.test(file.type)) return;
    if (posterUrl) URL.revokeObjectURL(posterUrl);
    setPosterFile(file);
    setPosterUrl(URL.createObjectURL(file));
  };

const clearVideo = () => {
    setVideo(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setVideoMeta({ duration: 0, error: "" });
    setAutoPoster(null);
    if (autoPosterUrl) URL.revokeObjectURL(autoPosterUrl);
    setAutoPosterUrl("");
    setErrors([]);
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleTag = (id) =>
    setField(
      "selectedTags",
      form.selectedTags.includes(id)
        ? form.selectedTags.filter((t) => t !== id)
        : [...form.selectedTags, id],
    );

  const validateForm = () => {
    const errs = [];
    if (!video) errs.push("Please choose a video to upload.");
    if (videoMeta.error) errs.push(videoMeta.error);
    if (!form.name.trim()) errs.push("Please enter a product title.");
    if (!form.description.trim()) errs.push("Please add a short description.");
    const price = parseFloat(form.price);
    if (form.price === "" || isNaN(price) || price <= 0) errs.push("Please enter a valid price in L.E greater than 0.");
    if (!form.category) errs.push("Please select a category.");
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validateForm();
    setErrors(errs);
    setSuccess(null);
    if (errs.length) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const poster = posterFile && posterFile.size > 0 ? posterFile : autoPoster && autoPoster.size > 0 ? autoPoster : null;
    if (!poster) {
      setErrors([
        "No usable thumbnail yet — choose an image or let the auto-capture from your video finish first (or re-pick the video).",
      ]);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("description", form.description.trim());
      formData.append("price", parseFloat(form.price));
      formData.append("category", form.category);
      formData.append("video", video);
      formData.append("image", poster);
      form.selectedTags.forEach((id) => formData.append("tags", id));

      const res = await api.post("/api/sellers/products/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)));
        },
      });

      const created = res.data?.id;
      setSuccess({ id: created, name: res.data?.name || form.name.trim() });
      if (refetchUser) refetchUser();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const status = err.response?.status;
      let msg;
      if (status === 401) msg = "Your session expired. Please log in again and retry.";
      else if (status === 413) msg = "The file is too large for the server. Compress it and try again (max 300 MB).";
      else if (status === 400) msg = fieldErrorText(err.response?.data);
      else msg = err.response?.data?.detail || "Upload failed. Please check your connection and try again.";
      setErrors([msg]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setUploading(false);
    }
  };

  const handleUpgrade = async (e) => {
    e.preventDefault();
    if (!upgradeForm.business_name.trim()) {
      setErrors(["Please enter your brand/business name."]);
      return;
    }
    setUpgrading(true);
    setErrors([]);
    try {
      await api.post("/api/sellers/upgrade/", {
        business_name: upgradeForm.business_name.trim(),
        business_description: upgradeForm.business_description?.trim() || "",
        contact_phone: upgradeForm.contact_phone.trim(),
        contact_email: upgradeForm.contact_email.trim(),
      });
      if (refetchUser) await refetchUser();
    } catch (err) {
      setErrors([err.response?.data?.detail || "Could not create your seller profile. Please try again."]);
    } finally {
      setUpgrading(false);
    }
  };

  const needsSeller = !isSeller && isAuthenticated;

  return (
    <>
      <Helmet>
        <title>Upload Video — instaBrandz Creator Studio</title>
        <meta name="description" content="Upload a short product video to instaBrandz and let shoppers discover your products." />
      </Helmet>

      <div className="upload-page">
        <div className="upload-page__inner">
          {!isAuthenticated ? (
            <div className="upload-panel upload-panel--gate">
              <FaFilm className="upload-gate-icon" />
              <h1>Upload a short video</h1>
              <p>Log in to publish videos on instaBrandz and start selling through the feed.</p>
              <div className="upload-gate-actions">
                <Link className="upl-btn upl-btn--primary" to="/login?next=/upload">
                  Log in to continue
                </Link>
                <Link className="upl-btn upl-btn--ghost" to="/register?next=/upload">
                  Create an account
                </Link>
              </div>
            </div>
          ) : needsSeller ? (
            <div className="upload-panel upload-panel--gate">
              <FaFilm className="upload-gate-icon" />
              <h1>You’re one step away</h1>
              <p>Uploading videos requires an active seller profile. Tell us a little about your brand to continue.</p>
              <form className="upl-form upl-form--compact" onSubmit={handleUpgrade}>
                <label>
                  Brand name *
                  <input type="text" value={upgradeForm.business_name} onChange={(e) => setUpgradeForm((p) => ({ ...p, business_name: e.target.value }))} placeholder="e.g. Cairo Home Studio" />
                </label>
                <div className="upl-grid-2">
                  <label>
                    Phone
                    <input type="tel" value={upgradeForm.contact_phone} onChange={(e) => setUpgradeForm((p) => ({ ...p, contact_phone: e.target.value }))} placeholder="01xxxxxxxxx" />
                  </label>
                  <label>
                    Contact email
                    <input type="email" value={upgradeForm.contact_email} onChange={(e) => setUpgradeForm((p) => ({ ...p, contact_email: e.target.value }))} placeholder="you@brand.com" />
                  </label>
                </div>
                <button className="upl-btn upl-btn--primary" type="submit" disabled={upgrading}>
                  {upgrading ? <FaSpinner className="spin" /> : "Create seller profile"} {!upgrading && "→"}
                </button>
              </form>
              <p className="upl-alt-note">
                Already registered?{" "}
                <Link to="/seller-register">Go to seller onboarding</Link>
              </p>
            </div>
          ) : success ? (
            <div className="upload-panel upload-panel--success">
              <span className="upl-success-icon"><FaCheckCircle /></span>
              <h1>Video published for review</h1>
              <p className="upl-success-name">{success.name}</p>
              <p>
                Your video is now <strong>pending approval</strong>. Once a moderator approves it, shoppers will be able to see it in Shorts and the explore feed.
              </p>
              <div className="upload-gate-actions">
                <Link className="upl-btn upl-btn--primary" to={`/shorts?p=${success.id}`}>
                  <FaPlay /> View video
                </Link>
                <button className="upl-btn upl-btn--ghost" onClick={() => {
                  clearVideo();
                  setPosterFile(null);
                  if (posterUrl) URL.revokeObjectURL(posterUrl);
                  setPosterUrl("");
                  setForm({ name: "", description: "", price: "", category: "", selectedTags: [] });
                  setSuccess(null);
                }}>
                  <FaCloudUploadAlt /> Upload another
                </button>
              </div>
            </div>
          ) : (
            <>
<nav className="upl-crumbs" aria-label="Breadcrumb">
                  <Link to="/"><FaArrowLeft /> Home</Link>
                </nav>
              <header className="upl-header">
                <p className="upl-eyebrow">Creator Studio</p>
                <h1>Upload a short video</h1>
                <p className="upl-sub">Show your product in action — shoppers discover your brand through video on instaBrandz.</p>
              </header>

              {errors.length > 0 && (
                <div className="upl-alert" role="alert">
                  <FaExclamationCircle />
                  <ul>
                    {errors.map((e) => <li key={e}>{e}</li>)}
                  </ul>
                </div>
              )}

              <div className="upl-layout">
                <aside className="upl-aside">
                  <div
                    className={`upl-dropzone ${dragging ? "is-dragging" : ""} ${previewUrl ? "has-video" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => inputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
                    aria-label="Choose or drop your product video"
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
                      className="upl-file-input"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelectFile(f); e.target.value = ""; }}
                    />
                    {previewUrl ? (
                      <>
                        <video className="upl-preview" src={previewUrl} muted controls playsInline preload="metadata" />
                        <button
                          type="button"
                          className="upl-clear"
                          onClick={(ev) => { ev.stopPropagation(); clearVideo(); }}
                          aria-label="Remove video"
                        >
                          <FaTrashAlt />
                        </button>
                      </>
                    ) : (
                      <div className="upl-dropzone-body">
                        <span className="upl-dropzone-icon"><FaCloudUploadAlt /></span>
                        <p className="upl-dropzone-title"><strong>Drag &amp; drop</strong> your video here</p>
                        <p className="upl-dropzone-sub">or click to browse — MP4, WebM or MOV</p>
                        <span className="upl-btn upl-btn--soft">Choose video</span>
                        <p className="upl-dropzone-meta">Up to 300 MB · Up to 90 seconds</p>
                      </div>
                    )}
                  </div>
                  {previewUrl && (
                    <div className="upl-meta-row">
                      <span><FaVideo /> {video.name}</span>
                      {videoMeta.duration > 0 && <span>⏱ {Math.round(videoMeta.duration)}s</span>}
                    </div>
                  )}

                  <div className="upl-poster">
                    <p className="upl-poster-title">Thumbnail</p>
                    <div className="upl-poster-box">
                      <div className="upl-poster-preview">
                        {(posterUrl || autoPosterUrl) ? (
                          <img src={posterUrl || autoPosterUrl} alt="Poster preview" />
                        ) : (
                          <span className="upl-poster-ph"><FaImage /></span>
                        )}
                      </div>
                      <div className="upl-poster-actions">
                        <label className="upl-btn upl-btn--soft">
                          {posterFile || autoPoster ? "Change" : "Choose image"}
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={handlePosterChange}
                          />
                        </label>
                        {(posterFile || autoPoster) && (
                          <button type="button" className="upl-btn upl-btn--ghost" onClick={() => { setPosterFile(null); setAutoPoster(null); if (posterUrl) URL.revokeObjectURL(posterUrl); setPosterUrl(""); }}>
                            Clear
                          </button>
                        )}
                        <p>Auto-captured from your video, or pick your own.</p>
                      </div>
                    </div>
                  </div>
                </aside>

                <div className="upl-main">
                  <form className="upl-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                    <label htmlFor="upl-name">
                      Product title *
                      <input id="upl-name" type="text" maxLength={120} value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Wireless Bluetooth Earbuds Pro" />
                    </label>
                    <label htmlFor="upl-desc">
                      Description *
                      <textarea id="upl-desc" rows={4} maxLength={1000} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Show the shopper what makes this product great — materials, fit, use cases…" />
                    </label>
                    <div className="upl-grid-2">
                      <label htmlFor="upl-price">
                        Price (L.E) *
                        <input id="upl-price" type="number" min="1" step="0.5" inputMode="decimal" value={form.price} onChange={(e) => setField("price", e.target.value)} placeholder="e.g. 499" />
                      </label>
                      <label htmlFor="upl-cat">
                        Category *
                        <select id="upl-cat" value={form.category} onChange={(e) => setField("category", e.target.value)}>
                          <option value="">Select a category…</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="upl-tags">
                      <p><FaTag /> Tags <span>(optional)</span></p>
                      {tags.length > 0 ? (
                        <div className="upl-tag-list">
                          {tags.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              className={`upl-tag ${form.selectedTags.includes(t.id) ? "is-on" : ""}`}
                              onClick={() => toggleTag(t.id)}
                            >
                              {t.name}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="upl-tags-empty">No tags available.</p>
                      )}
                    </div>

                    <div className="upl-submit-row">
                      <button
                        type="submit"
                        className="upl-btn upl-btn--primary upl-btn--lg"
                        disabled={uploading}
                      >
                        {uploading ? (
                          <>
                            <FaSpinner className="spin" /> Uploading {progress}%
                          </>
                        ) : (
                          <>
                            <FaCloudUploadAlt /> Publish video <FaArrowRightLong />
                          </>
                        )}
                      </button>
                      <p className="upl-note">Published videos are reviewed before going live.</p>
                    </div>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <video ref={videoProbeRef} style={{ display: "none" }} muted playsInline preload="metadata" />
    </>
  );
}