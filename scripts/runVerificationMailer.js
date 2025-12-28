const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const sendVerificationEmail = require('../src/utils/VerificationMailer');

async function run() {
  try {
    const testEmail = process.env.EMAIL_USER;
    const token = 'test-token-' + Date.now();
    console.log('Sending verification email to', testEmail);
    await sendVerificationEmail(testEmail, token);
    console.log('Email sent successfully');
  } catch (err) {
    console.error('Error sending email:', err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

run();
