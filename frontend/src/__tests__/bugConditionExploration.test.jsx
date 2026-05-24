/**
 * Bug Condition Exploration Tests - Frontend
 *
 * These tests MUST FAIL on unfixed code — failure confirms each bug exists.
 * DO NOT attempt to fix the tests or the code when they fail.
 * The tests encode the expected behavior — they will validate the fixes when they pass after implementation.
 *
 * Goal: Surface counterexamples that demonstrate each bug exists.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EventDetails from '../pages/EventDetails';
import { AuthContext } from '../context/AuthContext';
import * as eventApi from '../api/eventApi';
import * as registrationApi from '../api/registrationApi';
import * as feedbackApi from '../api/feedbackApi';
import * as khaltiApi from '../api/khaltiApi';

// Mock API modules
vi.mock('../api/eventApi');
vi.mock('../api/registrationApi');
vi.mock('../api/feedbackApi');
vi.mock('../api/khaltiApi');

// Mock react-router-dom hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'event-123' }),
    useNavigate: () => vi.fn(),
    useLocation: () => ({ hash: '' }),
  };
});

describe('Bug Condition Exploration Tests - Frontend', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Bug 9 — Payment initiation error not caught
   * **Validates: Requirements 1.8**
   *
   * Mock `initiateKhaltiPaymentApi` to throw; trigger `handleRegister` for a paid event;
   * assert a targeted error message is displayed.
   *
   * On unfixed code: The error message is misleading ("Registration failed") because
   * the outer catch handles both registerForEventApi and initiateKhaltiPaymentApi errors
   * with the same generic message, not a payment-specific one.
   */
  describe('Bug 9 — Payment initiation error not caught', () => {
    it('should display targeted payment error message when payment initiation fails', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'ATTENDEE',
      };

      const mockEvent = {
        _id: 'event-123',
        title: 'Paid Event',
        description: 'Event requiring payment',
        schedule: {
          startDateTime: new Date(Date.now() + 86400000).toISOString(),
          endDateTime: new Date(Date.now() + 90000000).toISOString(),
        },
        venue: { name: 'Test Venue', address: 'Test Location', city: 'Test City' },
        capacity: 100,
        confirmedCount: 0,
        pricing: { type: 'PAID', price: 500 },
        status: 'PUBLISHED',
        organizerId: { _id: 'org-123', name: 'Organizer' },
      };

      // Mock event fetch
      eventApi.getEventByIdApi.mockResolvedValue({
        data: { success: true, data: mockEvent },
      });

      // Mock feedback fetch (no feedback yet)
      feedbackApi.getEventFeedbackApi.mockResolvedValue({
        data: { success: true, data: { reviews: [], averageRating: null, totalCount: 0 } },
      });

      // Mock registration API to succeed with requiresPayment=true
      registrationApi.registerForEventApi.mockResolvedValue({
        data: {
          success: true,
          requiresPayment: true,
          data: {
            registration: { _id: 'reg-123', status: 'pending' },
          },
        },
      });

      // Mock payment initiation to throw a specific error
      khaltiApi.initiateKhaltiPaymentApi.mockRejectedValue({
        response: {
          data: { message: 'Khalti service unavailable' },
        },
      });

      render(
        <BrowserRouter>
          <AuthContext.Provider value={{ user: mockUser, isAuthenticated: true }}>
            <EventDetails />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      // Wait for event to load
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Paid Event' })).toBeInTheDocument();
      });

      // Find and click the register/pay button
      const registerButton = screen.getByRole('button', { name: /pay/i });
      fireEvent.click(registerButton);

      // Wait for error message to appear
      await waitFor(() => {
        // On unfixed code, the outer catch shows "Registration failed" — misleading
        // because registration actually succeeded; only payment initiation failed.
        // On fixed code, a payment-specific message is shown.
        const errorMessages = screen.queryAllByText(/payment/i);
        // The error should mention "payment" specifically (not just "Registration failed")
        expect(errorMessages.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  /**
   * Bug 11 — ID type mismatch in feedback lookup
   * **Validates: Requirements 1.10**
   *
   * Render `EventDetails` for a completed event where the current user has submitted feedback;
   * assert `userFeedback` is not null (i.e., the edit form is shown).
   *
   * On unfixed code: `userFeedback` is always null because ObjectId !== string (strict equality).
   */
  describe('Bug 11 — ID type mismatch in feedback lookup', () => {
    it('should correctly identify user\'s existing feedback when userId._id is an ObjectId-like object', async () => {
      const userId = '507f1f77bcf86cd799439011';

      const mockUser = {
        id: userId, // String ID from JWT
        name: 'Test User',
        email: 'test@example.com',
        role: 'ATTENDEE',
      };

      const mockEvent = {
        _id: 'event-123',
        title: 'Completed Event',
        description: 'Event for feedback test',
        schedule: {
          startDateTime: new Date(Date.now() - 90000000).toISOString(),
          endDateTime: new Date(Date.now() - 86400000).toISOString(),
        },
        venue: { name: 'Test Venue', address: 'Test Location', city: 'Test City' },
        capacity: 100,
        confirmedCount: 10,
        pricing: { type: 'FREE', price: 0 },
        status: 'COMPLETED',
        organizerId: { _id: 'org-123', name: 'Organizer' },
      };

      // Simulate the ObjectId-like object returned from MongoDB aggregation pipeline.
      // The bug: r.userId._id is an object (ObjectId), not a string.
      // Strict equality (===) between an object and a string always returns false.
      // The fix requires .toString() on the ObjectId side.
      const objectIdLike = {
        // This simulates a MongoDB ObjectId object — it has a toString() method
        // but is NOT a string, so === comparison with a string always fails.
        toString: () => userId,
        toHexString: () => userId,
        // Make it behave like an object (not a string) for === comparison
        valueOf: () => ({ _bsontype: 'ObjectId', id: userId }),
      };

      const mockFeedback = {
        reviews: [
          {
            _id: 'feedback-123',
            rating: 4,
            review: 'Great event!',
            status: 'approved',
            userId: {
              _id: objectIdLike, // ObjectId object — NOT a string
              name: 'Test User',
            },
            createdAt: new Date().toISOString(),
          },
          {
            _id: 'feedback-456',
            rating: 5,
            review: 'Excellent!',
            status: 'approved',
            userId: {
              _id: { toString: () => '507f1f77bcf86cd799439012' },
              name: 'Other User',
            },
            createdAt: new Date().toISOString(),
          },
        ],
        averageRating: 4.5,
        totalCount: 2,
      };

      // Mock event fetch
      eventApi.getEventByIdApi.mockResolvedValue({
        data: { success: true, data: mockEvent },
      });

      // Mock feedback fetch — returns the user's feedback with ObjectId-like _id
      feedbackApi.getEventFeedbackApi.mockResolvedValue({
        data: { success: true, data: mockFeedback },
      });

      render(
        <BrowserRouter>
          <AuthContext.Provider value={{ user: mockUser, isAuthenticated: true }}>
            <EventDetails />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      // Wait for event and feedback to load
      await waitFor(() => {
        expect(screen.getByText('Completed Event')).toBeInTheDocument();
      });

      // On unfixed code, this FAILS because userFeedback is null (ObjectId !== string)
      // The "Edit Your Review" heading should be shown (not "Leave a Review")
      await waitFor(() => {
        // The component renders "Edit Your Review" when userFeedback is not null
        // and "Leave a Review" when userFeedback is null
        const editHeading = screen.queryByText('Edit Your Review');
        expect(editHeading).not.toBeNull();
      }, { timeout: 3000 });
    });

    it('should show "Leave a Review" form when user has not submitted feedback', async () => {
      const mockUser = {
        id: '507f1f77bcf86cd799439099', // Different user ID — no feedback
        name: 'New User',
        email: 'new@example.com',
        role: 'ATTENDEE',
      };

      const mockEvent = {
        _id: 'event-123',
        title: 'Completed Event',
        description: 'Event for feedback test',
        schedule: {
          startDateTime: new Date(Date.now() - 90000000).toISOString(),
          endDateTime: new Date(Date.now() - 86400000).toISOString(),
        },
        venue: { name: 'Test Venue', address: 'Test Location', city: 'Test City' },
        capacity: 100,
        confirmedCount: 10,
        pricing: { type: 'FREE', price: 0 },
        status: 'COMPLETED',
        organizerId: { _id: 'org-123', name: 'Organizer' },
      };

      // Feedback from other users only
      const mockFeedback = {
        reviews: [
          {
            _id: 'feedback-456',
            rating: 5,
            review: 'Excellent!',
            status: 'approved',
            userId: {
              _id: { toString: () => '507f1f77bcf86cd799439012' },
              name: 'Other User',
            },
            createdAt: new Date().toISOString(),
          },
        ],
        averageRating: 5,
        totalCount: 1,
      };

      eventApi.getEventByIdApi.mockResolvedValue({
        data: { success: true, data: mockEvent },
      });

      feedbackApi.getEventFeedbackApi.mockResolvedValue({
        data: { success: true, data: mockFeedback },
      });

      render(
        <BrowserRouter>
          <AuthContext.Provider value={{ user: mockUser, isAuthenticated: true }}>
            <EventDetails />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Completed Event')).toBeInTheDocument();
      });

      // Should show "Leave a Review" (not "Edit Your Review") since user has no feedback
      await waitFor(() => {
        const leaveReviewHeading = screen.queryByText('Leave a Review');
        expect(leaveReviewHeading).not.toBeNull();
      }, { timeout: 3000 });
    });
  });
});
