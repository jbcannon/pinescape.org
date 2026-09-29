// Download page's email-gated download form. Sends name/email/affiliation/
// use plus a Cloudflare Turnstile token to the Worker at api.pinescape.org,
// which emails the visitor a time-limited download link. Runs only on
// download.html, where #download-gate-form exists.
(function () {
  var form = document.getElementById('download-gate-form');
  if (!form) return;

  var API = 'https://api.pinescape.org/download-request';

  var statusEl = document.getElementById('download-gate-status');
  var submitBtn = form.querySelector('button[type="submit"]');
  var useSelect = document.getElementById('dg-use');
  var otherField = document.getElementById('dg-use-other-field');
  var otherInput = document.getElementById('dg-use-other');

  useSelect.addEventListener('change', function () {
    var isOther = useSelect.value === 'Other';
    otherField.hidden = !isOther;
    otherInput.required = isOther;
    if (!isOther) otherInput.value = '';
  });

  function showStatus(message, isError, withContactLink) {
    statusEl.textContent = message;
    if (withContactLink) {
      statusEl.appendChild(document.createTextNode(' '));
      var a = document.createElement('a');
      a.className = 'text-link';
      a.href = 'contact.html';
      a.textContent = 'Contact us';
      statusEl.appendChild(a);
      statusEl.appendChild(document.createTextNode(' if it keeps happening.'));
    }
    statusEl.hidden = false;
    statusEl.classList.toggle('form-status--error', !!isError);
    statusEl.classList.toggle('form-status--success', !isError);
  }

  function resetTurnstile() {
    if (window.turnstile) {
      try { window.turnstile.reset(); } catch (e) { /* widget not rendered yet */ }
    }
  }

  function formatExpiry(iso) {
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
    } catch (e) {
      return null;
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

    var use = useSelect.value;
    if (use === 'Other' && otherInput.value.trim()) {
      use = 'Other: ' + otherInput.value.trim();
    }

    var payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      affiliation: form.affiliation.value.trim(),
      use: use,
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
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function (r) {
        if (r.ok) {
          form.hidden = true;
          var when = r.data.expiresAt && formatExpiry(r.data.expiresAt);
          showStatus('Check your email for your download link' +
            (when ? ', valid until ' + when : '') +
            '. If it isn\'t in your inbox within a few minutes, check your spam or junk folder.', false);
          if (typeof gtag === 'function') {
            gtag('event', 'download_link_requested', { use_type: useSelect.value });
          }
          return;
        }

        submitBtn.disabled = false;
        resetTurnstile();
        var err = r.data && r.data.error;
        if (err === 'recently_sent') {
          showStatus('We just sent a link to that address. Please check your inbox (and spam folder) before requesting another.', true);
        } else if (err === 'rate_limited') {
          showStatus('Too many requests. Please wait a minute and try again.', true);
        } else if (err === 'invalid_email') {
          showStatus('That email address doesn\'t look right. Please check it and try again.', true);
        } else if (err === 'verification_failed') {
          showStatus('The security check didn\'t go through. Please try again.', true);
        } else {
          showStatus('Something went wrong sending your download link. Please try again.', true, true);
        }
      })
      .catch(function () {
        submitBtn.disabled = false;
        resetTurnstile();
        showStatus('Something went wrong sending your download link. Please try again.', true, true);
      });
  });
})();
