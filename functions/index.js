const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');

admin.initializeApp();
const db = admin.firestore();

// ── Secrets (set via: firebase functions:secrets:set SECRET_NAME) ──
const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY');
const SENDGRID_FROM_EMAIL = defineSecret('SENDGRID_FROM_EMAIL');
const TWILIO_ACCOUNT_SID = defineSecret('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = defineSecret('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = defineSecret('TWILIO_PHONE_NUMBER');

// ── Helper: calculate which reminder tiers are due ──
function getDueReminders(appointmentDateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const apptDate = new Date(appointmentDateStr + 'T00:00:00');
  const diffDays = Math.round((apptDate - now) / (1000 * 60 * 60 * 24));

  const due = [];
  if (diffDays === 7) due.push('7day');
  if (diffDays === 2) due.push('2day');
  if (diffDays === 1) due.push('1day');
  return due;
}

// ── Helper: format date for display ──
function fmtDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Helper: format time for display ──
function fmtTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ── Helper: build reminder message ──
function buildMessage(appt, tier) {
  const labels = { '7day': 'in 1 week', '2day': 'in 2 days', '1day': 'tomorrow' };
  const when = labels[tier];
  return {
    subject: `Appointment Reminder: ${appt.provider} — ${when}`,
    text:
      `Hi! This is a reminder that you have an appointment ${when}.\n\n` +
      `Provider: ${appt.provider}\n` +
      `Type: ${appt.type}\n` +
      `Date: ${fmtDate(appt.date)}\n` +
      `Time: ${fmtTime(appt.time)}\n` +
      `Location: ${appt.location}\n` +
      (appt.notes ? `Notes: ${appt.notes}\n` : '') +
      `\n— HealthSimplify`,
    html:
      `<p>Hi! This is a reminder that you have an appointment <strong>${when}</strong>.</p>` +
      `<table style="border-collapse:collapse;margin:16px 0;">` +
      `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Provider</td><td style="padding:4px 0;font-weight:600;">${appt.provider}</td></tr>` +
      `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Type</td><td style="padding:4px 0;">${appt.type}</td></tr>` +
      `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Date</td><td style="padding:4px 0;">${fmtDate(appt.date)}</td></tr>` +
      `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Time</td><td style="padding:4px 0;">${fmtTime(appt.time)}</td></tr>` +
      `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Location</td><td style="padding:4px 0;">${appt.location}</td></tr>` +
      (appt.notes ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Notes</td><td style="padding:4px 0;font-style:italic;">${appt.notes}</td></tr>` : '') +
      `</table>` +
      `<p style="color:#9ca3af;font-size:13px;">— HealthSimplify</p>`,
  };
}

// ── Send email via SendGrid ──
async function sendEmail(to, message) {
  sgMail.setApiKey(SENDGRID_API_KEY.value());
  await sgMail.send({
    to,
    from: SENDGRID_FROM_EMAIL.value(),
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

// ── Send SMS via Twilio ──
async function sendSMS(to, message) {
  const client = twilio(TWILIO_ACCOUNT_SID.value(), TWILIO_AUTH_TOKEN.value());
  await client.messages.create({
    body: message.text,
    from: TWILIO_PHONE_NUMBER.value(),
    to,
  });
}

// ══════════════════════════════════════════════════════════════════
// Scheduled function — runs every day at 8:00 AM UTC
// ══════════════════════════════════════════════════════════════════
exports.sendAppointmentReminders = onSchedule(
  {
    schedule: 'every day 08:00',
    timeZone: 'America/New_York',
    secrets: [SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER],
  },
  async () => {
    // Query all users
    const usersSnap = await db.collection('users').get();

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // Get this user's appointments with reminders enabled
      const apptsSnap = await db
        .collection('users')
        .doc(userId)
        .collection('appointments')
        .where('reminders', '==', true)
        .get();

      for (const apptDoc of apptsSnap.docs) {
        const appt = apptDoc.data();
        const sentAlready = appt.remindersSent || [];
        const dueTiers = getDueReminders(appt.date);

        for (const tier of dueTiers) {
          if (sentAlready.includes(tier)) continue; // already sent

          const message = buildMessage(appt, tier);

          // Send email to the user's auth email
          try {
            const authUser = await admin.auth().getUser(userId);
            if (authUser.email) {
              await sendEmail(authUser.email, message);
              console.log(`Email sent to ${authUser.email} for ${tier} reminder`);
            }
          } catch (err) {
            console.error(`Email failed for user ${userId}:`, err.message);
          }

          // Send SMS if phone number is on the appointment
          if (appt.phone) {
            try {
              await sendSMS(appt.phone, message);
              console.log(`SMS sent to ${appt.phone} for ${tier} reminder`);
            } catch (err) {
              console.error(`SMS failed for ${appt.phone}:`, err.message);
            }
          }

          // Mark this tier as sent
          sentAlready.push(tier);
        }

        // Update the document with sent reminders
        if (dueTiers.length > 0) {
          await apptDoc.ref.update({ remindersSent: sentAlready });
        }
      }
    }

    console.log('Appointment reminder check complete.');
  },
);

// ══════════════════════════════════════════════════════════════════
// Firestore trigger — reset remindersSent when appointment date changes
// ══════════════════════════════════════════════════════════════════
exports.onAppointmentUpdated = onDocumentUpdated(
  'users/{userId}/appointments/{appointmentId}',
  (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // If the date changed, clear sent reminders so they fire again for the new date
    if (before.date !== after.date) {
      return event.data.after.ref.update({ remindersSent: [] });
    }
    return null;
  },
);
