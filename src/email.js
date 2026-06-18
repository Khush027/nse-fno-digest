'use strict';

const nodemailer = require('nodemailer');

// Print draft to console so it is never lost if sending fails
function createDraft({ subject, body, to, from }) {
  console.log('\n' + '='.repeat(60));
  console.log('=== DRAFT EMAIL ===');
  console.log('='.repeat(60));
  console.log(`From: ${from}`);
  console.log(`To:   ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('-'.repeat(60));
  console.log(body);
  console.log('='.repeat(60) + '\n');
}

// Send digest email via Gmail SMTP
async function sendDigest({ subject, body, to, gmailUser, gmailAppPassword }) {
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
    text: body,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully. Message ID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`Failed to send email: ${err.message}`);
    // Fall back to draft output so the digest is not lost
    createDraft({ subject, body, to, from: gmailUser });
    throw err;
  }
}

module.exports = { sendDigest, createDraft };
