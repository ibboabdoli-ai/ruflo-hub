# Three-agent RuFlo pilot — safe first stage

This experiment runs a pinned version of RuFlo in a GitHub-hosted **disposable** runner with an empty provider credential environment.

It attempts:
1. \`ruflo init\` inside a temporary workspace.
2. \`ruflo swarm init --topology hierarchical --max-agents 3 --strategy specialized\`.
3. \`ruflo agent spawn\` for researcher, coder and tester.
4. \`ruflo agent list\` to check registry visibility.

Pass means only **agent registration and CLI coordination scaffolding** works. It is **not** proof of three LLM-backed autonomous workers, actual task execution, agent-to-agent messages, code changes, prompt costs or real security validation.

The repository profile \`profiles/ibbo-receipt-ai.json\` remains disconnected and read-only. No source checkout of Receipt AI, no API tokens, Vercel/Production access, merge rights, deployment or customer data.

The **next** experiment, only after the owner supplies a restricted provider key through a private GitHub Actions secret, should use a tiny public fixture and verify independent reviewer/developer/tester transcripts and a bounded cost. Do not use any Production API tokens.

The current hub is a configuration skeleton, not a running controller. Do not merge this draft until pilot results are reviewed.
