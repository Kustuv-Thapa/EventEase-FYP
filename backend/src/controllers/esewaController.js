const axios = require("axios");
const crypto = require("crypto");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");

const Payment = require("../models/Payment");
const Registration = require("../models/Registration");
const Event = require("../models/Event");
const Ticket = require("../models/Ticket");

// -----------------------------
// Helper: Generate unique productId
// -----------------------------
const generateProductId = () => {
  return `PID-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

// -----------------------------
// Helper: Generate eSewa signature
// -----------------------------
const generateEsewaSignature = ({ totalAmount, transactionUuid, productCode }) => {
  const secretKey = process.env.ESEWA_SECRET_KEY;

  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;

  return crypto.createHmac("sha256", secretKey).update(message).digest("base64");
};

// -----------------------------
// Helper: Create Ticket + QR
// -----------------------------
const createTicketIfNotExists = async (registration) => {
  try {
    const existingTicket = await Ticket.findOne({ registration: registration._id });
    if (existingTicket) return existingTicket;

    const ticketId = uuidv4();
    const qrPayload = JSON.stringify({
      ticketId,
      eventId: String(registration.eventId),
      registrationId: String(registration._id),
    });
    const qrCode = await QRCode.toDataURL(qrPayload);

    return await Ticket.create({
      user: registration.userId,
      event: registration.eventId,
      registration: registration._id,
      ticketId,
      qrCode,
      status: "VALID",
    });
  } catch (err) {
    // Handle duplicate key — ticket already exists
    if (err.code === 11000) {
      return await Ticket.findOne({ registration: registration._id });
    }
    throw err;
  }
};

// -----------------------------
// Helper: Process eSewa verification (shared logic)
// -----------------------------
const processEsewaVerification = async (amt, pid, rid) => {
  const payment = await Payment.findOne({ productId: pid });
  console.log("[eSewa] processEsewaVerification called", { amt, pid, rid });
  if (!payment) {
    console.log("[eSewa] Payment not found for pid:", pid);
    return { status: "not_found" };
  }
  console.log("[eSewa] Payment found:", payment._id, "status:", payment.status, "amount:", payment.amount);
  if (payment.status === "success") return { status: "already_success", payment };

  const parsedAmt = Number(String(amt).replace(/,/g, ""));
  console.log("[eSewa] Amount check — DB:", payment.amount, "Callback:", parsedAmt);
  if (Number(payment.amount) !== parsedAmt) {
    payment.status = "failed";
    payment.verificationResponse = { reason: "Amount mismatch", callbackAmount: amt };
    await payment.save();
    return { status: "amount_mismatch" };
  }

  const verificationUrl = `${process.env.ESEWA_STATUS_CHECK_URL}?product_code=${process.env.ESEWA_MERCHANT_CODE}&total_amount=${payment.amount}&transaction_uuid=${payment.productId}`;
  console.log("[eSewa] Calling verification URL:", verificationUrl);
  
  let verificationData;
  try {
    const verificationResponse = await axios.get(verificationUrl);
    verificationData = verificationResponse.data;
    console.log("[eSewa] Verification response:", JSON.stringify(verificationData));
  } catch (axiosErr) {
    console.log("[eSewa] Status check failed:", axiosErr.message, axiosErr.response?.data);
    payment.status = "failed";
    payment.verificationResponse = { reason: "eSewa status check failed", error: axiosErr.message };
    await payment.save();
    return { status: "failed" };
  }

  payment.verificationResponse = verificationData;

  if (verificationData && verificationData.status === "COMPLETE") {
    payment.status = "success";
    payment.transactionId = verificationData.ref_id || rid || payment.transactionId;
    await payment.save();

    const registration = await Registration.findById(payment.registrationId);
    if (!registration) return { status: "registration_not_found" };

    if (registration.status !== "confirmed") {
      registration.status = "confirmed";
      registration.decidedAt = new Date();
      await registration.save();
      await Event.findByIdAndUpdate(registration.eventId, { $inc: { confirmedCount: 1 } });
    }

    await createTicketIfNotExists(registration);
    return { status: "success", payment };
  }

  payment.status = "failed";
  payment.transactionId = rid || payment.transactionId;
  await payment.save();
  return { status: "failed" };
};
exports.initiateEsewaPayment = async (req, res, next) => {
  try {
    const { registrationId } = req.body;

    if (!registrationId) {
      return res.status(400).json({
        success: false,
        message: "registrationId is required",
      });
    }

    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    // Ensure current user owns the registration
    if (registration.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to pay for this registration",
      });
    }

    // Optional: block payment if already confirmed
    if (registration.status === "confirmed") {
      return res.status(400).json({
        success: false,
        message: "Registration is already confirmed",
      });
    }

    // Check successful payment already exists
    const existingSuccessPayment = await Payment.findOne({
      registrationId: registration._id,
      status: "success",
      method: "esewa",
    });

    if (existingSuccessPayment) {
      return res.status(400).json({
        success: false,
        message: "Payment already completed for this registration",
      });
    }

    const event = await Event.findById(registration.eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if event is free or paid
    let amount = event.pricing.type === "PAID" ? event.pricing.price : 0;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid event amount",
      });
    }

    const productId = generateProductId();

    const payment = await Payment.create({
      userId: registration.userId,
      eventId: registration.eventId,
      registrationId: registration._id,
      amount,
      status: "pending",
      productId,
      method: "esewa",
    });

    const productCode = process.env.ESEWA_MERCHANT_CODE;

    const signature = generateEsewaSignature({
      totalAmount: amount,
      transactionUuid: productId,
      productCode,
    });

    return res.status(201).json({
      success: true,
      message: "Payment initiated successfully",
      paymentId: payment._id,
      paymentData: {
        amount,
        tax_amount: 0,
        total_amount: amount,
        transaction_uuid: productId,
        product_code: productCode,
        product_service_charge: 0,
        product_delivery_charge: 0,
        success_url: process.env.ESEWA_SUCCESS_URL,
        failure_url: process.env.ESEWA_FAILURE_URL,
        signed_field_names: "total_amount,transaction_uuid,product_code",
        signature,
        payment_url: process.env.ESEWA_PAYMENT_URL,
      },
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------
// 2. eSewa Success Callback (legacy — kept as fallback)
// -----------------------------
exports.esewaSuccess = async (req, res, next) => {
  try {
    let amt, rid, pid;

    if (req.query.data) {
      try {
        const decodedData = JSON.parse(Buffer.from(req.query.data, "base64").toString("utf-8"));
        amt = decodedData.total_amount || decodedData.amount;
        rid = decodedData.transaction_code || decodedData.ref_id || decodedData.rid;
        pid = decodedData.transaction_uuid || decodedData.pid;
      } catch {
        return res.redirect(`${process.env.FRONTEND_URL}/payment/failure`);
      }
    } else {
      amt = req.query.amt;
      rid = req.query.rid;
      pid = req.query.pid;
    }

    if (!amt || !pid) return res.redirect(`${process.env.FRONTEND_URL}/payment/failure`);

    const result = await processEsewaVerification(amt, pid, rid);
    if (result.status === "success" || result.status === "already_success") {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/success`);
    }
    return res.redirect(`${process.env.FRONTEND_URL}/payment/failure`);
  } catch (error) {
    next(error);
  }
};

// -----------------------------
// 3. eSewa Failure Callback
// -----------------------------
exports.esewaFailure = async (req, res, next) => {
  try {
    const pid = req.query.pid || req.query.transaction_uuid || req.body.pid;

    if (!pid) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/failure`);
    }

    const payment = await Payment.findOne({ productId: pid });

    if (!payment) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/failure`);
    }

    // do not overwrite successful payment
    if (payment.status !== "success") {
      payment.status = "failed";
      payment.verificationResponse = {
        reason: "Payment failed or cancelled by user",
      };
      await payment.save();
    }

    return res.redirect(`${process.env.FRONTEND_URL}/payment/failure`);
  } catch (error) {
    next(error);
  }
};

// -----------------------------
// 5. Frontend-triggered verify (called after eSewa redirects to frontend)
// -----------------------------
exports.verifyEsewaCallback = async (req, res, next) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ success: false, message: "data is required" });

    let decodedData;
    try {
      decodedData = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
    } catch {
      return res.status(400).json({ success: false, message: "Invalid callback data" });
    }

    const amt = decodedData.total_amount || decodedData.amount;
    const pid = decodedData.transaction_uuid || decodedData.pid;
    const rid = decodedData.transaction_code || decodedData.ref_id || decodedData.rid;

    if (!amt || !pid) return res.status(400).json({ success: false, message: "Missing required parameters" });

    const result = await processEsewaVerification(amt, pid, rid);

    if (result.status === "success" || result.status === "already_success") {
      return res.status(200).json({ success: true, message: "Payment verified and ticket issued" });
    }
    if (result.status === "not_found") {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }
    if (result.status === "registration_not_found") {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }
    return res.status(400).json({ success: false, message: "Payment verification failed" });
  } catch (error) {
    next(error);
  }
};
exports.verifyEsewaPayment = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const payment = await Payment.findOne({ productId }).populate("registrationId");

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    // Only the owner can check their payment
    if (payment.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return res.status(200).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};
