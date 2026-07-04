/**
 * Email delivery via Web3Forms (https://app.web3forms.com/).
 * Replaces the previous Resend integration.
 */

const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

function getAccessKey(): string {
  const key = process.env.WEB3FORMS_ACCESS_KEY;
  if (!key) throw new Error('WEB3FORMS_ACCESS_KEY is not set');
  return key;
}

interface SendEmailArgs {
  to:      string;
  name:    string;
  subject: string;
  message: string;
}

export async function sendEmail({ to, name, subject, message }: SendEmailArgs): Promise<boolean> {
  try {
    const res = await fetch(WEB3FORMS_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: getAccessKey(),
        from_name:  'FlowAI',
        name,
        email:      to,
        replyto:    to,
        subject,
        message,
      }),
    });

    const data = (await res.json()) as { success?: boolean; message?: string };
    if (!res.ok || !data.success) {
      console.error('[email] Web3Forms send failed:', data.message ?? res.statusText);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Web3Forms send error:', err);
    return false;
  }
}

export async function sendOtpEmail(to: string, name: string, code: string, purpose: 'verify' | 'reset'): Promise<boolean> {
  const subject =
    purpose === 'verify' ? 'Your FlowAI verification code' : 'Your FlowAI password reset code';

  const message = [
    `Hi ${name},`,
    '',
    purpose === 'verify'
      ? 'Use this code to verify your email address:'
      : 'Use this code to reset your password:',
    '',
    `    ${code}`,
    '',
    'This code expires in 10 minutes. If you did not request it, you can ignore this email.',
    '',
    '— FlowAI',
  ].join('\n');

  // OTPs must not silently disappear during development.
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[email] OTP for ${to} (${purpose}): ${code}`);
  }

  return sendEmail({ to, name, subject, message });
}
