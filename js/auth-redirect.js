// ── AUTH REDIRECT (runs before page paint) ─────────────────────
// Handles Supabase magic link / OTP / password recovery redirects.
// Must load as first script in <head> — no defer/async.
  (function() {
    var h = window.location.hash.replace(/^#/, '');
    var params = new URLSearchParams(h);
    var type = params.get('type');
    var token = params.get('access_token');
    var refresh = params.get('refresh_token') || '';
    var error = params.get('error');
    var errorCode = params.get('error_code');
    var errorDesc = params.get('error_description');
    // Handle expired/invalid links
    if(error || errorCode) {
      var msg = errorCode === 'otp_expired' ? 'This verification link has expired. Please request a new one.' :
                errorCode === 'access_denied' ? 'This link is no longer valid. Please try again.' :
                'Something went wrong. Please try again.';
      sessionStorage.setItem('rw_auth_error', msg);
    }
    if (type === 'recovery' && token) {
      window.location.replace(
        'https://myrandwise.co.za/reset-password.html#access_token=' + encodeURIComponent(token) +
        '&refresh_token=' + encodeURIComponent(refresh) +
        '&type=recovery'
      );
    }
  })();
