// Contact page form. Posts to the Worker at api.pinescape.org/contact,
// which checks Turnstile and forwards the message to contact@pinescape.org
// through Microsoft 365. Runs only on contact.html (#contact-form).
(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;

  var API = 'https://api.pinescape.org/contact';
  var statusEl = document.getElementById('contact-form-status');
  var submitBtn = form.querySelector('button[type="submit"]');

  function showStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.hidden = false;
    statusEl.classList.toggle('form-status--error', !!isError);
    statusEl.classList.toggle('form-status--success', !isError);
  }

  function resetTurnstile() {
    if (window.turnstile) {
      try { window.turnstile.reset(); } catch (e) { /* not rendered yet */ }
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var tokenField = form.querySelector('[name="cf-turnstile-response"]');
    var turnstileToken = tokenField ? tokenField.value : '';
    if (!turnstileToken) {
      showStatus('Please wait a moment for the security check to finish, then try again.', true);
      return;
    }

    var payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      affiliation: form.affiliation.value.trim(),
      reason: form.reason.value,
      message: form.message.value.trim(),
      website: form.website.value,
      turnstileToken: turnstileToken
    };

    submitBtn.disabled = true;
    statusEl.hidden = true;

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (r) {
        if (r.ok) {
          form.hidden = true;
          showStatus('Thanks! Your message has been sent. We\'ll reply to the email address you provided.', false);
          if (typeof gtag === 'function') {
            gtag('event', 'contact_form_submitted', { topic: payload.reason });
          }
          return;
        }
        submitBtn.disabled = false;
        resetTurnstile();
        var err = r.data && r.data.error;
        if (err === 'recently_sent') {
          showStatus('We just received a message from that address. Please wait a minute before sending another.', true);
        } else if (err === 'rate_limited') {
          showStatus('Too many requests. Please wait a minute and try again.', true);
        } else if (err === 'invalid_email') {
          showStatus('That email address doesn\'t look right. Please check it and try again.', true);
        } else if (err === 'verification_failed') {
          showStatus('The security check didn\'t go through. Please try again.', true);
        } else {
          showStatus('Something went wrong sending your message. Please try again, or email contact@pinescape.org directly.', true);
        }
      })
      .catch(function () {
        submitBtn.disabled = false;
        resetTurnstile();
        showStatus('Something went wrong sending your message. Please try again, or email contact@pinescape.org directly.', true);
      });
  });
})();
