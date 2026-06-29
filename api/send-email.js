export const config = { runtime: 'edge' };

const TO_EMAIL = process.env.TO_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL;

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!TO_EMAIL || !FROM_EMAIL) {
    return new Response(JSON.stringify({ error: 'TO_EMAIL or FROM_EMAIL env var not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { worksheetName, pdfBase64, date } = body;

  if (!worksheetName || !pdfBase64) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const filename = `${worksheetName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;

  const emailPayload = {
    from: FROM_EMAIL,
    to: [TO_EMAIL],
    subject: `Mind Over Mood — ${worksheetName} (${date})`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #2E1F0E; background: #F5EED8; padding: 32px; border-radius: 8px;">
        <p style="font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #A8824A; margin: 0 0 12px;">Mind Over Mood · CBT Worksheets</p>
        <h1 style="font-size: 22px; font-weight: 400; margin: 0 0 8px; color: #2E1F0E;">${worksheetName}</h1>
        <p style="font-size: 13px; color: #7A6048; margin: 0 0 24px;">${date}</p>
        <hr style="border: none; border-top: 1px solid rgba(201,169,110,0.5); margin: 0 0 20px;" />
        <p style="font-size: 14px; line-height: 1.7; color: #3D2C1A;">
          A completed worksheet has been submitted via the Mind Over Mood portal.<br>
          The full responses are attached as a PDF.
        </p>
        <p style="font-size: 12px; color: #7A6048; margin-top: 32px; border-top: 1px solid rgba(201,169,110,0.3); padding-top: 16px;">
          brockjohn.com &middot; Mind Over Mood CBT Worksheets
        </p>
      </div>
    `,
    attachments: [
      {
        filename,
        content: pdfBase64
      }
    ]
  };

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      return new Response(JSON.stringify({ error: resendData.message || 'Resend error' }), {
        status: resendRes.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
