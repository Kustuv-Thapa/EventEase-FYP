import { useState } from "react";
import StarRating from "./StarRating";
import Loader from "./Loader";
import ErrorMessage from "./ErrorMessage";
import { submitFeedbackApi, updateFeedbackApi } from "../api/feedbackApi";

const MAX_REVIEW_LENGTH = 1000;

const FeedbackForm = ({ eventId, existingFeedback, onSuccess }) => {
  const [rating, setRating] = useState(existingFeedback?.rating ?? 0);
  const [review, setReview] = useState(existingFeedback?.review ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (existingFeedback === null || existingFeedback === undefined) {
        await submitFeedbackApi(eventId, { rating, review });
      } else {
        await updateFeedbackApi(existingFeedback._id, { rating, review });
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message ?? "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const remaining = MAX_REVIEW_LENGTH - review.length;

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
          Your Rating
        </label>
        <StarRating value={rating} onChange={setRating} size={28} />
      </div>

      <div>
        <label htmlFor="feedback-review" style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
          Your Review <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span>
        </label>
        <textarea
          id="feedback-review"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          maxLength={MAX_REVIEW_LENGTH}
          rows={4}
          placeholder="Share your experience..."
          style={{
            width: "100%",
            resize: "vertical",
            padding: "10px 12px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            fontSize: 14,
            fontFamily: "inherit",
            background: "var(--bg-card, #fff)",
            color: "var(--text)",
            boxSizing: "border-box",
          }}
        />
        <div
          style={{
            textAlign: "right",
            fontSize: 12,
            color: remaining < 50 ? "var(--danger, #e53e3e)" : "var(--text-muted)",
            marginTop: 4,
          }}
          aria-live="polite"
        >
          {remaining} characters remaining
        </div>
      </div>

      <ErrorMessage message={error} />

      <button
        type="submit"
        disabled={loading || rating === 0}
        className="btn btn-primary"
        style={{ alignSelf: "flex-start" }}
      >
        {loading ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Loader size={16} />
            Submitting…
          </span>
        ) : existingFeedback ? (
          "Update Feedback"
        ) : (
          "Submit Feedback"
        )}
      </button>
    </form>
  );
};

export default FeedbackForm;
