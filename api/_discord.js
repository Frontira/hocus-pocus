const DISCORD_BOT_TOKEN = String(process.env.DISCORD_BOT_TOKEN || '').trim();
const CHANNEL_ID = '1471431572661080084';

// ---------------------------------------------------------------------------
// Post a message to the #✨-hocus-pocus Discord channel
// ---------------------------------------------------------------------------

async function notify(message) {
  if (!DISCORD_BOT_TOKEN) {
    console.warn('[discord] DISCORD_BOT_TOKEN not set, skipping notification');
    return null;
  }

  const response = await fetch(
    `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: message }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error('[discord] API error', response.status, text);
    return null;
  }

  console.log('[discord] sent:', message.split('\n')[0]);
  return response.json().catch(() => ({}));
}

// ---------------------------------------------------------------------------
// Notification templates
// ---------------------------------------------------------------------------

function notifyNewApplication({ email, linkedin }) {
  return notify(`📋 **New Application** — ${email} ([LinkedIn](${linkedin}))`);
}

function notifyInviteCreated({ inviterEmail, inviterName, recipientEmail, method }) {
  const who = inviterName ? `${inviterName} (${inviterEmail})` : inviterEmail;
  if (method === 'email') {
    return notify(`✉️ **Invite Sent** — ${who} → ${recipientEmail}`);
  }
  return notify(`🔗 **Invite Link Created** — by ${who}`);
}

function notifyAdminInviteSent({ recipientEmail, senderName }) {
  return notify(`📨 **Admin Invite** — ${senderName} → ${recipientEmail}`);
}

function notifyInviteClaimed({ email, linkedin }) {
  const link = linkedin ? ` ([LinkedIn](${linkedin}))` : '';
  return notify(`🎉 **Invite Accepted** — ${email}${link}`);
}

export {
  notifyNewApplication,
  notifyInviteCreated,
  notifyAdminInviteSent,
  notifyInviteClaimed,
};
