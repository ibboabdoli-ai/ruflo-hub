# RuFlo Hub Public Read-Only Dashboard

Open `dashboard/index.html` in a browser, or use a static hosting service after security review and publication approval. No build, package install, API token, persistent server, or subscription is needed.

This is a static Persian UI. It reads exactly two public PRs from GitHub REST: `ibboabdoli-ai/ruflo-hub#4` and `ibboabdoli-ai/Proffera#941`, plus the public `profiles/proffera.json` file on main. It shows the PR state and exact-head check-run data, refusing to display mismatched or truncated results. When GitHub rate limits an anonymous request, the UI shows an unknown or incomplete state rather than claiming success.

**No live RuFlo agents or Proffera Supervisor connection.** The dashboard has no write operations, credentials, GitHub write scopes, paid model execution, webhooks, merge controls, deployment actions, or arbitrary repository search.

Review notes:
- No remote script, stylesheet, or analytics.
- Strict content security policy blocks inline JS and off-allowlist origins.
- Uses `textContent` and DOM nodes rather than `innerHTML` for remote strings.
- The HTML can be hosted under `/dashboard/`; it cannot itself switch on GitHub Pages.
- Static UI is **not** a security enforcement boundary around other services.

To test locally: `node --test tests/dashboard-static.test.mjs`.


## GitHub Pages publication (owner-controlled)

This repo does not permit this UI to merge code, read private files, run workers,
or access Proffera's Supervisor. **Only the static `dashboard/` folder** is deployed.

After this PR is reviewed and merged, the repository owner needs to open:
`https://github.com/ibboabdoli-ai/ruflo-hub/settings/pages`.
Under **Build and deployment → Source**, select **GitHub Actions**.
The connected GitHub read/write connector cannot perform this administrative
Pages setting. Do **not** create a privileged token as a workaround.

Then visit:
`https://github.com/ibboabdoli-ai/ruflo-hub/actions/workflows/dashboard-pages.yml`,
choose **Run workflow** on **main**, and verify the hosted job reports success.
The expected project URL is
`https://ibboabdoli-ai.github.io/ruflo-hub/` **only after a successful Pages deployment**.
Do not claim it exists before verifying an actual deployment/URL.

The workflow is intentionally manual-only and runs only from main in the exact
allowed public repository. It uploads only static local HTML, JS and CSS files,
with no tokens supplied by the operator. Its short-lived `pages:write` and
`id-token:write` job permissions exist solely for the GitHub Pages deployment.
