# Connecting scopex.co — Hostinger to GitHub Pages

Prepared November 1, 2026 (America/Toronto). DNS was inspected in your Hostinger panel; **no DNS or email settings were changed**.

## Current website records

| Type | Name | Current value | TTL |
| --- | --- | --- | --- |
| A | @ | 162.159.143.30 | 3600 |
| A | @ | 172.66.3.26 | 3600 |
| CNAME | www | custom-domains.chatgpt.site | 300 |

These currently point the website to the ChatGPT Sites infrastructure. Nameservers remain **ns1.dns-parking.com** and **ns2.dns-parking.com**.

## Cutover after upload

Verify scopex.co in your GitHub account's **Settings → Pages**. Add the unique DNS TXT value GitHub provides in Hostinger; keep that verification record. [GitHub domain verification](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)

Once the repository deployment succeeds, set its Pages custom domain to **scopex.co** before changing DNS. In Hostinger's **Domains → scopex.co → DNS / Nameservers**, replace the two current apex A records above with:

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | dessec.github.io |

Update the existing www record. TTL 300 is suitable for this cutover. Keep Hostinger nameservers. When GitHub finishes its DNS and certificate checks, enable **Enforce HTTPS**. Propagation and certificate issuance may take up to 24 hours. [GitHub custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)

The www value is **dessec.github.io**, without a repository path. If using another GitHub account, use its account hostname and update the backend's permitted github.io origin.

## Preserve the existing email records

| Type | Name | Current value | Priority |
| --- | --- | --- | --- |
| MX | @ | mx1.hostinger.com | 5 |
| MX | @ | mx2.hostinger.com | 10 |
| TXT | @ | v=spf1 include:_spf.mail.hostinger.com ~all | — |
| TXT | _dmarc | v=DMARC1; p=none | — |
| CNAME | hostingermail-a._domainkey | hostingermail-a.dkim.mail.hostinger.com | — |
| CNAME | hostingermail-b._domainkey | hostingermail-b.dkim.mail.hostinger.com | — |
| CNAME | hostingermail-c._domainkey | hostingermail-c.dkim.mail.hostinger.com | — |
| CNAME | autodiscover | autodiscover.mail.hostinger.com | — |
| CNAME | autoconfig | autoconfig.mail.hostinger.com | — |

Leave existing OpenAI, Cloudflare and Discord verification TXT records alone during this cutover. Do not use Hostinger's **Reset DNS records** action.

The open Hostinger mailbox was identified as **bdesjardins@scopex.co**. Mail delivery was not tested, and no messages were sent or modified.

## Verify after cutover

- Open https://scopex.co and https://www.scopex.co in a fresh browser window; verify the new design and HTTPS.
- Run the homepage scanner and download its report.
- Prepare a project brief and confirm the email draft is addressed correctly.
- Check Hostinger email still receives ordinary correspondence.

On Windows, DNS can be checked with:

```powershell
Resolve-DnsName scopex.co -Type A
Resolve-DnsName www.scopex.co -Type CNAME
Resolve-DnsName scopex.co -Type MX
```

## Rollback

If the new frontend is not ready, restore only the two original apex A records and original www CNAME listed above. Keep the email records unchanged. The previously hosted site must still exist for this rollback to serve it.
