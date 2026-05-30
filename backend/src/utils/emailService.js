const { Resend } = require("resend");

// Escape HTML special characters to prevent injection in email templates
const escHtml = (str) => {
  if (typeof str !== "string") return str ?? "";
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
};

const sendEmail = async ({ to, subject, html }) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.EMAIL_FROM || "EventEase <onboarding@resend.dev>";
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) {
      console.error("[Email] FAILED to send email:", error.message);
    } else {
      console.log(`[Email] Sent "${subject}" to ${to}`);
    }
  } catch (err) {
    console.error("[Email] FAILED to send email:", err.message);
  }
};

// ── Email templates ──

exports.sendOtpEmail = async ({ to, name, otp }) => {
  const safeName = escHtml(name);
  await sendEmail({
    to,
    subject: "Verify your EventEase account",
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">Verify your account ✉️</h2>
        <p style="color: #64748b; margin-bottom: 24px;">Hi ${safeName}, enter the code below to activate your EventEase account.</p>
        <div style="background: #fff; border-radius: 10px; padding: 24px; border: 1px solid #e0e7ff; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #4f46e5;">${otp}</div>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">This code expires in 5 minutes. If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
  });
};

exports.sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const safeName = escHtml(name);
  await sendEmail({
    to,
    subject: "Reset Your EventEase Password",
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">Reset your password</h2>
        <p style="color: #64748b; margin-bottom: 24px;">Hi ${safeName}, we received a request to reset your EventEase password.</p>
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">Reset Password</a>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
};

exports.sendRegistrationConfirmationEmail = async ({ to, name, eventTitle, eventDate, eventVenue, ticketId }) => {
  const safeName = escHtml(name);
  const safeTitle = escHtml(eventTitle);
  const safeDate = escHtml(eventDate);
  const safeVenue = escHtml(eventVenue);
  const safeTicketId = escHtml(ticketId);
  await sendEmail({
    to,
    subject: `You're registered for ${eventTitle}!`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">Registration Confirmed 🎉</h2>
        <p style="color: #64748b; margin-bottom: 20px;">Hi ${safeName}, your registration for <strong>${safeTitle}</strong> is confirmed.</p>
        <div style="background: #fff; border-radius: 10px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>📅 Date:</strong> ${safeDate}</p>
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>📍 Venue:</strong> ${safeVenue}</p>
          ${safeTicketId ? `<p style="margin: 0; color: #0f172a;"><strong>🎟 Ticket ID:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${safeTicketId}</code></p>` : ""}
        </div>
        <p style="color: #64748b; font-size: 13px;">Log in to EventEase to view and download your QR ticket.</p>
      </div>
    `,
  });
};

exports.sendPaymentConfirmationEmail = async ({ to, name, eventTitle, amount, ticketId, eventDate, eventVenue }) => {
  const safeName = escHtml(name);
  const safeTitle = escHtml(eventTitle);
  const safeDate = escHtml(eventDate);
  const safeVenue = escHtml(eventVenue);
  const safeTicketId = escHtml(ticketId);
  await sendEmail({
    to,
    subject: `Payment Successful — ${eventTitle}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #16a34a; margin-bottom: 8px;">Payment Successful ✅</h2>
        <p style="color: #64748b; margin-bottom: 20px;">Hi ${safeName}, your payment of <strong>NPR ${amount?.toLocaleString()}</strong> for <strong>${safeTitle}</strong> was successful.</p>
        <div style="background: #fff; border-radius: 10px; padding: 20px; border: 1px solid #bbf7d0; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>🎪 Event:</strong> ${safeTitle}</p>
          ${safeDate ? `<p style="margin: 0 0 8px; color: #0f172a;"><strong>📅 Date:</strong> ${safeDate}</p>` : ""}
          ${safeVenue ? `<p style="margin: 0 0 8px; color: #0f172a;"><strong>📍 Venue:</strong> ${safeVenue}</p>` : ""}
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>💳 Amount Paid:</strong> NPR ${amount?.toLocaleString()}</p>
          <p style="margin: 0; color: #0f172a;"><strong>🎟 Ticket ID:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${safeTicketId}</code></p>
        </div>
        <p style="color: #64748b; font-size: 13px;">Your QR ticket is ready. Log in to EventEase to view it.</p>
      </div>
    `,
  });
};

exports.sendRegistrationCancelledEmail = async ({ to, name, eventTitle, eventDate, eventVenue, reason }) => {
  const safeName = escHtml(name);
  const safeTitle = escHtml(eventTitle);
  const safeDate = escHtml(eventDate);
  const safeVenue = escHtml(eventVenue);
  const safeReason = escHtml(reason);
  await sendEmail({
    to,
    subject: `Your registration for ${eventTitle} has been cancelled`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #b91c1c; margin-bottom: 8px;">Registration Cancelled</h2>
        <p style="color: #64748b; margin-bottom: 20px;">Hi ${safeName}, your registration for <strong>${safeTitle}</strong> has been cancelled.</p>
        <div style="background: #fff; border-radius: 10px; padding: 20px; border: 1px solid #fecdd3; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>🎪 Event:</strong> ${safeTitle}</p>
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>📅 Date:</strong> ${safeDate}</p>
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>📍 Venue:</strong> ${safeVenue}</p>
          ${safeReason ? `<p style="margin: 0; color: #b91c1c;"><strong>Reason:</strong> ${safeReason}</p>` : ""}
        </div>
        <p style="color: #64748b; font-size: 13px;">If you believe this is a mistake, please contact the event organizer.</p>
      </div>
    `,
  });
};

exports.sendEventUpdatedEmail = async ({ to, name, eventTitle, oldDate, newDate, oldVenue, newVenue }) => {
  const safeName = escHtml(name);
  const safeTitle = escHtml(eventTitle);
  const safeOldDate = escHtml(oldDate);
  const safeNewDate = escHtml(newDate);
  const safeOldVenue = escHtml(oldVenue);
  const safeNewVenue = escHtml(newVenue);
  const dateChanged = oldDate !== newDate;
  const venueChanged = oldVenue !== newVenue;

  await sendEmail({
    to,
    subject: `Update: ${eventTitle} details have changed`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #b45309; margin-bottom: 8px;">Event Details Updated ⚠️</h2>
        <p style="color: #64748b; margin-bottom: 20px;">Hi ${safeName}, the details for <strong>${safeTitle}</strong> have been updated. Please review the changes below.</p>
        <div style="background: #fff; border-radius: 10px; padding: 20px; border: 1px solid #fde68a; margin-bottom: 20px;">
          ${dateChanged ? `
            <p style="margin: 0 0 12px; color: #0f172a;"><strong>📅 Date/Time:</strong></p>
            <p style="margin: 0 0 4px; color: #94a3b8; text-decoration: line-through; font-size: 13px;">${safeOldDate}</p>
            <p style="margin: 0 0 12px; color: #15803d; font-weight: 600;">${safeNewDate}</p>
          ` : `<p style="margin: 0 0 8px; color: #0f172a;"><strong>📅 Date:</strong> ${safeNewDate}</p>`}
          ${venueChanged ? `
            <p style="margin: 0 0 4px; color: #0f172a;"><strong>📍 Venue:</strong></p>
            <p style="margin: 0 0 4px; color: #94a3b8; text-decoration: line-through; font-size: 13px;">${safeOldVenue}</p>
            <p style="margin: 0; color: #15803d; font-weight: 600;">${safeNewVenue}</p>
          ` : `<p style="margin: 0; color: #0f172a;"><strong>📍 Venue:</strong> ${safeNewVenue}</p>`}
        </div>
        <p style="color: #64748b; font-size: 13px;">Your ticket remains valid. Log in to EventEase to view the latest event details.</p>
      </div>
    `,
  });
};

exports.sendEventCancelledEmail = async ({ to, name, eventTitle, eventDate, eventVenue }) => {
  const safeName = escHtml(name);
  const safeTitle = escHtml(eventTitle);
  const safeDate = escHtml(eventDate);
  const safeVenue = escHtml(eventVenue);
  await sendEmail({
    to,
    subject: `${eventTitle} has been cancelled`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #b91c1c; margin-bottom: 8px;">Event Cancelled ❌</h2>
        <p style="color: #64748b; margin-bottom: 20px;">Hi ${safeName}, we're sorry to inform you that <strong>${safeTitle}</strong> has been cancelled.</p>
        <div style="background: #fff; border-radius: 10px; padding: 20px; border: 1px solid #fecdd3; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>🎪 Event:</strong> ${safeTitle}</p>
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>📅 Date:</strong> ${safeDate}</p>
          <p style="margin: 0; color: #0f172a;"><strong>📍 Venue:</strong> ${safeVenue}</p>
        </div>
        <p style="color: #64748b; font-size: 13px;">Your registration has been automatically cancelled. We apologize for any inconvenience.</p>
      </div>
    `,
  });
};

exports.sendEventApprovedEmail = async ({ to, name, eventTitle, eventDate, eventVenue, pricing }) => {
  const safeName = escHtml(name);
  const safeTitle = escHtml(eventTitle);
  const safeDate = escHtml(eventDate);
  const safeVenue = escHtml(eventVenue);
  const safePricing = escHtml(pricing);
  await sendEmail({
    to,
    subject: `🎉 Your event "${eventTitle}" has been approved!`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #15803d; margin-bottom: 8px;">Event Approved 🎉</h2>
        <p style="color: #64748b; margin-bottom: 20px;">Hi ${safeName}, great news! Your event <strong>${safeTitle}</strong> has been approved and is now live.</p>
        <div style="background: #fff; border-radius: 10px; padding: 20px; border: 1px solid #bbf7d0; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>🎪 Event:</strong> ${safeTitle}</p>
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>📅 Date:</strong> ${safeDate}</p>
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>📍 Venue:</strong> ${safeVenue}</p>
          <p style="margin: 0; color: #0f172a;"><strong>🎟 Pricing:</strong> ${safePricing}</p>
        </div>
        <p style="color: #64748b; font-size: 13px;">Attendees can now discover and register for your event on EventEase.</p>
      </div>
    `,
  });
};

exports.sendEventRejectedEmail = async ({ to, name, eventTitle, reason }) => {
  const safeName = escHtml(name);
  const safeTitle = escHtml(eventTitle);
  const safeReason = escHtml(reason);
  await sendEmail({
    to,
    subject: `Your event "${eventTitle}" needs changes`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #b45309; margin-bottom: 8px;">Event Returned for Changes ⚠️</h2>
        <p style="color: #64748b; margin-bottom: 20px;">Hi ${safeName}, your event <strong>${safeTitle}</strong> has been returned to draft and requires changes before it can be published.</p>
        <div style="background: #fff; border-radius: 10px; padding: 20px; border: 1px solid #fde68a; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>📝 Reason:</strong></p>
          <p style="margin: 0; color: #b45309; font-weight: 600;">${safeReason}</p>
        </div>
        <p style="color: #64748b; font-size: 13px;">Log in to EventEase to update your event and resubmit for approval.</p>
      </div>
    `,
  });
};
