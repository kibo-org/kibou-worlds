# Contributing

Beginners are welcome. Start with an Issue describing a synthetic experiment,
accessibility issue or visualization improvement. You do not need production access.

1. Fork this public repository into your account.
2. Create a focused branch from `main`.
3. Run `npm ci --ignore-scripts` and `npm run dev`.
4. Make one small change, run `npm run check`, and open a Pull Request.
5. Include seed/rules, reproduction steps, screenshots and checks not performed.

Use your public GitHub username and GitHub noreply commit email. Check the email
in GitHub Settings > Emails before committing; never post your private address.

## First Tasks

- Improve a Japanese or English label without changing its meaning.
- Add a deterministic seed regression test.
- Improve keyboard focus or narrow-screen layout.
- Propose a fictional scenario with explicit assumptions and measurable outcomes.

## Boundaries

- Fictional data only. No personal profiles, real contact details, private URLs,
  credentials, exports from production or production account integrations.
- No network calls, telemetry, code execution from uploads or external assets.
- New files require an update to `public-export.json` and maintainer review.
- New dependencies and license/asset changes require explicit maintainer review.
- Fork PR checks have read-only permissions and no production secrets. Workflow
  changes must be reviewed before a maintainer approves execution.
- Contributors do not receive upstream write access. Maintainers review changes
  before merging; public contribution does not grant Website/backend access.
- Record model assumptions and do not equate synthetic results with human behavior.

Security findings belong in the repository's private vulnerability-reporting flow,
not public Issues. If it is unavailable, contact a maintainer privately without
posting an exploit, credential or personal information.

## 日本語

公開リポジトリをForkし、変更用ブランチからPRを送ってください。
最初は翻訳、再現テスト、キーボード操作の改善がおすすめです。
Issue・PR・画像・Gitの履歴は公開されます。実在する人の情報や個人メール、
APIキー、本番環境のデータを含めないでください。取り込み前に運営が確認します。
