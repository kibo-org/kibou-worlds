# Security and Privacy

Report vulnerabilities using GitHub's private vulnerability reporting on this
repository's Security tab. If unavailable, use a private maintainer channel;
do not publish credentials, personal data or exploit details in Issues.

The maintained release is the current `main` source. This is a prototype without
a production SLA. Do not connect it to production accounts or real user datasets.

The static boundary checker is a conservative tripwire, not proof that arbitrary
code is safe. Review dependencies, browser behavior, workflows and asset rights.
The production CSP blocks background connections. The development server needs
its own local module loading; no production credentials should exist locally.
For deployment, serve `dist` with the policy in `public/_headers`; on hosts that
ignore that file, configure equivalent HTTP headers. `frame-ancestors` requires
an HTTP response header and is not provided by the HTML meta policy alone.

Never claim IP anonymity: hosting providers and intentionally visited sites can
observe network addresses. This code does not collect, store or forward them.
