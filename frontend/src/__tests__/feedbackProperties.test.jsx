import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as fc from "fast-check";
import StarRating from "../components/StarRating";
import FeedbackForm from "../components/FeedbackForm";

// Mock the feedbackApi module so no real HTTP calls are made
vi.mock("../api/feedbackApi", () => ({
  submitFeedbackApi: vi.fn(() => Promise.resolve({ data: {} })),
  updateFeedbackApi: vi.fn(() => Promise.resolve({ data: {} })),
}));

// Feature: event-feedback-rating
// Property 14 (partial): Star display matches value
// Validates: Requirements 8.3, 3.6

describe("StarRating — property tests", () => {
  it("renders exactly `value` filled stars and (5 - value) empty stars for any valid rating", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), (rating) => {
        const { unmount } = render(<StarRating value={rating} />);

        // The read-only container has role="img"
        const container = screen.getByRole("img");
        const stars = container.querySelectorAll("span[aria-hidden='true']");

        const filled = Array.from(stars).filter((s) => s.textContent === "★").length;
        const empty = Array.from(stars).filter((s) => s.textContent === "☆").length;

        expect(filled).toBe(rating);
        expect(empty).toBe(5 - rating);

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it("renders all 5 stars as empty when value is 0 (read-only)", () => {
    render(<StarRating value={0} />);
    const container = screen.getByRole("img");
    const stars = container.querySelectorAll("span[aria-hidden='true']");
    const empty = Array.from(stars).filter((s) => s.textContent === "☆").length;
    expect(empty).toBe(5);
  });

  it("renders interactive buttons with correct aria-labels for each star", { timeout: 30000 }, () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), (rating) => {
        const onChange = () => {};
        const { unmount } = render(<StarRating value={rating} onChange={onChange} />);

        for (let i = 1; i <= 5; i++) {
          expect(
            screen.getByRole("button", { name: `Rate ${i} out of 5` })
          ).toBeInTheDocument();
        }

        unmount();
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: event-feedback-rating
// Property 13: Character counter accuracy
// Property 14: Pre-fill existing feedback
// Validates: Requirements 8.4, 8.7

describe("FeedbackForm — property tests", () => {
  it("Property 13: character counter shows exactly (1000 - review.length) remaining characters", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 1000 }), (reviewText) => {
        const { unmount } = render(
          <FeedbackForm
            eventId="event-123"
            existingFeedback={{ _id: "fb-1", rating: 3, review: reviewText }}
            onSuccess={() => {}}
          />
        );

        const expected = 1000 - reviewText.length;
        expect(
          screen.getByText(`${expected} characters remaining`)
        ).toBeInTheDocument();

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it("Property 14: pre-fills rating and review from existingFeedback", { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        fc.record({
          rating: fc.integer({ min: 1, max: 5 }),
          review: fc.string({ maxLength: 1000 }),
        }),
        (existingFeedback) => {
          const feedbackWithId = { _id: "fb-existing", ...existingFeedback };
          const { unmount } = render(
            <FeedbackForm
              eventId="event-123"
              existingFeedback={feedbackWithId}
              onSuccess={() => {}}
            />
          );

          // The textarea should contain the existing review text
          const textarea = screen.getByRole("textbox");
          expect(textarea.value).toBe(existingFeedback.review);

          // The star buttons should reflect the existing rating:
          // buttons for stars 1..rating are filled (★), stars rating+1..5 are empty (☆)
          for (let i = 1; i <= 5; i++) {
            const btn = screen.getByRole("button", { name: `Rate ${i} out of 5` });
            if (i <= existingFeedback.rating) {
              expect(btn.textContent).toBe("★");
            } else {
              expect(btn.textContent).toBe("☆");
            }
          }

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
