# KIBOU Worlds

An open research playground for small, fictional societies. Fork this repository,
choose a social question, run synthetic agents locally, and share settings,
observations and your interpretation for review.

There are two separate tools:
- **Browser island:** an offline visual, rule-based simulation.
- **Research CLI:** versioned experiments using deterministic agents or opt-in
  GPT/Claude actions, with replayable JSON results.

This is an early prototype, not a validated model of real people or society.
The new research implementation has not been run, tested or built locally for
this update. Written test cases are not a claim of successful verification.

## Experiments

| Question | Settings File | Compared Rules |
| --- | --- | --- |
| Resource sharing | `experiments/resource-sharing.json` | Commons, private reserves, minimum provision |
| Housing allocation | `experiments/housing-allocation.json` | Lottery, need priority, bid priority |
| Information asymmetry | `experiments/information-asymmetry.json` | Transparent quality, private signals with paid inspection |
| Public policy | `experiments/public-policy.json` | No tax, equal tax dividends, targeted minimum provision |

Every supplied setting starts with **offline deterministic agents**. Hypotheses
in the files are questions, not completed findings. All people, goods, budgets and
housing slots are fictional. There are no production accounts, real student
profiles, real addresses, public-policy datasets or backend connections.

See [the exact social protocols](docs/SOCIAL_EXPERIMENTS.md) before interpreting
results. Metrics are not interchangeable: housing `met` means housed agents;
other CLI experiments measure daily consumption. Gini definitions differ.

## Requirements and Installation

Use Node.js 22 or newer, npm and Git. Fork the repository into your GitHub account,
clone your Fork and enter its folder. Then:

```sh
npm ci --ignore-scripts
```

No Python, database, Docker or account on the KIBOU Website is required. The
committed lockfile fixes dependency versions. API credentials are not needed for
the browser island or deterministic CLI. Do not run unreviewed Fork code with keys.

## Explore the Offline Island

```sh
npm run dev
```

Open the local URL printed by Vite. The server binds to the local machine.
Choose English or Japanese, run or step the island, inspect an agent, fork
ownership rules from the same state, and export JSON. Runs stop at 100 simulated
days. State lives only in the current tab: export before refreshing or leaving.

The island uses `rules-v1`, not the research CLI engines. Its export is a browser
record, **not** a research submission bundle. Do not upload it under `submissions/`.
The canvas is procedural and does not load external images or fonts.

## Run Your First Research Experiment

You can also contribute without changing code: follow the
[reproduction guide](docs/REPRODUCTION.md) to rerun reviewed settings, compare seeds,
and submit observations, counterexamples and limitations. `npm run reproduce:check`
compares two bundles offline; it does not call a model or publish anything.

These are instructions for a future local run, not a record of checks performed
by maintainers for this update.

```sh
npm run experiment -- experiments/resource-sharing.json results/resources.json
npm run experiment -- experiments/housing-allocation.json results/housing.json
npm run experiment -- experiments/information-asymmetry.json results/information.json
npm run experiment -- experiments/public-policy.json results/policy.json
```

Choose one experiment to start. The CLI creates the destination directory and
writes an owner-only JSON file. It never overwrites an existing result; use a new
filename for another run. A failed run may leave an empty reserved file. Nothing
uploads automatically. `results/` is ignored by Git.

### Customize Settings

Create a private working copy:

```sh
mkdir -p results
cp experiments/housing-allocation.json results/my-settings.json
```

Edit that JSON in your editor:
- `id`: unique public experiment ID, lowercase letters, numbers and hyphens.
- `title`, `question`, `hypothesis`: synthetic research question and expectation.
- `experiment`: `housing`, `information`, `policy`, or `resource-sharing`.
  Older resource settings may omit it.
- `seed`: unsigned 32-bit base seed; repeats use successive seeds.
- `population`: 2–12; `days`: 1–100; `repeats`: 1–5.
- `rules`: only rules defined for the selected experiment.
- `scenario`: `steady` or `drought`; information experiments support only steady.
- `provider`: `rules`, `openai` or `anthropic`.
- `model`: `deterministic-v1` for rules; an accessible exact snapshot for models.
- `budget`: maximum calls, output tokens per call, total reported tokens,
  request timeout and entire run deadline.

At most 4000 action records are permitted per bundle; split larger research into
smaller experiments. Every selected rule and repeat must finish for publication.
The call count for a model run is rules × repeats × days × population.

## Use GPT or Claude Locally

Start with **two days, three agents and one repeat** before a larger model run.
Set the provider and exact model snapshot in your private settings copy. Supply
`OPENAI_API_KEY` or `ANTHROPIC_API_KEY` through your terminal environment using
your secret manager. A local `.env` file is not loaded automatically.

Never put a key in JSON, source code, the browser, GitHub, screenshots or command
history. API access and charges are separate from web-chat subscriptions.

```sh
npm run experiment -- results/my-settings.json results/my-model-run.json --allow-paid-api
```

Without `--allow-paid-api`, the CLI refuses model calls. Agents propose only the
experiment's finite actions; deterministic engine rules validate and execute them.
No arbitrary code, model tools, browser automation, private APIs or URL overrides
are supported. Only fixed HTTPS provider endpoints are used; redirects are refused.

Requests have deadlines and size limits. Refused, invalid or incomplete actions
stop the run; there are no automatic paid retries or silent rule substitutions.
Resolved model identifiers must match the configured snapshot. A mismatch may
still be billable. Budgets reserve input/output capacity before each request;
configure provider-side spending limits too. Token limits are **not** a dollar
price guarantee, and cancelled requests can still incur charges.

See [the local agent guide](docs/AGENT_EXPERIMENTS.md) for details and API references.

## Results, Reproduction and Interpretation

Research bundles include:
- Engine and prompt versions, the actual fixed prompt, all settings and budgets.
- Each repeat's seed and policy.
- Ordered proposed actions and the actual clamped execution.
- Daily metrics and reported token/call usage.
- Separate `author.interpretation` and `author.limitations`.

Raw provider responses, free-form model reasoning, local paths, environment
variables and credentials are not exported. Replay reconstructs observations and
metrics from settings and recorded decisions. It does not repeat LLM inference
or certify that a claimed model actually ran.

Inspect every repeat, then edit the two author fields. Explain observations,
alternative explanations, limitations and uncertainty. Label any manually added
AI-written commentary. Do not report a hypothesis as an observed result, choose
only favorable seeds, or treat synthetic outcomes as findings about real groups.

```sh
npm run experiment:check -- results/my-model-run.json
```

This checks the bundle and replays its metrics without calling a model.

## Share in KIBOU Lab

1. Inspect and validate the complete JSON; remove identifying or private content.
2. Copy only that bundle to `submissions/<settings.id>.json` on a Fork branch.
3. Open a PR explaining the question, provenance, observations and limitations.
4. Maintainers review privacy, rights, settings, replay and interpretation.
5. After acceptance, a Website maintainer imports reviewed data in a **separate
   Website PR**. Lab displays settings, metrics, interpretation and limitations.

The Website integration must be reviewed, merged and deployed separately before
results are visible there. Merging a Worlds result does not auto-publish it.
No contributed code or model API executes in the Website. Contributors do not
receive Website, database or production-secret access. External CI uses offline
fixtures, not paid model calls; review workflow changes before approving execution.

See [submissions](submissions/README.md) and [contributing](CONTRIBUTING.md).
Public Issues are suitable for fictional experiment ideas, not private data.

## Development and Checks

| Area | Files |
| --- | --- |
| Offline island | `src/simulation.ts`, `src/WorldsLab.tsx`, `src/WorldCanvas.tsx` |
| Resource CLI engine | `research/engine.mjs` |
| Social CLI engines | `research/social-engine.mjs`, `research/registry.mjs` |
| Configuration, export and replay | `research/protocol.mjs` |
| Local orchestration and adapters | `research/run.mjs`, `research/providers.mjs` |
| Starter settings | `experiments/` |
| Reviewed submission candidates | `submissions/` |
| Publication allowlist | `public-export.json` |

```sh
npm run check
npm audit --ignore-scripts --audit-level=moderate
```

Individual commands include `typecheck`, `test`, `test:research`,
`check:privacy`, `check:authors`, `experiment:check` and `build`.
Model-adapter tests use fake transports and do not require keys. Browser QA should
cover mobile portrait, keyboard, unavailable canvas, pause, reset and failed
exports. Always state which checks you actually performed in a PR.

When semantics change, version the engine and prompt. Website importers carry
review-time protocol copies: keep them aligned rather than silently reinterpreting
old bundles. Added source files require allowlist review; submission JSON also
requires separate replay and human privacy review.

## Privacy and Security

The browser has no background third-party requests, telemetry, WebRTC, location
access or persistence. The local CLI contacts a model provider only after explicit
consent. That provider sees synthetic observations and ordinary network metadata.

This project does **not** hide IP addresses from hosting providers, GitHub, ISPs
or a model provider you intentionally contact. It does not export them. Public
Issues, PRs and Git commit metadata are public; use your GitHub noreply author
email and public handle. Do not submit real names, contact details, private paths,
production logs or credentials. Pattern scans are tripwires, not proof of complete
anonymity. Human review remains necessary.

For private vulnerability reporting, see [SECURITY.md](SECURITY.md).
For deployment headers and limitations, see that same policy.

## Rights

Code: [MIT](LICENSE). Original fictional visual design: CC BY 4.0, described in
[ASSETS.md](ASSETS.md). KIBOU names and branding are not licensed as trademarks.
No production game artwork, user records or Website history is included.

## 日本語で始める

KIBOU Worldsは架空の小さな社会を使い、問いを検討する研究用プロトタイプです。
ブラウザの島と、ローカル実行する研究CLIは異なるエンジンです。

- 資源共有：共有、個人所有、最低保障を比較します。
- 住宅配分：抽選、必要度、入札による配分を比較します。
- 情報格差：全員が知る情報と、一部だけが知る情報・有料確認を比較します。
- 公共政策：無税、均等配当、対象を絞った保障を比較します。

初期設定は通信しないルール型です。Fork後にNode.js 22以上で依存関係を入れ、
上のCLIコマンドからひとつ選んで実験できます。モデルを使う場合は自分のAPIキーを
環境変数から渡し、正確なモデルIDと予算を設定してください。
`--allow-paid-api`がない場合はモデル呼び出しを拒否します。

設定、行動と指標を確認してから、観察・考察・限界を分けて記入します。
JSONだけをPRへ提出し、運営の確認後にWebsite側の別PRでLabへ掲載します。
実名、連絡先、認証情報、生のモデル応答は提出しないでください。
API費用が発生する場合があり、実験結果は現実社会の予測を意味しません。
研究エンジン・再現比較のローカルテストは架空のデータと模擬アダプターで確認しました。
実モデルAPI、ブラウザの実機受け入れ、本番公開は別途確認が必要です。

詳しくは[日本語開発ガイド](docs/DEVELOPMENT.ja.md)と
[社会実験の定義](docs/SOCIAL_EXPERIMENTS.md)をご覧ください。
