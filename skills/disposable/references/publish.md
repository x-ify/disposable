# Publish by pull request

The pull request body and, for an update, the diff are shown **at** the approval gate. The publish script runs only **after** a clear yes. Never overwrite another person's tool.

## Pull request body

Save it as `~/Disposable/<slug>.pr-body.md` (outside the tool folder). Fill the brackets only with what the person confirmed:

```markdown
Adds `tools/<slug>`: <one-line summary>

- Type: <recipe|program|skill>, use: <mode>, device: <device>
- How the maker uses it: <their words>
- License: <license>. The maker confirmed they have the right to share everything in this folder.
- Risk signals and why they are needed: <none, or each signal with the reason>
- Prepared with the Disposable skill; the maker read and approved every file.
```

## Commit name and email

Both are public in git history. Default to `--name` = the GitHub login and `--email` = GitHub's private address `<id>+<login>@users.noreply.github.com` (shown at https://github.com/settings/emails). Show the exact values at the approval gate; the script sets them only inside its own clone.

## Diff for an update (before approval)

Nothing public is created by this. Show the person the output:

```sh
set -euo pipefail
REPO="owner/name"; SLUG="tool-slug"; FOLDER="$HOME/Disposable/tools/tool-slug"
PEEK="$(mktemp -d)"; gh repo clone "$REPO" "$PEEK/upstream" -- --depth 1
diff -ru "$PEEK/upstream/tools/$SLUG" "$FOLDER" || true
```

An update also needs the signed-in login in that folder's `maintainers`; if it is not there, say the change needs approval from one of its maintainers or the Disposable team before going further.

## Run the publish script (after approval)

Run it once, with absolute paths, because agent shells often reset between calls. `--mode` is `add` for a new tool or `update`; the other values are the ones the person approved:

```sh
bash <skill-dir>/scripts/publish.sh --mode add --repo owner/name --slug tool-slug --title "Tool title" \
  --folder "$HOME/Disposable/tools/tool-slug" --body "$HOME/Disposable/tool-slug.pr-body.md" \
  --name login --email 12345+login@users.noreply.github.com
```

It forks `<repo>` to the signed-in account (or reuses the fork), builds the branch `<mode>-<slug>` from the upstream default branch, replaces `tools/<slug>/` with the folder (dotfiles such as `.DS_Store` are left out), commits with the given name and email, pushes the branch to the fork, opens the pull request, and prints its link.

- Exit 2: an option is missing or invalid, or `git`/`gh` is missing. Nothing was created; fix the value and rerun.
- `tools/<slug> already exists` (for `add`): choose another slug with the person. That changes the content, so show it again for approval.
- Rerunning after a failure is safe: the branch is rebuilt from the upstream default branch, pushed again, and an existing pull request is reused.
- `--force-with-lease` only replaces this tool's own branch on the person's fork, never the upstream repository.

## After opening

- `gh pr view --web` opens the pull request for the person.
- `gh pr checks` lists the automatic checks; for a first-time contributor they may wait for the Disposable team to approve running them.
- Merging is done by the Disposable team. Do not ask for faster review and do not promise a review time.
