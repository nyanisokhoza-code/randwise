// ── send-email Edge Function ────────────────────────────────────
// Proxies email sends to Resend server-side, keeping the API key
// off the client and solving the CORS block entirely.
//
// Deploy: supabase functions deploy send-email
// Set secret: supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
//
// Called from admin_dashboard.html and app.html instead of
// calling https://api.resend.com/emails directly.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Validate required fields
    if (!body.to || !body.subject || (!body.html && !body.text)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html or text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the Resend payload
    const payload: Record<string, unknown> = {
      from: body.from || 'MyRandWise <hello@myrandwise.co.za>',
      to: Array.isArray(body.to) ? body.to : [body.to],
      subject: body.subject,
    };
    if (body.html)  payload.html = body.html;
    if (body.text)  payload.text = body.text;
    if (body.reply_to) payload.reply_to = body.reply_to;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await resp.json();

    return new Response(JSON.stringify(result), {
      status: resp.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
