import { useRef, useState } from "react";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB

const ImageUploader = ({ currentImage, onImageSelect, label = "Image" }) => {
  const inputRef = useRef();
  const [preview, setPreview] = useState(currentImage || "");
  const [err, setErr] = useState("");

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr("Please select an image file"); return; }
    if (file.size > MAX_SIZE) { setErr("Image must be under 2MB"); return; }
    setErr("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target.result);
      onImageSelect(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPreview("");
    onImageSelect("");
    inputRef.current.value = "";
  };

  return (
    <div className="form-group">
      <label>{label}</label>
      {preview ? (
        <div style={{ position: "relative", display: "inline-block", marginBottom: 8 }}>
          <img
            src={preview}
            alt="preview"
            style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)", display: "block" }}
          />
          <button
            type="button"
            onClick={handleRemove}
            style={{
              position: "absolute", top: 6, right: 6,
              background: "rgba(0,0,0,0.55)", color: "#fff",
              border: "none", borderRadius: "50%", width: 26, height: 26,
              cursor: "pointer", fontSize: 14, lineHeight: 1, fontWeight: 700,
            }}
          >✕</button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current.click()}
          style={{
            border: "2px dashed var(--border)", borderRadius: 8, padding: "28px 16px",
            textAlign: "center", cursor: "pointer", color: "var(--text-muted)",
            fontSize: 13, marginBottom: 4, background: "var(--bg)",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--primary)"}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
        >
          <div style={{ fontSize: 28, marginBottom: 6 }}>🖼️</div>
          <div>Click to upload image</div>
          <div style={{ fontSize: 11, marginTop: 4, color: "#94a3b8" }}>PNG, JPG, WEBP · max 2MB</div>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      {err && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>{err}</p>}
    </div>
  );
};

export default ImageUploader;
