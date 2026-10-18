# OpenAI API key connectivity preflight

Only in the isolated RuFlo lab, an OpenAI key is read from the GitHub Actions repository secret named OPENAI_API_KEY.
The key is passed directly to the official https://api.openai.com/v1/models/gpt-4.1-mini HTTPS metadata endpoint.
No completions, generation, customer code, real database, deployments, PR merges or secret printing.

Important: RuFlo three-agent registration is not native OpenAI-powered multi-agent execution.
Upstream RuFlo documents Codex CLI as a separate model execution pathway.
Do not assume the native agent_execute tool accepts OPENAI_API_KEY alone.
Run Codex compatibility and actual handoffs in another bounded test stage only after this succeeds.
This PR remains Draft and no Production access is granted.