const nodemailer = require("nodemailer");

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"EventEase" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[Email] Sent "${subject}" to ${to}`);
  } catch (err) {
    console.error("[Email] FAILED to send email:", err.message);
    console.error("[Email] Config — HOST:", process.env.EMAIL_HOST, "PORT:", process.env.EMAIL_PORT, "USER:", process.env.EMAIL_USER);
  }
};

// ── Email templates ──

exports.sendOtpEmail = async ({ to, name, otp }) => {
  await sendEmail({
    to,
    subject: "Verify your EventEase account",
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">Verify your account ✉️</h2>
        <p style="color: #64748b; margin-bottom: 24px;">Hi ${name}, enter the code below to activate your EventEase account.</p>
        <div style="background: #fff; border-radius: 10px; padding: 24px; border: 1px solid #e0e7ff; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #4f46e5;">${otp}</div>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">This code expires in 5 minutes. If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
  });
};

exports.sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  await sendEmail({
    to,
    subject: "Reset Your EventEase Password",
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">Reset your password</h2>
        <p style="color: #64748b; margin-bottom: 24px;">Hi ${name}, we received a request to reset your EventEase password.</p>
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">Reset Password</a>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
};

exports.sendRegistrationConfirmationEmail = async ({ to, name, eventTitle, eventDate, eventVenue, ticketId }) => {
  await sendEmail({
    to,
    subject: `You're registered for ${eventTitle}!`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">Registration Confirmed 🎉</h2>
        <p style="color: #64748b; margin-bottom: 20px;">Hi ${name}, your registration for <strong>${eventTitle}</strong> is confirmed.</p>
        <div style="background: #fff; border-radius: 10px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>📅 Date:</strong> ${eventDate}</p>
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>📍 Venue:</strong> ${eventVenue}</p>
          ${ticketId ? `<p style="margin: 0; color: #0f172a;"><strong>🎟 Ticket ID:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${ticketId}</code></p>` : ""}
        </div>
        <p style="color: #64748b; font-size: 13px;">Log in to EventEase to view and download your QR ticket.</p>
      </div>
    `,
  });
};

exports.sendPaymentConfirmationEmail = async ({ to, name, eventTitle, amount, ticketId }) => {
  await sendEmail({
    to,
    subject: `Payment Successful — ${eventTitle}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #16a34a; margin-bottom: 8px;">Payment Successful ✅</h2>
        <p style="color: #64748b; margin-bottom: 20px;">Hi ${name}, your payment of <strong>NPR ${amount?.toLocaleString()}</strong> for <strong>${eventTitle}</strong> was successful.</p>
        <div style="background: #fff; border-radius: 10px; padding: 20px; border: 1px solid #bbf7d0; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>💳 Amount Paid:</strong> NPR ${amount?.toLocaleString()}</p>
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>🎪 Event:</strong> ${eventTitle}</p>
          <p style="margin: 0; color: #0f172a;"><strong>🎟 Ticket ID:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${ticketId}</code></p>
        </div>
        <p style="color: #64748b; font-size: 13px;">Your QR ticket is ready. Log in to EventEase to view it.</p>
      </div>
    `,
  });
};

exports.sendTicketIssuedEmail = async ({ to, name, eventTitle, eventDate, ticketId }) => {
  await sendEmail({
    to,
    subject: `Your ticket for ${eventTitle} is ready`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">Your Ticket is Ready 🎟</h2>
        <p style="color: #64748b; margin-bottom: 20px;">Hi ${name}, your ticket for <strong>${eventTitle}</strong> has been issued.</p>
        <div style="background: #fff; border-radius: 10px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>📅 Date:</strong> ${eventDate}</p>
          <p style="margin: 0; color: #0f172a;"><strong>🎟 Ticket ID:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${ticketId}</code></p>
        </div>
        <p style="color: #64748b; font-size: 13px;">Show the QR code from your ticket at the event entrance. Log in to EventEase to view it.</p>
      </div>
    `,
  });
};

exports.sendRegistrationCancelledEmail = async ({ to, name, eventTitle, eventDate, eventVenue, reason }) => {
  await sendEmail({
    to,
    subject: `Your registration for ${eventTitle} has been cancelled`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #b91c1c; margin-bottom: 8px;">Registration Cancelled</h2>
        <p style="color: #64748b; margin-bottom: 20px;">Hi ${name}, your registration for <strong>${eventTitle}</strong> has been cancelled.</p>
        <div style="background: #fff; border-radius: 10px; padding: 20px; border: 1px solid #fecdd3; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>🎪 Event:</strong> ${eventTitle}</p>
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>📅 Date:</strong> ${eventDate}</p>
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>📍 Venue:</strong> ${eventVenue}</p>
          ${reason ? `<p style="margin: 0; color: #b91c1c;"><strong>Reason:</strong> ${reason}</p>` : ""}
        </div>
        <p style="color: #64748b; font-size: 13px;">If you believe this is a mistake, please contact the event organizer.</p>
      </div>
    `,
  });
};

exports.sendEventUpdatedEmail = async ({ to, name, eventTitle, oldDate, newDate, oldVenue, newVenue }) => {
  const dateChanged = oldDate !== newDate;
  const venueChanged = oldVenue !== newVenue;

  await sendEmail({
    to,
    subject: `Update: ${eventTitle} details have changed`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #b45309; margin-bottom: 8px;">Event Details Updated ⚠️</h2>
        <p style="color: #64748b; margin-bottom: 20px;">Hi ${name}, the details for <strong>${eventTitle}</strong> have been updated. Please review the changes below.</p>
        <div style="background: #fff; border-radius: 10px; padding: 20px; border: 1px solid #fde68a; margin-bottom: 20px;">
          ${dateChanged ? `
            <p style="margin: 0 0 12px; color: #0f172a;"><strong>📅 Date/Time:</strong></p>
            <p style="margin: 0 0 4px; color: #94a3b8; text-decoration: line-through; font-size: 13px;">${oldDate}</p>
            <p style="margin: 0 0 12px; color: #15803d; font-weight: 600;">${newDate}</p>
          ` : `<p style="margin: 0 0 8px; color: #0f172a;"><strong>📅 Date:</strong> ${newDate}</p>`}
          ${venueChanged ? `
            <p style="margin: 0 0 4px; color: #0f172a;"><strong>📍 Venue:</strong></p>
            <p style="margin: 0 0 4px; color: #94a3b8; text-decoration: line-through; font-size: 13px;">${oldVenue}</p>
            <p style="margin: 0; color: #15803d; font-weight: 600;">${newVenue}</p>
          ` : `<p style="margin: 0; color: #0f172a;"><strong>📍 Venue:</strong> ${newVenue}</p>`}
        </div>
        <p style="color: #64748b; font-size: 13px;">Your ticket remains valid. Log in to EventEase to view the latest event details.</p>
      </div>
    `,
  });
};

exports.sendEventCancelledEmail = async ({ to, name, eventTitle, eventDate, eventVenue }) => {
  await sendEmail({
    to,
    subject: `${eventTitle} has been cancelled`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #b91c1c; margin-bottom: 8px;">Event Cancelled ❌</h2>
        <p style="color: #64748b; margin-bottom: 20px;">Hi ${name}, we're sorry to inform you that <strong>${eventTitle}</strong> has been cancelled.</p>
        <div style="background: #fff; border-radius: 10px; padding: 20px; border: 1px solid #fecdd3; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>🎪 Event:</strong> ${eventTitle}</p>
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>📅 Date:</strong> ${eventDate}</p>
          <p style="margin: 0; color: #0f172a;"><strong>📍 Venue:</strong> ${eventVenue}</p>
        </div>
        <p style="color: #64748b; font-size: 13px;">Your registration has been automatically cancelled. We apologize for any inconvenience.</p>
      </div>
    `,
  });
};

exports.sendEventApprovedEmail = async ({ to, name, eventTitle, eventDate, eventVenue, pricing }) => {
  await sendEmail({
    to,
    subject: `🎉 Your event "${eventTitle}" has been approved!`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #15803d; margin-bottom: 8px;">Event Approved 🎉</h2>
        <p style="color: #64748b; margin-bottom: 20px;">Hi ${name}, great news! Your event <strong>${eventTitle}</strong> has been approved and is now live.</p>
        <div style="background: #fff; border-radius: 10px; padding: 20px; border: 1px solid #bbf7d0; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>🎪 Event:</strong> ${eventTitle}</p>
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>📅 Date:</strong> ${eventDate}</p>
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>📍 Venue:</strong> ${eventVenue}</p>
          <p style="margin: 0; color: #0f172a;"><strong>🎟 Pricing:</strong> ${pricing}</p>
        </div>
        <p style="color: #64748b; font-size: 13px;">Attendees can now discover and register for your event on EventEase.</p>
      </div>
    `,
  });
};

exports.sendEventRejectedEmail = async ({ to, name, eventTitle, reason }) => {
  await sendEmail({
    to,
    subject: `Your event "${eventTitle}" needs changes`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #b45309; margin-bottom: 8px;">Event Returned for Changes ⚠️</h2>
        <p style="color: #64748b; margin-bottom: 20px;">Hi ${name}, your event <strong>${eventTitle}</strong> has been returned to draft and requires changes before it can be published.</p>
        <div style="background: #fff; border-radius: 10px; padding: 20px; border: 1px solid #fde68a; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>📝 Reason:</strong></p>
          <p style="margin: 0; color: #b45309; font-weight: 600;">${reason}</p>
        </div>
        <p style="color: #64748b; font-size: 13px;">Log in to EventEase to update your event and resubmit for approval.</p>
      </div>
    `,
  });
};
