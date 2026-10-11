# Experiment 001: Resource Ownership

Engine `rules-v1` is a deterministic toy model, not an LLM-based simulation.
Choose an unsigned 32-bit seed; default 42. Twelve steps make one day; the run
ends after 100 days. Processing order is shuffled by a seeded generator.

Twelve fictional agents collect 1, 2 or 3 resource units per trip between grove,
commons and home. The grove starts with 40, grows 2 per step and is capped at 60.
Drought stops replenishment on days 8 through 19. Everyone begins with 2 private
units and access to a shared starting fund of 12. Each consumes 1 unit daily,
first from their reserve, then the fund. Shared rules deposit harvests in the
fund; private rules deposit harvests in the collector's reserve.

## Metrics

- Needs met: agents fed at the latest daily consumption, not cumulative welfare.
  Initial values describe starting availability rather than an observed day.
- Stored provisions: private reserves plus the fund, excluding cargo and grove.
- Inequality: Gini coefficient of private reserves plus an equal share of the fund.
  This is not income, fairness, personal merit or an inference about real people.

## Reproduce a Branch

Record seed, scenario, starting rule, fork tick and engine version. Recreate the
initial world and advance to that tick. Fork copies the complete state, including
generator state, and changes ownership only. Advance both by the same number of
steps. JSON export contains complete snapshots and bounded daily history.
There is no JSON import yet; exports are records, not a promised restore format.

Do not draw general social conclusions from this model. Future research requires
explicit questions, sensitivity analysis, alternative models, uncertainty and
independent validation. Keep synthetic baselines when exploring model adapters.
