# Pre-Publication Audit

Worktree review date: 2026-10-11. No publication-blocking privacy finding was
identified in the reviewed files. This is not a penetration-test claim or a
guarantee that every future contribution is safe.

## Scope

Only the exact files in `public-export.json` are publication candidates. The
standalone simulator was extracted from an explicit source-file allowlist, not
from a repository clone. No existing `.git`, Website shell, intake API, accounts,
database code, production configuration, logs, browser exports or build outputs
are included. A fresh Git history will be checked before publication.

## Release Checklist

- [x] Exact 34-file allowlist; no private paths, personal email or literal network addresses found
- [x] Gitleaks 8.30.1 staged-source scan: zero findings, redacted output
- [x] Local author/committer configured with a public handle and GitHub noreply identity
- [x] Standalone lockfile; npm reported zero vulnerabilities across 112 audited packages
- [x] Typecheck, 13 tests and production build passed
- [x] Static connection-policy review: production `connect-src 'none'`, no runtime request APIs, external fonts or media
- [x] Only two explicit external navigation links, both to this public repository; no prefetch and no referrer
- [x] English/Japanese contribution instructions and license/asset inventory
- [x] CI configuration: read-only contents, no credentials persisted, no production secrets or deployments

Full new-history and author-policy scans must also pass after committing and
before pushing. Publication uses a fresh repository, not a rewritten Website clone.

## Unperformed Checks

The browser process was not authorized in this environment. Desktop/mobile
screenshots, live network traces and browser-level interaction checks are not
marked as passed. Unit tests and static source/CSP review do not substitute for
those checks. An external penetration test has not been performed.

## Limitations

Static checks are conservative tripwires, not a proof of absence of vulnerabilities.
No claim of network anonymity is made: hosts, GitHub and deliberately visited
links observe ordinary network metadata. The application itself does not collect,
persist or forward visitor network addresses. Public GitHub Issues, PRs and commit
metadata must be reviewed by contributors before submission.
