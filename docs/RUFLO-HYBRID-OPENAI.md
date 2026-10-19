# RuFlo + OpenAI synthetic hybrid — audited status (2026-10-19)

**No paid runs are currently enabled in this Draft PR.** The historical live
fixture [run 39171029168](https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39171029168)
successfully passed three scripted OpenAI responses through RuFlo task records.
That proves sequential **hybrid** model execution and RuFlo result persistence,
not native autonomous RuFlo agents and not the latest refactored code.

The only retained runtime fixture is synthetic `average([])`. No project source,
real customer data, PR writes, Production access or provider credentials are
passed to RuFlo. `lib/hybrid-openai.mjs` bounds the historical adapter to
three attempted requests, 1500-character prompts, 240 output tokens each,
1500-character replies and a 25-second request timeout. It requires exact
Researcher → Coder → Tester order and fails closed on malformed role outputs.

`.github/workflows/ruflo-tracked-openai-relay.yml` is now **offline-only**:
it validates policies, tests the adapter and checks tracked/untracked checkout
changes. It no longer contains an OpenAI API-secret step or a commit-message
paid-run override. The synthetic relay source remains as an uninvoked fixture.

See [paid pilot owner-approval gate](PAID-PILOT-APPROVAL.md). Do not reenable
model calls until the repository-level secret is removed/rotated, an independently
protected GitHub Environment exists, hard provider-level budget enforcement is
verified and the owner explicitly approves the exact tested source.
PR #1 stays Draft; do not merge or connect Proffera.
