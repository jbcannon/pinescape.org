# Pinescape API worker

Backend for two things on pinescape.org:

- The Download page's gated download form (`download.html`): visitor submits
  name/email/affiliation/use, gets emailed a one-time link that's good for
  one download within 3 days, instead of linking straight to a public file.
- The Contact page's form (`contact.html`): relays submissions to
  `pinescape@jonesctr.org` by email instead of opening the visitor's own
  email client.

This is a Cloudflare Worker, deployed separately from the pinescape.org
GitHub Pages site (which only serves static files and can't run this kind
of code). It needs to be deployed to the same Cloudflare account that
already manages DNS for pinescape.org.

## Prerequisites

- Node.js installed (for `npx`)
- Access to the Cloudflare account managing pinescape.org's DNS
- A [Resend](https://resend.com) account (free tier is fine) for sending email

## Deploy steps

Run these from inside this `cloudflare-worker/` folder.

1. **Log in to Cloudflare:**
   ```
   npx wrangler login
   ```

2. **Create the KV namespace** (stores one-time download tokens):
   ```
   npx wrangler kv namespace create PINESCAPE_DOWNLOADS
   ```
   This prints an `id`. Paste it into `wrangler.toml`, replacing
   `REPLACE_WITH_KV_NAMESPACE_ID`.

3. **Create the R2 bucket and upload the release file:**
   ```
   npx wrangler r2 bucket create pinescape-downloads
   npx wrangler r2 object put pinescape-downloads/pinecraftvr-windows.zip --file=./pinecraftvr-windows.zip
   ```
   (Grab the current Windows build zip from the project's GitHub Releases
   page first if you don't already have it locally.) The object key must
   match `DOWNLOAD_ASSET_KEY` in `wrangler.toml`: they're both
   `pinecraftvr-windows.zip` by default, so no change needed unless the
   filename changes later.

4. **Set up Resend:**
   - Sign up at resend.com, add `pinescape.org` as a sending domain.
   - Resend will give you DNS records (SPF + DKIM, usually a TXT and a
     couple of CNAMEs) to verify the domain. Add these in the Cloudflare
     DNS zone for pinescape.org (same place the site's own DNS records
     live) and wait for Resend to show the domain as verified.
   - Generate an API key in Resend.

5. **Set the Resend API key as a Worker secret** (not in `wrangler.toml`:
   secrets are set separately so they never end up in the repo):
   ```
   npx wrangler secret put RESEND_API_KEY
   ```
   Paste the key when prompted.

6. **Deploy:**
   ```
   npx wrangler deploy
   ```
   Then, in the Cloudflare dashboard, go to Workers & Pages -> this worker
   (`pinescape-api`) -> Settings -> Triggers -> Custom Domains, and add
   `api.pinescape.org`. This automatically creates the DNS record for it,
   no manual DNS entry needed. (Alternatively, uncomment the `routes` block
   at the bottom of `wrangler.toml` and run `wrangler deploy` again instead
   of using the dashboard: see the comment there.)

7. **Retire the old public download link:** once you've confirmed the gated
   download works end-to-end (see Testing below), delete or remove the
   `pinecraftvr-windows.zip` asset from the GitHub Release it's currently
   attached to, so the old ungated URL stops serving the file. The site no
   longer links to it directly, but the direct URL would keep working until
   the asset itself is removed.

## Config reference (`wrangler.toml` `[vars]`)

| Var | Purpose |
|---|---|
| `NOTIFY_EMAIL` | Where lead/contact notifications go (currently `pinescape@jonesctr.org`) |
| `FROM_EMAIL` | The verified Resend sending address, e.g. `Pinescape <noreply@pinescape.org>` |
| `DOWNLOAD_ASSET_KEY` | R2 object key of the current release zip |
| `DOWNLOAD_TTL_SECONDS` | How long a download link stays valid (currently 259200 = 3 days) |

## Testing

1. On `download.html`, submit the form with a real email address you can
   check. Confirm you get the download-link email, and that
   `pinescape@jonesctr.org` gets a notification with the name/email/
   affiliation/use and a Location line (country/region: this comes
   automatically from Cloudflare, not from anything the visitor typed).
2. Click the download link once. The file should download.
3. Click the same link again. It should show the "expired or already been
   used" page, not the file.
4. On `contact.html`, submit the form and confirm `pinescape@jonesctr.org`
   gets the message.

To test 3-day expiry without waiting 3 days, temporarily set
`DOWNLOAD_TTL_SECONDS` to something short (e.g. `"120"`), redeploy, request
a link, wait past that window, and confirm the link then shows the expired
page. Remember to set it back to `259200` and redeploy afterward.

## Known limitations (not built, by design)

- No rate-limiting on `/download-request` or `/contact`: someone could spam
  either form. Not requested for this first pass; worth revisiting if it
  becomes a problem (e.g. add Cloudflare Turnstile to both forms).
- The one-time-use check has a narrow race window: two requests for the same
  link at almost the same instant could both get through before either
  deletes the KV record. Acceptable for a free-download lead-capture gate.
