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
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return json({ error: "Missing required fields." }, 400);
    }

    console.log("Contact form submission:", { name, email, subject, message });

    return json({
      success: true,
      message: "Contact form received successfully.",
    });
  } catch (error) {
    console.error("contact-send fatal error:", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
