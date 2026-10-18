# RuFlo-tracked three-role OpenAI pilot

This proof of concept uses the existing OpenAI API secret to drive exactly three synthetic, small model replies.
RuFlo owns real swarm and agent records plus task creation, assignment, completion and read-back.
The harness executes all OpenAI calls and relays prompts in order; it is NOT native RuFlo agent_execute,
nor three autonomous agent subprocesses. The model outputs are sent to task_complete and subsequently
verified byte-for-byte using task_status. No real code repository is used, only an artificial average function.

Every model call uses gpt-4.1-mini, input under 1500 characters, at most 160 output tokens,
and a strict maximum of three attempts without retries. An explicit commit-message marker is required
to enable the paid job. Token usage is not a verified invoice.

No GitHub write rights, no persistent checkout authentication, no production, database or customer data.
The OpenAI key is scoped to one step, and the RuFlo subprocess receives an explicit scrubbed environment.
Do not merge this Draft PR or claim native autonomous multi-agent execution based on this test.