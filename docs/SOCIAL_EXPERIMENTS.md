# Social Experiment Protocols

All settings describe fictional agents and abstract units, not people, housing
markets or public budgets. Defaults use the deterministic baseline, not a model.
This implementation has not been simulated or tested for the current update.
The hypotheses below are questions to investigate, not recorded findings.

## Shared Method

Each run has 2–12 agents, 1–100 days and 1–5 repeats. Repeat seed is base seed
plus repeat index, wrapped to an unsigned 32-bit integer. A seeded shuffle sets
daily turn order and tie-breaking. Every agent proposes exactly one bounded action
per day. The engine clamps execution to available holdings. Record both proposal
and actual execution: an executed amount of zero can mean resources were unavailable.
Only settings and recorded actions reproduce the metrics; LLM inference is not
guaranteed to reproduce. A single fixed prompt is recorded for each engine version.

Run multiple seeds, compare the same seeds across rules and providers, and report
all repeats rather than only favorable ones. Rules can affect later model choices;
an observed difference is not automatically a real-world causal effect. There is
no inferential statistics package or external validation in this prototype.

## Housing Allocation

- File: `experiments/housing-allocation.json`; kind: `housing`.
- Engine: `housing-allocation-v1`.
- Rules: `lottery`, `need-priority`, `bid-priority`.
- Actions: `apply` with a bid of 1–3; `wait` with amount 0.

Each agent begins with two budget units and receives two more daily. Daily rental
capacity is floor(population / 2), at least one. Drought removes one slot on days
8–19, without reducing capacity below one. Rentals expire each day. Applications
are capped by the applicant's current budget. All applications are collected before
allocation; proposing early does not decide the winner independently of the rule.

Lottery uses the day's shuffled order. Need priority sorts by consecutive unhoused
days, then a synthetic need level (1–3 assigned cyclically by fictional agent ID).
Bid priority sorts by submitted bid. Ties use the same shuffled order. Lottery
and need-priority winners pay one; bid-priority winners pay their bid. Everyone
then spends one on living if they have a budget unit remaining.

**Observations:** own budget, own need level, own consecutive unhoused days,
previous housing outcome, capacity, rule and recent executed applications. Other
agents' budgets, needs and bids are not visible before allocation.

**Daily metrics:** `met` and `housed` both count housed agents; `waiting` counts
unhoused agents; `rentPaid` is total rent. `reserves` sums remaining private budgets;
`inequality` is Gini of those budgets, not a housing fairness index. Need priority
is not a recommendation to classify real students. This experiment does not model
leases, household size, construction, landlords, consent or discrimination.

## Information Asymmetry

- File: `experiments/information-asymmetry.json`; kind: `information`.
- Engine: `information-asymmetry-v1`.
- Rules: `transparent`, `private-signals`; scenario must be `steady`.
- Actions: `inspect` or `buy`, each amount 1; `wait`, amount 0.

Each agent begins with two units and receives two daily. A synthetic good costs
two units and yields either one or four budget-equivalent units, with seeded equal
probability. Quality is constant for each three-day batch, then drawn again.
Buying adds quality minus price to the agent's reserve. Inspection costs one unit
and consumes that day's action, so the agent cannot inspect and buy on the same day.

Transparent rules reveal current quality to all agents. Under private signals,
even-numbered agents know quality; the others must inspect or learn after a purchase.
Learned signals persist only within the current batch. New batches clear them.
There is no intentional misinformation or LLM access to hidden quality. Everyone
then consumes one reserve unit if available. All signals refer only to a fictional
good; no web search, real company profiles or private messages are involved.

**Daily metrics:** needs met, remaining private reserves and Gini, plus inspections,
trades and `netBenefit` (sum of realized quality minus purchase price and inspection
costs that day; excludes daily grants and consumption). This is an abstract payoff
model, not conserved cash or a calibrated market. The informed group is a synthetic
ID partition, not a demographic group. No seller strategy, fraud or real prices
are modeled. Inspecting on a batch's last day has no later purchasing benefit.

## Public Policy

- File: `experiments/public-policy.json`; kind: `policy`.
- Engine: `public-policy-v1`.
- Rules: `no-tax`, `flat-tax`, `safety-net`.
- Actions: `work` or `contribute`, amount 1–3; `wait`, amount 0.

Agents start with two reserve units, with productivity 1–3 assigned cyclically.
There is no daily grant. Work is capped by productivity. On drought days 8–19,
effective productivity falls by one, to a minimum of zero. Contributions move
existing private reserves to the public fund and replace that day's work action.

No-tax keeps all earnings; voluntary contributions remain in the fund, with no
automatic distribution under that rule. The other policies tax half of each day's
work earnings, rounded down, before transferring benefits. Flat-tax distributes
floor(public fund / population) units to each agent, retaining any remainder.
Safety-net gives up to one unit to each agent with no private reserve, in shuffled
order, only while the public fund has resources. Transfers never create resources.
All agents then consume one private unit if available. Remaining public funds are
not automatically available for consumption.

**Daily metrics:** needs met, private reserves and private-reserve Gini, plus taxes
collected, transfers and remaining public fund. Private inequality excludes the
public fund, unlike the resource-sharing engine's equal-share Gini. Small integer
rounding materially affects these results. This is not a model of real tax law,
public debt, inflation, administrative costs, elections or labor-market incentives.

## Compatibility and Review

Resource-sharing remains `resource-society-v1`; old settings without `experiment`
continue to mean resource sharing. Each new kind has its own engine/prompt ID,
permitted rules and actions. Unknown kinds, mismatched actions, edited metrics
and mismatched engine/prompt versions are rejected by replay validation.

Website maintainers must update the review-time engine/registry/protocol copies
before importing a new kind. Keep kind-specific metrics and definitions visible;
never label housing coverage as food needs or compare unlike Gini definitions.
Use a separate Website PR. Contribution to Worlds does not grant Website access.

## 日本語

住宅配分、情報格差、公共政策の3つの架空実験を追加しました。設定はすべて
通信しないルール型が初期値です。住宅では抽選・必要度・入札、情報では公開情報と
一部だけが知る情報、政策では無税・均等配当・最低保障を比較します。
指標の意味は実験ごとに異なります。住宅の`met`は住居を得た人数であり、食料の
充足ではありません。政策のジニ係数は公共基金を含みません。
実在の人や地域に適用できる結論ではなく、仮説を検討する小さなモデルです。
結果と考察、限界を分け、全反復を確認してからJSONをPRへ提出してください。
