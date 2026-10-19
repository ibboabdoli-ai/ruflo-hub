# RuFlo three-role coordination and OpenAI tracked pilot — 2026-10-18

## Scope
- Public hub test branch only: work/ruflo-three-agent-lab-20261018; Draft PR #1.
- RuFlo 3.56.10 and OpenAI gpt-4.1-mini in an isolated GitHub Actions runner.
- Only synthetic average([]) JavaScript. No customer data, receipts, Proffera source, production or GitHub write scope.

## Contract discovery — PASS with no model key
- [Run 39170164733](https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39170164733): 358 MCP tools discovered.
- Tools swarm_init, agent_spawn, agent_execute, task_create, task_assign, task_status, task_complete and coordination_orchestrate exist.
- Deprecated/stale task_orchestrate is **not** present.
- The advertised native agent_execute requires an independent compatible provider. Without Anthropic, OpenRouter or Ollama keys, it returns a no-provider failure, even though the OpenAI key exists for the separate harness.

## Native RuFlo task lifecycle — PASS without an API key
- [Run 39170382379](https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39170382379): swarm initialized, three distinct roles registered, three tasks created/assigned and re-read as in_progress.
- Coordination_orchestrate returned **scheduled**, not model execution. No completed autonomous task was inferred.
- [Run 39170621429](https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39170621429): each task_complete persisted and task_status independently returned completed for three synthetic offline completion markers.

## Three real OpenAI responses persisted as RuFlo tasks — PASS (HYBRID)
- Initial bounded run 39170896046: Researcher model output successfully saved in RuFlo, but Coder response failed the strict output-format gate and job stopped. Tester was not executed. No hidden retries were made.
- [Successful run 39171029168](https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39171029168): **Researcher -> Coder -> Tester** produced three OpenAI model responses for one artificial code sample.
- Each response was saved with native MCP task_complete, then task_status returned completed and an exact match to that model response. Three out of three independently verified.
- The successful run recorded **303 input tokens and 95 output tokens** across **three** OpenAI API calls; these are usage readings, not a verified invoice. First failed run had its own token usage not included in these totals.
- Historical harness safeguards were at most three provider requests per run, small input and 240 output tokens per request, without retries. **As of 2026-10-19 the commit-marker paid workflow has been disabled**; only offline CI remains, pending independent owner-controlled secret and spend protection.

## Precise architecture boundary
- **RuFlo actually performs:** task registration/assignment/state transitions/result persistence, agent-role tracking and swarm bookkeeping.
- **External test harness actually performs:** OpenAI API generation and ordered handoffs. This is not independent autonomous workers, RuFlo-native agent_execute, nor a claim that coordination_orchestrate runs the models.
- **Codex MCP capability separately proven:** one completed read-only RuFlo agent-count call in [run 39169213646](https://github.com/ibboabdoli-ai/ruflo-hub/actions/runs/39169213646). It was not used to orchestrate these three responses.

## Next decision
With only an OpenAI API key, the verified deliverable is hybrid RuFlo task tracking and external OpenAI execution. To test genuine RuFlo-native agent_execute, an independent approved provider integration/credential is needed, subject to separate owner authorization. Do not silently substitute the harness result for a native multi-agent run.

## Controls
- No code changes outside the lab branch and no merge, push from GitHub Actions, deploy or production contact.
- Historical live run: the RuFlo child process received a credential-free environment and the key was available to the bounded model step. Current PR workflows have **no API secret step**.
- One-time disposable filesystem, synthetic fixtures, no persistent autonomous service, and no further paid runs scheduled.
- Keep PR as Draft pending security review and explicit merge authorization.