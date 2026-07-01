// supabase/functions/delete-account/index.ts
// Handles account deletion requests from delete-account.html
// - Sets deletion_requested_at on the user row
// - Sets status to 'pending_deletion'
// - Sends confirmation email to user via Resend
// - Notifies hello@myrandwise.co.za

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
    const { email } = await req.json()

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

    // 1. Find user
    const { data: user, error: findErr } = await supabase
      .from('beta_testers')
      .select('id, name, email, status')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (findErr || !user) {
      // Return success anyway — don't leak whether email exists
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Mark as pending deletion (idempotent — won't reset the clock if already requested)
    const alreadyRequested = user.status === 'pending_deletion'
    if (!alreadyRequested) {
      await supabase
        .from('beta_testers')
        .update({
          status: 'pending_deletion',
          deletion_requested_at: new Date().toISOString(),
        })
        .eq('id', user.id)
    }

    const firstName = (user.name || 'there').split(' ')[0]
    const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })

    // 3. Send confirmation email to user
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'MyRandWise <hello@myrandwise.co.za>',
        to: [email],
        subject: 'Your account deletion request — MyRandWise',
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#2c2c2a">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px">
              <div style="width:36px;height:36px;background:#1a7a4a;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px">🌱</div>
              <span style="font-size:17px;font-weight:700;color:#2c2c2a">MyRandWise</span>
            </div>
            <h1 style="font-size:22px;font-weight:800;margin-bottom:8px">Hi ${firstName},</h1>
            <p style="color:#5f5e5a;line-height:1.6;margin-bottom:16px">
              We've received your account deletion request. Your account and all associated data
              will be <strong>permanently deleted on ${deletionDate}</strong> (30 days from today).
            </p>
            <div style="background:#fdecea;border-radius:12px;padding:14px 16px;margin-bottom:20px">
              <p style="color:#a32d2d;margin:0;font-size:13px;line-height:1.6">
                ⚠️ After ${deletionDate}, your expenses, budgets, savings goals, and all personal data
                will be permanently removed and cannot be recovered.
              </p>
            </div>
            <p style="color:#5f5e5a;line-height:1.6;margin-bottom:24px">
              If you change your mind before that date, simply log back in to MyRandWise —
              your account will be reactivated automatically.
            </p>
            <a href="https://myrandwise.co.za/app.html"
               style="display:inline-block;padding:14px 24px;background:#1a7a4a;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px">
              Cancel deletion — keep my account
            </a>
            <p style="margin-top:32px;font-size:12px;color:#b4b2a9">
              Questions? Reply to this email or contact
              <a href="mailto:support@myrandwise.co.za" style="color:#1a7a4a">support@myrandwise.co.za</a><br><br>
              © 2026 MyRandWise · Built in South Africa 🇿🇦
            </p>
          </div>
        `
      })
    })

    // 4. Notify admin at hello@myrandwise.co.za
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'MyRandWise System <hello@myrandwise.co.za>',
        to: ['hello@myrandwise.co.za'],
        subject: `⚠️ Account deletion requested — ${user.name || email}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#2c2c2a">
            <h2 style="font-size:18px;font-weight:800;margin-bottom:16px">⚠️ Account Deletion Request</h2>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tr><td style="padding:8px 0;color:#888;width:40%">Name</td><td style="padding:8px 0;font-weight:600">${user.name || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#888">Email</td><td style="padding:8px 0;font-weight:600">${email}</td></tr>
              <tr><td style="padding:8px 0;color:#888">Requested</td><td style="padding:8px 0;font-weight:600">${new Date().toLocaleDateString('en-ZA', { day:'numeric', month:'long', year:'numeric' })}</td></tr>
              <tr><td style="padding:8px 0;color:#888">Purge date</td><td style="padding:8px 0;font-weight:600;color:#a32d2d">${deletionDate}</td></tr>
              <tr><td style="padding:8px 0;color:#888">Already pending?</td><td style="padding:8px 0">${alreadyRequested ? 'Yes — clock not reset' : 'No — new request'}</td></tr>
            </table>
            <p style="margin-top:20px;font-size:12px;color:#888">
              Review in <a href="https://myrandwise.co.za/admin_dashboard.html" style="color:#1a7a4a">Admin Dashboard → Overview → Pending Deletions</a>
            </p>
          </div>
        `
      })
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('delete-account error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
