# RivalGhost deployment

RivalGhost can run as one persistent Node 24 API service with a static web frontend and Caddy. The supplied systemd templates run it as an unprivileged user with resource limits. SQLite, replay records and transaction journals require persistent storage.

## Build and validate

Run `bash tools/build-release.sh /absolute/new-release-directory` after `pnpm check`. The package includes compiled first-party code and production dependencies, static web files and deployment templates. It excludes private environment files, local databases and keys. Artifact validation rejects external symlinks and native addons. pnpm 10 needs registry metadata even with frozen-lockfile; compare deployed dependencies with the tested installation and validate startup on the actual Linux host.

## Private staging

Use `deploy/staging.env.example` for a disposable private preview. It disables authentication, chain signing, HOUND and paid AI. Do not import staging balances into the live economy. The preview binds to loopback and can be accessed through an operator-managed SSH tunnel. It is not a public player URL.

The Caddy template serves the static frontend and forwards the API on the same origin. HTML is revalidated; API responses are never publicly cached. The proxy overwrites the client-IP header. The API trusts that header only from loopback when explicitly configured; direct requests cannot choose their own rate-limit address.

## Backups and cutover

The SQLite backup script uses the online backup API, verifies integrity, publishes a protected snapshot and retains 14 days. The systemd timer provides daily on-host snapshots. Add independent off-host backups before wider release; test restoration rather than relying on file creation alone.

Before public cutover, configure the final HTTPS domain and an accepted NEAR Auth callback. Stop the previous signer process, reconcile uncertain transactions, and migrate the consistent live database, required protected credentials and budgets. Keep only one active process per signing key. Set the exact application origin, switch the backup source to the live database and test authentication and recovery from the public URL. Keep credentials and machine-specific access/rollback details out of the public repository.

Initially use DNS-only unless trusted Cloudflare proxy ranges and caching are explicitly configured and verified. Never trust arbitrary client-provided forwarding headers.

## November 13 checkpoint

The isolated Hetzner preview and API are running. Health, static delivery, proxy-header spoof rejection, resource limits and SQLite snapshot restoration passed. The previous application's web, worker and browser services were stopped and disabled after its archive and database restore were verified. Its database service and existing backup schedule remain available for rollback. Machine-specific access details and protected backup locations stay in the operator's private runbook.

The selected public domain is **rivalghost.xyz**, purchased through Namecheap. Public DNS returned NXDOMAIN at the initial check. With Namecheap BasicDNS, add an apex A record pointing to the existing server's public IPv4; remove conflicting apex parking/redirect records. The operator has the address privately. Leave IPv6 and www unconfigured until explicitly tested. Cloudflare is optional for the first cutover; changing nameservers is unnecessary if using BasicDNS.

`deploy/Caddyfile.public` prepares automatic HTTPS and same-origin API routing. It is a pending configuration, not proof of public availability. Before importing it, migrate the live service consistently and set `APP_ORIGIN=https://rivalghost.xyz`. The private staging database must never replace the real player database.

A non-authenticated authorization preflight returned HTTP 403 / **Callback URL mismatch** for `https://rivalghost.xyz/auth/callback`. Request that the NEAR Auth testnet provider register this exact callback and the web origin `https://rivalghost.xyz`, preserving the existing testnet identity provider. Do not substitute the localhost callback in a public build. No sign-in, transaction or paid inference was performed in this preflight.

Suggested provider request (send manually):

> We are building RivalGhost for the NEAR hackathon on testnet. Please allow `https://rivalghost.xyz/auth/callback` as a callback and `https://rivalghost.xyz` as a web origin for testnet client `np8paqIpMWmNbzT4xAvOOapZBjsOpptl`, or provide an app-specific client on the same testnet provider. OIDC PKCE identity login and explicit delegate-action signing work at localhost:3000; the hosted callback currently returns Callback URL mismatch. We need to preserve existing testnet player identities. This is not a request to migrate to mainnet.

Reference: [official testnet configuration](https://docs.auth.near.org/resources/testnet). The documented [production-access form](https://docs.auth.near.org/home/apply) concerns mainnet; testnet hosted-origin support needs confirmation from the provider.

## Public preview activated

On November 13, public DNS began resolving and the prepared Caddy site was activated at https://rivalghost.xyz/. External checks passed: HTTPS certificate validation, HTTP 200 for the frontend, API health, disabled NEAR Auth with the correct hosted callback, and explicit local-demo economy configuration. APP_ORIGIN now matches the HTTPS domain. Existing Caddy routes were preserved and protected configuration rollback copies were taken. The previous SSH preview URL is no longer the canonical application origin.

This is a public demo preview, not the live on-chain service. It retains the staging database; no live player database, signer credentials or AI key was migrated. Paid inference and chain signing remain disabled. Public browser gameplay and two-player social testing remain to be completed. Hosted NEAR Auth allowlisting and a coordinated live-state migration remain prerequisites for enabling the testnet economy here.
