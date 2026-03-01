const BREVO_API_KEY = String(process.env.BREVO_API_KEY || '').trim();
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const DOMAIN = 'https://hoc-est-corpus-meum.com';
const FROM = {
  email: process.env.EMAIL_FROM || 'content@frontira.io',
  name: process.env.EMAIL_FROM_NAME || 'Hocus Pocus',
};

// ---------------------------------------------------------------------------
// Shared email shell
// ---------------------------------------------------------------------------

function wrap(innerHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#121211;">
  <div style="background:#121211;color:#f8f2e9;font-family:'Space Grotesk',Arial,Helvetica,sans-serif;padding:48px 20px;">
    <div style="max-width:520px;margin:0 auto;">
      <p style="color:#f0b56f;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin:0 0 24px 0;text-align:center;">Hocus Pocus</p>
      ${innerHtml}
      <hr style="border:none;border-top:1px solid #2a2218;margin:32px 0 16px 0;" />
      <p style="color:#6b5f50;font-size:11px;text-align:center;margin:0;">
        Hocus Pocus by <a href="https://frontira.io" style="color:#6b5f50;">frontira</a> &middot; Vienna
      </p>
    </div>
  </div>
</body>
</html>`;
}

function btn(href, label) {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${href}" style="display:inline-block;background:#f0b56f;color:#1a1208;font-family:'Space Grotesk',Arial,sans-serif;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">${label}</a>
  </div>`;
}

function heading(text) {
  return `<h1 style="font-size:26px;color:#f8f2e9;margin:0 0 16px 0;text-align:center;line-height:1.2;">${text}</h1>`;
}

function paragraph(text) {
  return `<p style="color:#b9aa96;font-size:15px;line-height:1.6;margin:0 0 14px 0;text-align:center;">${text}</p>`;
}

function detail(label, value) {
  return `<p style="color:#b9aa96;font-size:14px;margin:0 0 6px 0;"><strong style="color:#f8f2e9;">${label}:</strong> ${value}</p>`;
}

// ---------------------------------------------------------------------------
// Send helper
// ---------------------------------------------------------------------------

async function send({ to, subject, html, replyTo }) {
  if (!BREVO_API_KEY) {
    console.warn('[email] BREVO_API_KEY not set, skipping email');
    return null;
  }

  const payload = {
    sender: FROM,
    to: Array.isArray(to) ? to : [{ email: to }],
    subject,
    htmlContent: html,
    tags: ['hocus-pocus'],
  };

  if (replyTo) {
    payload.replyTo = typeof replyTo === 'string' ? { email: replyTo } : replyTo;
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[email] Brevo error', response.status, text);
    return null;
  }

  const data = await response.json().catch(() => ({}));
  console.log('[email] sent:', subject, '→', payload.to.map((t) => t.email).join(', '));
  return data;
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

/** Notify organizer about a new application */
async function sendNewApplicationNotice({ email, linkedin }) {
  const html = wrap([
    heading('New Application'),
    paragraph('Someone just applied for Hocus Pocus.'),
    `<div style="background:#1a1610;border:1px solid #2a2218;border-radius:10px;padding:16px;margin:16px 0;">`,
    detail('Email', email),
    detail('LinkedIn', `<a href="${linkedin}" style="color:#f0b56f;">${linkedin}</a>`),
    `</div>`,
    btn(`${DOMAIN}/admin-login.html`, 'Open Admin Dashboard'),
  ].join('\n'));

  return send({
    to: [{ email: 'jb@frontira.io', name: 'Joanna Bakas' }],
    subject: `New application: ${email}`,
    html,
  });
}

/** Notify applicant that they've been approved */
async function sendApprovalEmail({ email, memberToken }) {
  const accessUrl = `${DOMAIN}/inside.html?token=${encodeURIComponent(memberToken)}`;

  const html = wrap([
    heading("You're In"),
    paragraph("Your application for Hocus Pocus has been approved. Here's your private access link to see the full event details."),
    `<div style="background:#1a1610;border:1px solid #2a2218;border-radius:10px;padding:16px;margin:16px 0;">`,
    detail('Date', 'Wednesday, March 25, 2026'),
    detail('Time', '6:00 PM'),
    detail('Location', 'Ruby Paul Workspace, Vienna'),
    `</div>`,
    btn(accessUrl, 'View Event Details'),
    paragraph('This link is personal to you. Do not share it.'),
  ].join('\n'));

  return send({ to: email, subject: "You're in - Hocus Pocus", html });
}

/** Notify applicant that they've been rejected */
async function sendRejectionEmail({ email }) {
  const html = wrap([
    heading('Thank You'),
    paragraph("Thank you for your interest in Hocus Pocus. Unfortunately, we're unable to offer you a seat for this edition."),
    paragraph("Seats are extremely limited and we had to make difficult choices. We hope to welcome you at a future event."),
  ].join('\n'));

  return send({ to: email, subject: 'Hocus Pocus - Application Update', html });
}

/** Send invite email to a guest on behalf of an existing member or admin persona */
async function sendInviteEmail({ recipientEmail, inviterEmail, inviterName, inviteUrl, expiresAt }) {
  const expiry = new Date(expiresAt).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  const inviterLabel = inviterName
    ? `${inviterName} / ${inviterEmail}`
    : inviterEmail;

  const html = wrap([
    heading("You've Been Invited"),
    paragraph(`<strong style="color:#f8f2e9;">${inviterLabel}</strong> has personally invited you to Hocus Pocus - an intimate, invite-only conversation for leaders in Vienna.`),
    `<div style="background:#1a1610;border:1px solid #2a2218;border-radius:10px;padding:16px;margin:16px 0;">`,
    detail('Date', 'Wednesday, March 25, 2026'),
    detail('Time', '6:00 PM'),
    detail('Location', 'Ruby Paul Workspace, Vienna'),
    `</div>`,
    paragraph('Between the doom headlines and the miracle promises, somewhere past the stock market whiplash and the breathless LinkedIn posts, there\'s a quieter reality: AI that works, right now, in actual businesses. Join a conversation about "what\'s possible" and "what\'s practical", in building AI solutions today.'),
    paragraph('Hosted by <strong style="color:#f8f2e9;">Joanna Bakas</strong> (25+ years in strategy, Oxford-trained, co-founder of frontira) and <strong style="color:#f8f2e9;">Dr. Thomas Pisar</strong> (physicist, executive advisor, 25 years leading transformation in tech). No slides, no sponsors - just sharp minds and honest conversation.'),
    btn(inviteUrl, 'Accept Your Invitation'),
    paragraph(`This invitation expires <strong style="color:#f8f2e9;">${expiry}</strong> and can only be used once.`),
  ].join('\n'));

  return send({
    to: recipientEmail,
    subject: `You've been invited to Hocus Pocus`,
    html,
    replyTo: inviterEmail,
  });
}

/** Notify inviter that their invite was claimed */
async function sendInviteClaimedNotice({ inviterEmail, claimerEmail, remaining }) {
  const html = wrap([
    heading('Invite Claimed'),
    paragraph(`<strong style="color:#f8f2e9;">${claimerEmail}</strong> just accepted your invitation to Hocus Pocus.`),
    paragraph(`You have <strong style="color:#f8f2e9;">${remaining}</strong> invite${remaining === 1 ? '' : 's'} remaining.`),
  ].join('\n'));

  return send({
    to: inviterEmail,
    subject: `${claimerEmail} accepted your Hocus Pocus invite`,
    html,
  });
}

export {
  sendNewApplicationNotice,
  sendApprovalEmail,
  sendRejectionEmail,
  sendInviteEmail,
  sendInviteClaimedNotice,
};
