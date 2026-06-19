'use strict';

const nodemailer = require('nodemailer');

// Save draft HTML to a temp file
function createDraft({ subject, htmlBody, to }) {
  const ts = Date.now();
  const path = `/tmp/digest-draft-${ts}.html`;
  require('fs').writeFileSync(path, htmlBody);
  console.log(`Draft saved to: ${path}`);
  console.log(`Subject: ${subject}`);
  console.log(`To: ${to}`);
}

// Send digest email via Gmail SMTP
async function sendDigest({ subject, htmlBody, to, gmailUser, gmailAppPassword }) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });

  const mailOptions = {
    from: gmailUser,
    to,
    subject,
    html: htmlBody,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully. Message ID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`Failed to send email: ${err.message}`);
    // Fall back to draft output so the digest is not lost
    createDraft({ subject, htmlBody, to });
    throw err;
  }
}

module.exports = { sendDigest, createDraft };
