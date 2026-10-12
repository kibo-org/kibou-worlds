# Experiment Submissions

Submit one bounded JSON bundle per experiment in a Pull Request. Do not commit
the private results directory, credentials, raw model responses or machine logs.
Fill in `author.interpretation` and `author.limitations` after examining all runs.
Use English or Japanese, synthetic information only, and a unique settings ID.

Run `npm run experiment:check -- results/run.json` before copying the reviewed
file here. Automated replay checks all actions and metrics; it cannot certify
that a claimed model was actually used or that every privacy risk was detected.
Reviewers must check provenance, privacy, interpretation, assumptions and rights.

Merging here does not publish to the Website. A Website maintainer separately
imports a reviewed result using the accepted PR URL and public reviewer username,
then reviews the Website diff. No contributed script or model API runs in Lab.
