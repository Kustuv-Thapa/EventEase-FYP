/**
 * Bug Condition Exploration Tests
 *
 * These tests MUST FAIL on unfixed code - failure confirms each bug exists.
 * DO NOT attempt to fix the tests or the code when they fail.
 * The tests encode the expected behavior - they will validate the fixes when they pass after implementation.
 *
 * Goal: Surface counterexamples that demonstrate each bug exists.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const app = require('../src/app');
const request = require('supertest');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const Feedback = require('../src/models/Feedback');
const Payment = require('../src/models/Payment');
const jwt = require('jsonwebtoken');

// Mock axios for Khalti API calls
jest.mock('axios');
const axios = require('axios');

// Mock email service to prevent real email sends and allow controlled throwing
jest.mock('../src/utils/emailService', () => ({
  sendRegistrationConfirmationEmail: jest.fn().mockResolvedValue(undefined),
  sendPaymentConfirmationEmail: jest.fn().mockResolvedValue(undefined),
  sendRegistrationCancelledEmail: jest.fn().mockResolvedValue(undefined),
  sendEventUpdatedEmail: jest.fn().mockResolvedValue(undefined),
  sendEventCancelledEmail: jest.fn().mockResolvedValue(undefined),
  sendEventApprovedEmail: jest.fn().mockResolvedValue(undefined),
  sendEventRejectedEmail: jest.fn().mockResolvedValue(undefined),
}));

// Track console.error calls
const originalConsoleError = console.error;
let consoleErrorCalls = [];

beforeAll(async () => {
  const mongoUri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/eventease-test';
  await mongoose.connect(mongoUri);
}, 30000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  consoleErrorCalls = [];
  console.error = (...args) => {
    consoleErrorCalls.push(args);
  };
  jest.clearAllMocks();
});

afterEach(() => {
  console.error = originalConsoleError;
});

async function createUserAndToken(role, email) {
  const user = await User.create({
    name: 'Test User',
    email: email || ('test' + Date.now() + Math.random() + '@example.com'),
    password: 'password123',
    role: role || 'ATTENDEE',
    isVerified: true,
  });
  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET || 'test-secret'
  );
  return { user, token };
}

async function createTestEvent(organizerId, overrides) {
  const defaults = {
    title: 'Test Event',
    description: 'Test event description',
    organizerId,
    venue: { name: 'Test Venue', address: '123 Test St', city: 'Test City' },
    schedule: {
      startDateTime: new Date(Date.now() + 86400000),
      endDateTime: new Date(Date.now() + 90000000),
    },
    capacity: 100,
    pricing: { type: 'FREE', price: 0 },
    status: 'PUBLISHED',
  };
  return await Event.create(Object.assign({}, defaults, overrides || {}));
}

describe('Bug Condition Exploration Tests', () => {

  /**
   * Bug 1 - Analytics data leak
   * Validates: Requirements 1.1
   * On unfixed code: FAILS because all events are returned due to incorrect $lookup variable reference.
   */
  describe('Bug 1 - Analytics data leak', () => {
    it("should return only the requesting organizer's events in perEventBreakdown", async () => {
      const { user: organizerA, token: tokenA } = await createUserAndToken('ORGANIZER', 'organizerA@test.com');
      const { user: organizerB } = await createUserAndToken('ORGANIZER', 'organizerB@test.com');

      const eventA1 = await Event.create({
        title: 'Event A1', description: 'Event by organizer A', organizerId: organizerA._id,
        venue: { name: 'Venue A1', address: '123 Main St', city: 'City A' },
        schedule: { startDateTime: new Date(Date.now() + 86400000), endDateTime: new Date(Date.now() + 90000000) },
        capacity: 100, pricing: { type: 'PAID', price: 100 }, status: 'PUBLISHED',
      });
      const eventA2 = await Event.create({
        title: 'Event A2', description: 'Another event by organizer A', organizerId: organizerA._id,
        venue: { name: 'Venue A2', address: '456 Oak Ave', city: 'City A' },
        schedule: { startDateTime: new Date(Date.now() + 86400000), endDateTime: new Date(Date.now() + 90000000) },
        capacity: 50, pricing: { type: 'PAID', price: 50 }, status: 'PUBLISHED',
      });
      const eventB1 = await Event.create({
        title: 'Event B1', description: 'Event by organizer B', organizerId: organizerB._id,
        venue: { name: 'Venue B1', address: '789 Elm St', city: 'City B' },
        schedule: { startDateTime: new Date(Date.now() + 86400000), endDateTime: new Date(Date.now() + 90000000) },
        capacity: 200, pricing: { type: 'PAID', price: 200 }, status: 'PUBLISHED',
      });

      // Add confirmed registrations ONLY for organizer B's event
      // With the broken $lookup, organizer A's breakdown will incorrectly show these registrations
      const { user: attendee1 } = await createUserAndToken('ATTENDEE', 'attendee1@test.com');
      const { user: attendee2 } = await createUserAndToken('ATTENDEE', 'attendee2@test.com');
      await Registration.create({ eventId: eventB1._id, userId: attendee1._id, status: 'confirmed' });
      await Registration.create({ eventId: eventB1._id, userId: attendee2._id, status: 'confirmed' });

      // No registrations for organizer A's events
      const response = await request(app)
        .get('/api/analytics/organizer')
        .set('Authorization', 'Bearer ' + tokenA);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const perEventBreakdown = response.body.data.perEventBreakdown;
      const eventIds = perEventBreakdown.map(function(e) { return e.eventId.toString(); });

      // The event list should only contain organizer A's events (this part works correctly)
      expect(eventIds).toContain(eventA1._id.toString());
      expect(eventIds).toContain(eventA2._id.toString());
      expect(perEventBreakdown.length).toBe(2);

      // The bug: each event in the breakdown should show 0 confirmed registrations
      // (since no registrations were created for organizer A's events)
      // But on unfixed code, the broken $lookup returns ALL registrations (including B's),
      // so confirmedRegistrations will be > 0 for organizer A's events
      const totalConfirmedInBreakdown = perEventBreakdown.reduce(function(sum, ev) {
        return sum + (ev.confirmedRegistrations || 0);
      }, 0);

      // On unfixed code, this FAILS because the broken $lookup leaks organizer B's registrations
      // into organizer A's breakdown (totalConfirmedInBreakdown will be 4 instead of 0)
      expect(totalConfirmedInBreakdown).toBe(0);
    });
  });

  /**
   * Bug 3 - Race condition in free event registration
   * Validates: Requirements 1.2
   * On unfixed code: Both may succeed, causing overbooking.
   */
  describe('Bug 3 - Race condition in free event registration', () => {
    it('should allow only one registration when capacity is 1 and two concurrent requests arrive', async () => {
      const { user: organizer } = await createUserAndToken('ORGANIZER');
      const { token: token1 } = await createUserAndToken('ATTENDEE', 'attendee1@test.com');
      const { token: token2 } = await createUserAndToken('ATTENDEE', 'attendee2@test.com');

      const event = await createTestEvent(organizer._id, {
        title: 'Free Event Capacity 1',
        capacity: 1,
        pricing: { type: 'FREE', price: 0 },
      });

      const [response1, response2] = await Promise.all([
        request(app).post('/api/registrations/events/' + event._id).set('Authorization', 'Bearer ' + token1),
        request(app).post('/api/registrations/events/' + event._id).set('Authorization', 'Bearer ' + token2),
      ]);

      const successCount = [response1, response2].filter(function(r) { return r.status === 201; }).length;
      expect(successCount).toBe(1);

      const updatedEvent = await Event.findById(event._id);
      expect(updatedEvent.confirmedCount).toBe(1);
      expect(updatedEvent.confirmedCount).toBeLessThanOrEqual(updatedEvent.capacity);
    });
  });

  /**
   * Bug 4 - Feedback auto-approve
   * Validates: Requirements 1.3
   * On unfixed code: Status becomes "approved".
   */
  describe('Bug 4 - Feedback auto-approved on edit', () => {
    it('should preserve feedback status when editing hidden feedback', async () => {
      const { user: organizer } = await createUserAndToken('ORGANIZER');
      const { user: attendee, token } = await createUserAndToken('ATTENDEE');

      const event = await createTestEvent(organizer._id, {
        title: 'Completed Event',
        schedule: {
          startDateTime: new Date(Date.now() - 90000000),
          endDateTime: new Date(Date.now() - 86400000),
        },
        status: 'COMPLETED',
      });

      const feedback = await Feedback.create({
        eventId: event._id,
        userId: attendee._id,
        rating: 3,
        review: 'Original review',
        status: 'hidden',
      });

      const response = await request(app)
        .put('/api/feedback/' + feedback._id)
        .set('Authorization', 'Bearer ' + token)
        .send({ rating: 4, review: 'Updated review' });

      expect(response.status).toBe(200);

      const updatedFeedback = await Feedback.findById(feedback._id);
      // On unfixed code, this FAILS because status becomes "approved"
      expect(updatedFeedback.status).toBe('hidden');
    });
  });

  /**
   * Bug 5 - Duplicate pending payments
   * Validates: Requirements 1.4
   * On unfixed code: Two pending records are created.
   */
  describe('Bug 5 - Duplicate pending payments', () => {
    it('should reject second payment initiation when a pending payment exists', async () => {
      const { user: organizer } = await createUserAndToken('ORGANIZER');
      const { token } = await createUserAndToken('ATTENDEE');

      const event = await Event.create({
        title: 'Paid Event', description: 'Event requiring payment', organizerId: organizer._id,
        venue: { name: 'Test Venue', address: 'Test Location', city: 'Test City' },
        schedule: { startDateTime: new Date(Date.now() + 86400000), endDateTime: new Date(Date.now() + 90000000) },
        capacity: 100, pricing: { type: 'PAID', price: 500 }, status: 'PUBLISHED',
      });

      const regResponse = await request(app)
        .post('/api/registrations/events/' + event._id)
        .set('Authorization', 'Bearer ' + token);

      expect(regResponse.status).toBe(201);
      const registrationId = regResponse.body.data.registration._id;

      axios.post.mockResolvedValue({
        data: { pidx: 'test-pidx-123', payment_url: 'https://test.khalti.com/payment' },
      });

      // First payment initiation - should succeed (201)
      const payment1 = await request(app)
        .post('/api/khalti/initiate')
        .set('Authorization', 'Bearer ' + token)
        .send({ registrationId });

      expect(payment1.status).toBe(201);

      // Second payment initiation - should be rejected (400)
      const payment2 = await request(app)
        .post('/api/khalti/initiate')
        .set('Authorization', 'Bearer ' + token)
        .send({ registrationId });

      // On unfixed code, this FAILS because second payment is allowed
      expect(payment2.status).toBe(400);

      const pendingPayments = await Payment.find({ registrationId, status: 'pending' });
      expect(pendingPayments.length).toBe(1);
    });
  });

  /**
   * Bug 6 - Missing refund
   * Validates: Requirements 1.5
   * On unfixed code: No API call is made.
   */
  describe('Bug 6 - Missing refund processing', () => {
    it('should call Khalti refund API when cancelling a confirmed paid registration', async () => {
      const { user: organizer } = await createUserAndToken('ORGANIZER');
      const { user: attendee, token } = await createUserAndToken('ATTENDEE');

      const event = await Event.create({
        title: 'Paid Event', description: 'Event requiring payment', organizerId: organizer._id,
        venue: { name: 'Test Venue', address: 'Test Location', city: 'Test City' },
        schedule: { startDateTime: new Date(Date.now() + 86400000), endDateTime: new Date(Date.now() + 90000000) },
        capacity: 100, pricing: { type: 'PAID', price: 500 }, status: 'PUBLISHED', confirmedCount: 1,
      });

      const registration = await Registration.create({
        eventId: event._id, userId: attendee._id, status: 'confirmed',
      });

      await Payment.create({
        registrationId: registration._id, userId: attendee._id, eventId: event._id,
        amount: 500, method: 'khalti', status: 'success',
        transactionId: 'test-pidx-456', productId: 'product-' + Date.now(),
      });

      axios.post.mockResolvedValue({ data: { success: true } });

      const response = await request(app)
        .delete('/api/registrations/' + registration._id)
        .set('Authorization', 'Bearer ' + token);

      expect(response.status).toBe(200);

      // On unfixed code, this FAILS because Khalti refund API is never called
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/epayment/initiate-refund/'),
        expect.objectContaining({ pidx: 'test-pidx-456' }),
        expect.any(Object)
      );
    });
  });

  /**
   * Bug 7 - Past date on update
   * Validates: Requirements 1.6
   * On unfixed code: The update succeeds.
   */
  describe('Bug 7 - Missing date validation on event update', () => {
    it('should reject event update with past start date', async () => {
      const { user: organizer, token } = await createUserAndToken('ORGANIZER');

      const event = await Event.create({
        title: 'Future Event', description: 'Event to be updated', organizerId: organizer._id,
        venue: { name: 'Test Venue', address: 'Test Location', city: 'Test City' },
        schedule: { startDateTime: new Date(Date.now() + 86400000), endDateTime: new Date(Date.now() + 90000000) },
        capacity: 100, pricing: { type: 'FREE', price: 0 }, status: 'PUBLISHED',
      });

      const yesterday = new Date(Date.now() - 86400000);
      const response = await request(app)
        .put('/api/events/' + event._id)
        .set('Authorization', 'Bearer ' + token)
        .send({
          schedule: {
            startDateTime: yesterday.toISOString(),
            endDateTime: new Date(Date.now() + 3600000).toISOString(),
          },
        });

      // On unfixed code, this FAILS because the update succeeds (200)
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/past/i);
    });
  });

  /**
   * Bug 8 - Silent email failures
   * Validates: Requirements 1.7
   * On unfixed code: No log is produced (empty catch block).
   */
  describe('Bug 8 - Silent email failures', () => {
    it('should log email failures during payment verification', async () => {
      const { user: organizer } = await createUserAndToken('ORGANIZER');
      const { user: attendee } = await createUserAndToken('ATTENDEE');

      const event = await Event.create({
        title: 'Paid Event', description: 'Event requiring payment', organizerId: organizer._id,
        venue: { name: 'Test Venue', address: 'Test Location', city: 'Test City' },
        schedule: { startDateTime: new Date(Date.now() + 86400000), endDateTime: new Date(Date.now() + 90000000) },
        capacity: 100, pricing: { type: 'PAID', price: 500 }, status: 'PUBLISHED',
      });

      const registration = await Registration.create({
        eventId: event._id, userId: attendee._id, status: 'pending',
      });

      await Payment.create({
        registrationId: registration._id, userId: attendee._id, eventId: event._id,
        amount: 500, method: 'khalti', status: 'pending',
        transactionId: 'test-pidx-789', productId: 'product-' + Date.now(),
      });

      // Mock Khalti lookup to return Completed status
      axios.post.mockResolvedValue({
        data: { status: 'Completed', transaction_id: 'txn-123', total_amount: 50000 },
      });

      // Make the email service throw an error
      const emailService = require('../src/utils/emailService');
      emailService.sendPaymentConfirmationEmail.mockRejectedValue(
        new Error('Email service unavailable')
      );

      // Verify payment (POST /api/khalti/verify)
      const response = await request(app)
        .post('/api/khalti/verify')
        .send({ pidx: 'test-pidx-789' });

      // Payment verification should succeed despite email failure
      expect(response.status).toBe(200);

      // Give async operations time to complete
      await new Promise(function(resolve) { setTimeout(resolve, 200); });

      // On unfixed code, this FAILS because console.error is never called
      // (the catch block is empty: catch { /* email failure must never break the response */ })
      expect(consoleErrorCalls.length).toBeGreaterThan(0);
    });
  });

  /**
   * Bug 10 - Field name inconsistency
   * Validates: Requirements 1.9
   * On unfixed code: registeredCount is present.
   */
  describe('Bug 10 - Inconsistent field names', () => {
    it('should return confirmedCount (not registeredCount) in event API responses', async () => {
      const { user: organizer } = await createUserAndToken('ORGANIZER');

      await Event.create({
        title: 'Test Event', description: 'Event for field name test', organizerId: organizer._id,
        venue: { name: 'Test Venue', address: 'Test Location', city: 'Test City' },
        schedule: { startDateTime: new Date(Date.now() + 86400000), endDateTime: new Date(Date.now() + 90000000) },
        capacity: 100, pricing: { type: 'FREE', price: 0 }, status: 'PUBLISHED', confirmedCount: 5,
      });

      const response = await request(app).get('/api/events');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThan(0);

      const event = response.body.data.items[0];
      expect(event).toHaveProperty('confirmedCount');

      // On unfixed code, this FAILS because registeredCount is also present
      expect(event).not.toHaveProperty('registeredCount');
    });
  });

  /**
   * Bug 12 - Pagination DoS
   * Validates: Requirements 1.11
   * On unfixed code: skip is proportional to the unbounded page value.
   */
  describe('Bug 12 - Missing pagination upper bound', () => {
    it('should cap page parameter to prevent expensive skip operations', async () => {
      const { user: organizer } = await createUserAndToken('ORGANIZER');

      for (var i = 0; i < 3; i++) {
        await Event.create({
          title: 'Event ' + i, description: 'Test event', organizerId: organizer._id,
          venue: { name: 'Test Venue', address: 'Test Location', city: 'Test City' },
          schedule: { startDateTime: new Date(Date.now() + 86400000), endDateTime: new Date(Date.now() + 90000000) },
          capacity: 100, pricing: { type: 'FREE', price: 0 }, status: 'PUBLISHED',
        });
      }

      const response = await request(app)
        .get('/api/events')
        .query({ page: 999999, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.items).toEqual([]);

      const pagination = response.body.data.pagination;

      // On unfixed code, page would be 999999 (unbounded)
      // On fixed code, page should be capped at 500
      expect(pagination.page).toBeLessThanOrEqual(500);
    });
  });

});

