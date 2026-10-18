# OpenAI three-role relay — tightly bounded experiment

Runs exactly three OpenAI model calls (gpt-4.1-mini) on a synthetic average() bug.
Researcher identifies one problem, Coder proposes a fix, Tester names test cases.
Each output passes sequentially to the next role and is checked for an expected prefix.
Each completion is limited to 140 output tokens, each prompt is length-bounded,
and no retries are performed. Usage metrics come from the provider response.

RuFlo 3.56.10 separately initializes a swarm and registers three matching idle
roles in the *same isolated runner*. The test script (NOT RuFlo agent_execute)
performs the OpenAI API calls and handoffs. Thus this is not yet proof of
RuFlo-native AI execution, agent messaging, autonomous code repair or Codex integration.

No real repositories, payment data, Production tokens, customer records, PR merges,
push rights or app deployments are exposed. The key is present only in the API
test step and never printed. The whole runner is thrown away afterwards.

This proof-of-concept is intentionally very cheap but GitHub cannot enforce an
exact OpenAI dollar budget: a provider-side project spending limit is still advised.