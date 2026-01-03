# SendGrid DNS Configuration

The following records were provided for domain authentication.

> [!WARNING]
> You are attempting to authenticate the domain `buildproapp2.vercel.app`.
> **Critical Issue**: Vercel does **not** allow adding custom DNS records (CNAME/TXT) to `*.vercel.app` subdomains.
>
> **Solution**: You must purchase a custom domain (e.g., `mybuildpro.com`) and configure SendGrid to use that domain instead.

## Provided Records (for reference)

If you *do* manage to use a custom domain, the records usually look like this (but the hostnames will change to match your new domain):

| Type | Host | Value |
|------|------|-------|
| CNAME | `url4905.buildproapp2.vercel.app` | `sendgrid.net` |
| CNAME | `58388527.buildproapp2.vercel.app` | `sendgrid.net` |
| CNAME | `em7599.buildproapp2.vercel.app` | `u58388527.wl028.sendgrid.net` |
| CNAME | `s1._domainkey.buildproapp2.vercel.app` | `s1.domainkey.u58388527.wl028.sendgrid.net` |
| CNAME | `s2._domainkey.buildproapp2.vercel.app` | `s2.domainkey.u58388527.wl028.sendgrid.net` |
| TXT | `_dmarc.buildproapp2.vercel.app` | `v=DMARC1; p=none;` |

## Next Steps
1.  **Get a Custom Domain**: Buy one from Namecheap, GoDaddy, or Vercel directly.
2.  **Add to Vercel**: Add the custom domain to your Vercel project settings.
3.  **Update SendGrid**: usage the "Sender Authentication" wizard in SendGrid to use your *new* custom domain.
4.  **Add DNS Records**: Add the *new* CNAME/TXT records SendGrid gives you to your domain's DNS panel.
5.  **Get Secret Key**: Generate a new API Key in SendGrid settings and copy the **Secret Key** (starts with `SG.`) to your `.env` file.
