# Reproduce an Experiment Without Changing Code

Reproduction, counterexamples and careful explanations are contributions. You do
not need to edit the engine. Work only with fictional data. Nothing below uploads
results, connects to the production Website or grants access to member data.

## 1. Choose an Original

Open a reviewed experiment in KIBOU Lab. Record its digest and open its submission
link to obtain the reviewed `submissions/<id>.json` bundle. Check its rights and
limitations. Download the reproduction settings from Lab, or copy the original
bundle's `settings` object. Use the reviewed bundle, not a screenshot of its table.

Create a private, ignored output directory:

```sh
mkdir -p results
chmod 700 results
```

Save the original as `results/original.json` and the downloaded settings as
`results/replica-settings.json`. Give each submission a new, non-identifying
`id`; do not include your email, school, location or local file paths.

## 2. Choose Replay or a Fresh Run

Replay only checks that recorded actions produce the reported numbers. It makes
no model calls, including when the bundle reports GPT or Claude use:

```sh
npm run experiment:check -- results/original.json
```

A fresh deterministic run requires the original settings to use `provider: rules`:

```sh
npm run experiment -- results/replica-settings.json results/replica.json
```

For a model-based original, keep its exact provider, model and budgets. A fresh
run needs your own API key and the explicit `--allow-paid-api` flag. It may cost
money and the provider sees your normal network address. Do not run it when you
need an offline/private-network experiment. Never put a key in a JSON file or PR.
Replaying recorded actions does not prove the model was used, and rerunning the
same model/settings may produce different decisions.

Changing `provider` to `rules` is a useful new baseline, but is not a reproduction
of the original model experiment. Submit it separately instead of claiming a match.

## 3. Compare the Records

Keep every setting unchanged except `id`. To examine new randomness, you may
change the base `seed`; all other settings must stay identical. The checker
distinguishes same-settings runs from new-seed extensions and does not invent
paired deltas for different seeds.

Edit only `author.interpretation` and `author.limitations` in the resulting bundle.
Then compare it with the original:

```sh
npm run reproduce:check -- results/original.json results/replica.json results/comparison.json
```

The command replays both bundles, checks assumptions, records both digests and
reports same-seed action/metric agreement and final differences. It never calls
a model. It refuses an existing output filename. Agreement does not establish
a scientific finding; disagreement is not automatically a bug or a counterexample.

## 4. Explain and Submit

If Fork/PR is unfamiliar, start with the repository's **Reproduction or
counterexample** Issue form. Share only the public digest and non-identifying
observations. An Issue is a discussion, not an accepted result or automatic Lab
publication. A maintainer can guide you through submitting the checked bundle.

Copy only the checked candidate bundle into `submissions/<new-id>.json` on your
Fork. Include the original digest, submission link and comparison summary in the
PR. State whether this is replay, a fresh same-settings run, or new seeds.

Answer these questions in your own words:

- What did you expect, and what did each repeated run actually show?
- Does the same-seed comparison agree? Which metric or day differs?
- Is the difference plausibly due to seed, model variation or changed assumptions?
- Does it challenge the original explanation, or merely illustrate its limits?

Do not upload credentials, raw provider dialogue, hidden reasoning, personal
information or your entire `results/` directory. The comparison report is a local
helper, not a new accepted submission format. Maintainers validate the bundles
and manually review privacy and interpretation before publishing anything.

## 日本語

Labのレビュー済み実験から設定を取得し、`id`だけ変えて実行できます。
コード変更は不要です。記録済みの再生はAPIを呼びません。新しいモデル実行は
自分のキー・明示的な許可・料金が必要で、通信先にネットワークアドレスが伝わります。
同じ条件でもモデルの選択は一致するとは限りません。新しいシードを試した場合は
同一シードの再現と区別します。元のダイジェスト、観察、反例や限界の説明をPRに
添えてください。隠れた推論、生の対話、個人情報は提出しないでください。
