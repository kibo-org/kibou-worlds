# Local Agent Experiments

Housing, information asymmetry and public policy are now separate versioned
engines alongside resource sharing. See [Social Experiments](SOCIAL_EXPERIMENTS.md)
for their rules, actions, observations and metric definitions. The sections below
describe the resource-sharing starter unless stated otherwise; budgets, privacy,
result review and submission procedures are shared by all experiment kinds.

## Scope

The existing browser island uses `rules-v1`. The research CLI uses the separate,
versioned `resource-society-v1` day-based engine: one action per agent per day,
limited self-observation and three-action memory. Do not compare the two engines
as if only the model changed. The CLI compares shared ownership, private reserves
and a daily redistribution rule guaranteeing access only when resources exist.

Gathering is capped by productivity and remaining supply. Sharing is capped by
actual reserves. Each agent consumes one unit per day, using private then shared
holdings. Seeded order determines contention. Drought pauses growth on days 8–19.
Needs met is a daily count. Reserves exclude unharvested supply. Gini includes an
equal share of the common fund; it is not a measure of fairness or human merit.

## First Run (Offline Rules)

After Fork and dependency installation, these are instructions for a future run:

```sh
npm run experiment -- experiments/resource-sharing.json results/resource-sharing.json
npm run experiment:check -- results/resource-sharing.json
```

The output is created with owner-only permissions and never overwrites an earlier
file. A failed run may leave an empty reserved output file: choose a fresh name.
Private output lives under ignored `results/`. Nothing is uploaded automatically.

## GPT or Claude

Copy the settings to `results/my-settings.json` (ignored by Git); change `id` for each submission, set `provider`
to `openai` or `anthropic`, and `model` to an exact model identifier you can access.
Use an exact snapshot, not an alias: mismatched resolved model IDs stop the run
(the request can still be billable). Begin with two days, three agents and one
repeat before attempting a larger experiment. Keep an offline baseline with the
same settings and seeds. Obtain API credentials from the provider, not a
ChatGPT/Claude web subscription. Supply `OPENAI_API_KEY` or
`ANTHROPIC_API_KEY` in your terminal environment using your own secret manager.
Never paste keys into settings, prompts, Issues, PRs, shell history or the browser.

```sh
npm run experiment -- results/my-settings.json results/my-run.json --allow-paid-api
```

Without the explicit flag the CLI refuses model calls. Browser UI and CI never
invoke these adapters. Fixed HTTPS endpoints reject redirects and have bounded
responses and total request deadlines. No tools, plugins, arbitrary code or URL
overrides are supported. Failed/invalid/refused model actions stop the run; there
are no automatic paid retries or silent deterministic substitutions.

Budgets cap calls, output tokens, total reported tokens and wall-clock time.
Before each model call a conservative 16384-input-token reserve plus maximum
output must fit. This can stop a run early; raise the configured budget consciously.
Budgets are not a dollar-price guarantee: configure a provider-side spending limit
as well. A cancelled/timed-out call may still be billed by the provider. The provider
sees synthetic observations and the caller's normal network address; this is not
an anonymous networking service. Model usage is self-reported in a submitted file.

The API adapters follow [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
and [Anthropic Messages](https://platform.claude.com/docs/en/api/messages/create).
Availability and structured-output support depend on your chosen model.

## Reproduction and Interpretation

Each bundle records complete settings, system prompt/version, all ordered
proposals, clamped executed actions, per-day metrics and token/call usage. Repeat
seeds are base seed plus repeat index. Rules replay exactly; LLM inference need
not. Replay validates internal consistency, not whether the model really ran.

The limited-memory observation can be reconstructed from settings and preceding
actions. Raw provider responses, free-form reasoning, request IDs, timestamps,
local paths, credentials and environment variables are never exported.

Read all repeated runs, then edit only `author.interpretation` and
`author.limitations` in the JSON. Separate observations from your interpretation;
state alternative explanations, sample size and uncertainty. Never treat a toy
experiment as evidence about real populations. AI-written commentary, if added
manually, must be identified as such in the interpretation.

## Submit and Publish

1. Check the bundle locally, then inspect it manually for personal information.
2. Copy it to `submissions/<settings.id>.json` on your Fork branch.
3. Open a PR with question, settings, model provenance and limitations. External
   CI uses fake adapters only; maintainers must review workflow/code changes first.
4. A maintainer reviews privacy, rights, assumptions and replayed metrics before
   merging. Automated pattern checks do not replace this review.
5. A Website maintainer imports the reviewed bundle with its upstream PR URL and
   reviewer handle into the Website's static catalog and opens a separate PR.
   Lab publishes only the reviewed settings/metrics/interpretation, not executable
   code, raw dialogues or credentials. Website deployment remains a separate gate.

## 日本語

Forkしたリポジトリで架空の実験設定を作り、自分のAPIキーを環境変数で渡して
ローカル実行します。API呼び出しには明示的な許可フラグが必要です。
最初は通信しないルール型で設定を確認してください。結果の設定、行動、指標を
確認し、考察と限界を書いてPRを提出します。APIキーや実在する人の情報、
生のモデル応答は公開しないでください。運営の確認後にWebsiteへ別PRで掲載し、
人間社会の予測とは区別します。API利用には別料金がかかる場合があります。
