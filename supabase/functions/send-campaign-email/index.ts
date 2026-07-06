// supabase/functions/send-campaign-email/index.ts
// Called from admin_dashboard.html "Send email to this whole segment" button.
// Keeps RESEND_API_KEY server-side — never expose it in the client dashboard.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_KEY       = Deno.env.get('RESEND_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { subject, message, recipients } = await req.json()

    if (!subject || !message || !Array.isArray(recipients) || !recipients.length) {
      return new Response(JSON.stringify({ error: 'subject, message, and a non-empty recipients array are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (recipients.length > 500) {
      return new Response(JSON.stringify({ error: 'Refusing to send to more than 500 recipients in one call — split into batches' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

    let sent = 0
    const failures: { email: string; error: string }[] = []

    for (const r of recipients) {
      if (!r.email || !r.email.includes('@')) {
        failures.push({ email: r.email || '(missing)', error: 'invalid email' })
        continue
      }
      const firstName = (r.name || 'there').split(' ')[0]
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'MyRandWise <hello@myrandwise.co.za>',
            to: [r.email],
            subject,
            html: `
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#2c2c2a">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px">
                  <div style="width:36px;height:36px;background:#1a7a4a;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px">🌱</div>
                  <span style="font-size:17px;font-weight:700;color:#2c2c2a">MyRandWise</span>
                </div>
                <h1 style="font-size:20px;font-weight:800;margin-bottom:12px">Hi ${firstName},</h1>
                <p style="color:#5f5e5a;line-height:1.6;margin-bottom:24px">${message}</p>
                <a href="https://myrandwise.co.za/app.html"
                   style="display:inline-block;padding:14px 24px;background:#1a7a4a;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px">
                  Open MyRandWise
                </a>
                <p style="margin-top:32px;font-size:12px;color:#b4b2a9">© 2026 MyRandWise · Built in South Africa 🇿🇦</p>
              </div>
            `
          })
        })
        if (!res.ok) {
          const t = await res.text()
          failures.push({ email: r.email, error: t })
          continue
        }
        sent++

        // Permanent trail of what was sent to whom — same audit_log table used elsewhere
        await supabase.from('audit_log').insert({
          tester_id: r.id || null,
          action: 'campaign_email_sent',
          metadata: { email: r.email, subject },
        })
      } catch (e) {
        failures.push({ email: r.email, error: String(e) })
      }
    }

    return new Response(JSON.stringify({ success: true, sent, failed: failures.length, failures }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('send-campaign-email error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
