// Download page's gated-download form. Submits name/email/affiliation/use
// to the Cloudflare Worker at api.pinescape.org, which emails a one-time
// download link instead of linking straight to the file. Runs only on
// download.html, where #download-gate-form exists.
(function () {
  var form = document.getElementById('download-gate-form');
  if (!form) return;

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

  function showStatus(html, isError) {
    statusEl.innerHTML = html;
    statusEl.hidden = false;
    statusEl.classList.toggle('form-status--error', !!isError);
    statusEl.classList.toggle('form-status--success', !isError);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var use = useSelect.value;
    if (use === 'Other' && otherInput.value.trim()) {
      use = 'Other: ' + otherInput.value.trim();
    }

    var payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      affiliation: form.affiliation.value.trim(),
      use: use
    };

    submitBtn.disabled = true;
    statusEl.hidden = true;

    fetch('https://api.pinescape.org/download-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('request failed');
        form.hidden = true;
        showStatus('Check your email: your one-time download link is on its way and works for 3 days.', false);
      })
      .catch(function () {
        submitBtn.disabled = false;
        showStatus('Something went wrong sending your download link. Please try again, or use the <a class="text-link" href="contact.html">contact page</a> if it keeps failing.', true);
      });
  });
})();
