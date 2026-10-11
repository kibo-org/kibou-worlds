# KIBOU Worlds

A synthetic-world research playground: one fictional island, twelve rule-based
agents, and reproducible resource-sharing experiments. This is an early research
prototype, not an LLM society or a validated model of human behavior.

## Start

Use Node.js 22 or newer:

```sh
npm ci --ignore-scripts
npm run dev
```

Open the local URL printed by Vite. The server binds only to the local machine.
Choose English or Japanese, run or step the world, select an agent, fork ownership
rules from the same state, and export JSON. Runs stop at 100 simulated days.
Experiments live in the current tab; there is no save/import service yet.

```sh
npm run check
npm audit --ignore-scripts --audit-level=moderate
```

## What Is Here

- Deterministic seeded engine, shared/private ownership and drought scenarios.
- Baseline/branch comparison, daily metrics and local JSON export.
- Procedural canvas artwork with HTML controls and canvas-unavailable fallback.
- No account system, database, production APIs, analytics or external fonts.

See [the experiment protocol](docs/EXPERIMENTS.md),
[contribution guide](CONTRIBUTING.md) and [Japanese developer guide](docs/DEVELOPMENT.ja.md).
Ideas and questions are welcome in public Issues; never post personal data there.

## Privacy

The application makes no background third-party requests. Agent names and places
are fictional. There is no browser storage, WebRTC, location access or telemetry.
Exported experiments are downloaded locally and never uploaded automatically.

This does **not** hide a visitor's network address from the server hosting the
app, GitHub, an ISP or a link they intentionally open. Hosting access logs are
controlled by the hosting operator. External GitHub links are explicit, with no
referrer; no third-party link is prefetched by this application.

## Roadmap

1. Reproducible experiment protocols and better comparison/uncertainty views.
2. Validated experiment imports, community scenarios and benchmark tasks.
3. Optional isolated LLM adapters with explicit budgets and synthetic data.

No model calls, paid services or production integrations are enabled today.

## Rights

Code: [MIT](LICENSE). Original fictional visual design: CC BY 4.0, as described in
[ASSETS.md](ASSETS.md). KIBOU names and branding are not licensed as trademarks.
No production game artwork, user records or Website history is included.

## 日本語

架空の島と12人のルールベースのエージェントを使う研究プロトタイプです。
共有・個人所有や干ばつを比較し、同じシードから実験を再現できます。
実在する会員データ、ログイン、データベース、LLM接続はありません。
結果は人間社会の予測や科学的結論を意味しません。
初めての方は[日本語開発ガイド](docs/DEVELOPMENT.ja.md)をご覧ください。
