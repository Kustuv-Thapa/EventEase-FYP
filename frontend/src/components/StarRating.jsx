import { useState } from "react";

const TOTAL_STARS = 5;

const StarRating = ({ value = 0, onChange, size = 20 }) => {
  const [hovered, setHovered] = useState(null);

  const isInteractive = typeof onChange === "function";

  // The displayed rating: hover preview takes precedence over actual value
  const displayValue = hovered !== null ? hovered : value;

  if (!isInteractive) {
    return (
      <span
        role="img"
        aria-label={`Rating: ${value} out of ${TOTAL_STARS}`}
        style={{ display: "inline-flex", gap: 2 }}
      >
        {Array.from({ length: TOTAL_STARS }, (_, i) => {
          const starIndex = i + 1;
          return (
            <span
              key={starIndex}
              style={{
                fontSize: size,
                lineHeight: 1,
                color: starIndex <= value ? "#f5a623" : "#ccc",
              }}
              aria-hidden="true"
            >
              {starIndex <= value ? "★" : "☆"}
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <span
      style={{ display: "inline-flex", gap: 2 }}
      onMouseLeave={() => setHovered(null)}
    >
      {Array.from({ length: TOTAL_STARS }, (_, i) => {
        const starIndex = i + 1;
        const isFilled = starIndex <= displayValue;
        return (
          <button
            key={starIndex}
            type="button"
            aria-label={`Rate ${starIndex} out of ${TOTAL_STARS}`}
            onClick={() => onChange(starIndex)}
            onMouseEnter={() => setHovered(starIndex)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: size,
              lineHeight: 1,
              color: isFilled ? "#f5a623" : "#ccc",
              transition: "color 0.1s ease",
            }}
          >
            {isFilled ? "★" : "☆"}
          </button>
        );
      })}
    </span>
  );
};

export default StarRating;
