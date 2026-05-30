import { useEffect, useState } from "react";
import { getEventFeedbackApi, replyToFeedbackApi, deleteOrganizerReplyApi } from "../api/feedbackApi";
import StarRating from "./StarRating";
import Loader from "./Loader";
import ErrorMessage from "./ErrorMessage";
import EmptyState from "./EmptyState";
import useAuth from "../hooks/useAuth";
import ConfirmModal from "./ConfirmModal";

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString("en-US", { dateStyle: "medium" });

const AvatarFallback = ({ name, avatar, size = 40 }) => {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={`${name}'s avatar`}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  return (
    <div
      aria-hidden="true"
      style={{
        width: size, height: size, borderRadius: "50%",
        background: "var(--primary, #6c63ff)", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: size * 0.45, flexShrink: 0, userSelect: "none",
      }}
    >
      {initial}
    </div>
  );
};

// ── Organizer reply sub-component ──────────────────────────────────────────────
const OrganizerReplySection = ({ review, isOrganizer, onReplyChange }) => {
  const hasReply = review.organizerReply?.text?.trim().length > 0;
  const [editing, setEditing] = useState(false);
  const [replyText, setReplyText] = useState(review.organizerReply?.text || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });

  const handleSubmit = async () => {
    if (!replyText.trim()) return;
    setLoading(true);
    setError("");
    try {
      await replyToFeedbackApi(review._id, replyText.trim());
      setEditing(false);
      onReplyChange();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post reply.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setConfirmModal({
      isOpen: true,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        setLoading(true);
        setError("");
        try {
          await deleteOrganizerReplyApi(review._id);
          setReplyText("");
          onReplyChange();
        } catch (err) {
          setError(err.response?.data?.message || "Failed to delete reply.");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <div style={{ marginTop: 10 }}>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Delete Reply"
        message="Delete your reply? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false })}
      />
      {/* Existing reply display */}
      {hasReply && !editing && (
        <div style={{
          marginLeft: 16, padding: "10px 14px",
          background: "#f0fdf4", border: "1px solid #bbf7d0",
          borderLeft: "3px solid #16a34a", borderRadius: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#15803d" }}>🎪 Organizer replied</span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              {review.organizerReply.repliedAt ? formatDate(review.organizerReply.repliedAt) : ""}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#166534", lineHeight: 1.6 }}>
            {review.organizerReply.text}
          </p>
          {isOrganizer && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                onClick={() => { setReplyText(review.organizerReply.text); setEditing(true); }}
                style={{ fontSize: 11, fontWeight: 600, color: "#15803d", background: "none", border: "1px solid #bbf7d0", borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                style={{ fontSize: 11, fontWeight: 600, color: "#b91c1c", background: "none", border: "1px solid #fecdd3", borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* Organizer reply form */}
      {isOrganizer && (editing || !hasReply) && (
        <div style={{ marginLeft: 16, marginTop: hasReply ? 0 : 8 }}>
          {!editing && !hasReply && (
            <button
              onClick={() => setEditing(true)}
              style={{
                fontSize: 12, fontWeight: 600, color: "#15803d",
                background: "#f0fdf4", border: "1px solid #bbf7d0",
                borderRadius: 6, padding: "5px 12px", cursor: "pointer",
              }}
            >
              💬 Reply as organizer
            </button>
          )}
          {editing && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 14px" }}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Write your reply..."
                style={{
                  width: "100%", resize: "vertical", padding: "8px 10px",
                  borderRadius: 6, border: "1px solid #bbf7d0", fontSize: 13,
                  fontFamily: "inherit", background: "#fff", boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{1000 - replyText.length} chars remaining</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { setEditing(false); setReplyText(review.organizerReply?.text || ""); setError(""); }}
                    style={{ fontSize: 12, fontWeight: 600, color: "#64748b", background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !replyText.trim()}
                    style={{
                      fontSize: 12, fontWeight: 700, color: "#fff",
                      background: "#16a34a", border: "none",
                      borderRadius: 6, padding: "5px 14px", cursor: "pointer",
                      opacity: loading || !replyText.trim() ? 0.6 : 1,
                    }}
                  >
                    {loading ? "Posting…" : "Post Reply"}
                  </button>
                </div>
              </div>
              {error && <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{error}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Review card ────────────────────────────────────────────────────────────────
const ReviewCard = ({ review, isOrganizer, onReplyChange }) => {
  const { userId, rating, review: text, createdAt } = review;
  const name = userId?.name ?? "Anonymous";
  const avatar = userId?.avatar ?? "";

  return (
    <div style={{ padding: "16px 0", borderBottom: "1px solid var(--border, #e2e8f0)" }}>
      <div style={{ display: "flex", gap: 14 }}>
        <AvatarFallback name={name} avatar={avatar} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{name}</span>
            <StarRating value={rating} size={14} />
            <span style={{ fontSize: 12, color: "var(--text-muted, #718096)", marginLeft: "auto" }}>
              {formatDate(createdAt)}
            </span>
          </div>
          {text && (
            <p style={{ margin: 0, fontSize: 14, color: "var(--text, #2d3748)", lineHeight: 1.6, wordBreak: "break-word" }}>
              {text}
            </p>
          )}
        </div>
      </div>

      {/* Organizer reply section */}
      <OrganizerReplySection
        review={review}
        isOrganizer={isOrganizer}
        onReplyChange={onReplyChange}
      />
    </div>
  );
};

// ── FeedbackList ───────────────────────────────────────────────────────────────
const FeedbackList = ({ eventId, refreshTrigger, organizerId }) => {
  const { user, isAuthenticated } = useAuth();
  const [averageRating, setAverageRating] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [internalTrigger, setInternalTrigger] = useState(0);

  const isOrganizer =
    isAuthenticated &&
    user?.role === "ORGANIZER" &&
    organizerId &&
    (user?.id === organizerId || user?._id === organizerId);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;

    const fetchFeedback = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getEventFeedbackApi(eventId);
        if (!cancelled) {
          const { averageRating, reviews, totalCount } = res.data.data;
          setAverageRating(averageRating);
          setReviews(reviews ?? []);
          setTotalCount(totalCount ?? 0);
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message ?? "Failed to load reviews.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchFeedback();
    return () => { cancelled = true; };
  }, [eventId, refreshTrigger, internalTrigger]);

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div>
      {/* Summary header */}
      {averageRating !== null && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
          padding: "14px 18px", background: "var(--bg-card, #fff)",
          borderRadius: 10, border: "1px solid var(--border, #e2e8f0)",
        }}>
          <span
            style={{ fontSize: 32, fontWeight: 700, color: "var(--text, #2d3748)" }}
            aria-label={`Average rating: ${averageRating.toFixed(1)} out of 5`}
          >
            {averageRating.toFixed(1)}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <StarRating value={Math.round(averageRating)} size={20} />
            <span style={{ fontSize: 13, color: "var(--text-muted, #718096)" }}>
              {totalCount} {totalCount === 1 ? "review" : "reviews"}
            </span>
          </div>
        </div>
      )}

      {/* Reviews list or empty state */}
      {reviews.length === 0 ? (
        <EmptyState icon="💬" message="No reviews yet. Be the first to share your experience!" />
      ) : (
        <div>
          {reviews.map((review) => (
            <ReviewCard
              key={review._id}
              review={review}
              isOrganizer={isOrganizer}
              onReplyChange={() => setInternalTrigger((t) => t + 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedbackList;
