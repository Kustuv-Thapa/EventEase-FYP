import { useRef } from "react";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_IMAGES = 5;

/**
 * GalleryUploader — manages an ordered list of up to 5 images.
 * Props:
 *   images: string[]  — current base64 images array
 *   onChange: (images: string[]) => void
 */
const GalleryUploader = ({ images = [], onChange }) => {
  const inputRef = useRef();

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - images.length;
    const toProcess = files.slice(0, remaining);

    let loaded = 0;
    const newImages = [...images];

    toProcess.forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > MAX_SIZE) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        newImages.push(ev.target.result);
        loaded++;
        if (loaded === toProcess.length) {
          onChange(newImages);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same files can be re-selected
    e.target.value = "";
  };

  const handleRemove = (index) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleMoveLeft = (index) => {
    if (index === 0) return;
    const updated = [...images];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(updated);
  };

  const handleMoveRight = (index) => {
    if (index === images.length - 1) return;
    const updated = [...images];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(updated);
  };

  return (
    <div className="form-group">
      <label>
        Event Gallery
        <span style={{ fontWeight: 400, fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>
          Up to {MAX_IMAGES} images · First image is the cover
        </span>
      </label>

      {/* Existing images */}
      {images.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          {images.map((img, i) => (
            <div
              key={i}
              style={{
                position: "relative", width: 110, height: 80,
                borderRadius: 8, overflow: "hidden",
                border: i === 0 ? "2px solid #6366f1" : "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              <img
                src={img}
                alt={`Gallery image ${i + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              {/* Cover badge */}
              {i === 0 && (
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  background: "rgba(99,102,241,0.85)", color: "#fff",
                  fontSize: 9, fontWeight: 700, textAlign: "center", padding: "2px 0",
                  textTransform: "uppercase", letterSpacing: "0.05em",
                }}>
                  Cover
                </div>
              )}
              {/* Controls */}
              <div style={{
                position: "absolute", top: 3, right: 3,
                display: "flex", gap: 3,
              }}>
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => handleMoveLeft(i)}
                    title="Move left"
                    style={controlBtnStyle}
                  >←</button>
                )}
                {i < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => handleMoveRight(i)}
                    title="Move right"
                    style={controlBtnStyle}
                  >→</button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  title="Remove"
                  style={{ ...controlBtnStyle, background: "rgba(239,68,68,0.85)" }}
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add more button */}
      {images.length < MAX_IMAGES && (
        <div
          onClick={() => inputRef.current.click()}
          style={{
            border: "2px dashed var(--border)", borderRadius: 8, padding: "20px 16px",
            textAlign: "center", cursor: "pointer", color: "var(--text-muted)",
            fontSize: 13, background: "var(--bg)", transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--primary)"}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
        >
          <div style={{ fontSize: 24, marginBottom: 4 }}>🖼️</div>
          <div>Click to add {images.length === 0 ? "images" : "more images"}</div>
          <div style={{ fontSize: 11, marginTop: 3, color: "var(--text-muted)" }}>
            PNG, JPG, WEBP · max 2MB each · {MAX_IMAGES - images.length} slot{MAX_IMAGES - images.length !== 1 ? "s" : ""} remaining
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        style={{ display: "none" }}
      />
    </div>
  );
};

const controlBtnStyle = {
  background: "rgba(0,0,0,0.65)",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  width: 20,
  height: 20,
  cursor: "pointer",
  fontSize: 11,
  lineHeight: 1,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};

export default GalleryUploader;
