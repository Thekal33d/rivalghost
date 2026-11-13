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
