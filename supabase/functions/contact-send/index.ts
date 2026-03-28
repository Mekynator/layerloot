import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return json({ error: "Missing required fields." }, 400);
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const CONTACT_TO_EMAIL = Deno.env.get("CONTACT_TO_EMAIL");
    const CONTACT_FROM_EMAIL = Deno.env.get("CONTACT_FROM_EMAIL");

    if (!RESEND_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL) {
      return json({ error: "Missing server secrets." }, 500);
    }

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>New Contact Form Message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <div style="white-space: pre-wrap; border: 1px solid #ddd; padding: 12px; border-radius: 8px;">
          ${message}
        </div>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: [CONTACT_TO_EMAIL],
        reply_to: email,
        subject: `Contact Form: ${subject}`,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      return json({ error: "Failed to send email.", details: resendData }, 500);
    }

    return json({ success: true, data: resendData });
  } catch (error) {
    return json({ error: String(error) }, 500);
  }
});
