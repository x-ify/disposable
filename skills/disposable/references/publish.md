# Publish by pull request

The pull request body and, for an update, the diff are shown **at** the approval gate. The publish script runs only **after** a clear yes. Agent shells often reset between calls, so run the script as one call with absolute paths. Never overwrite another person's tool.

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

Both are public in git history. Default to `NAME` = the GitHub login and `EMAIL` = GitHub's private address `<id>+<login>@users.noreply.github.com` (shown at https://github.com/settings/emails). Show the exact values at the approval gate; the script sets them only inside its own clone.

## Diff for an update (before approval)

Nothing public is created by this. Show the person the output:

```sh
set -euo pipefail
REPO="owner/name"; SLUG="tool-slug"; FOLDER="$HOME/Disposable/tools/tool-slug"
PEEK="$(mktemp -d)"; gh repo clone "$REPO" "$PEEK/upstream" -- --depth 1
diff -ru "$PEEK/upstream/tools/$SLUG" "$FOLDER" || true
```

An update also needs the signed-in login in that folder's `maintainers`; if it is not there, say the change needs a maintainer's approval before going further.

## Publish script (after approval)

Set the values, then run it as one call. `MODE` is `add` for a new tool or `update`.

```sh
set -euo pipefail
MODE="add"; REPO="owner/name"; SLUG="tool-slug"; TITLE="Tool title"
FOLDER="$HOME/Disposable/tools/tool-slug"; BODY="$HOME/Disposable/tool-slug.pr-body.md"
NAME="login"; EMAIL="12345+login@users.noreply.github.com"
LOGIN="$(gh api user --jq .login)"; BRANCH="$MODE-$SLUG"
gh auth setup-git
gh repo fork "$REPO" --clone=false --default-branch-only || true   # no-op when the fork exists
FORK="$(gh api "repos/$REPO/forks?per_page=100" --paginate --jq ".[] | select(.owner.login==\"$LOGIN\") | .full_name" | head -1)"
[ -n "$FORK" ] || { echo "Could not find $LOGIN's fork of $REPO" >&2; exit 1; }
WORK="$(mktemp -d)"; gh repo clone "$FORK" "$WORK/fork"   # adds the parent as the "upstream" remote
cd "$WORK/fork"
git config user.name "$NAME"; git config user.email "$EMAIL"
git fetch upstream && git remote set-head upstream --auto
if [ "$MODE" = add ] && git cat-file -e "upstream/HEAD:tools/$SLUG" 2>/dev/null; then echo "tools/$SLUG already exists; choose another slug" >&2; exit 1; fi
git switch -C "$BRANCH" upstream/HEAD
rm -rf "tools/$SLUG" && mkdir -p "tools/$SLUG" && cp -R "$FOLDER/." "tools/$SLUG/"   # an update can also remove files
git add -A "tools/$SLUG"
git commit -m "$( [ "$MODE" = add ] && echo Add || echo Update ) $SLUG: $TITLE"
git push --force-with-lease -u origin "$BRANCH"   # the branch belongs to this tool; reruns replace it
PR="$(gh pr list --repo "$REPO" --head "$BRANCH" --author "$LOGIN" --state open --json url --jq '.[0].url // empty')"
[ -n "$PR" ] || PR="$(gh pr create --repo "$REPO" --head "$LOGIN:$BRANCH" --title "$( [ "$MODE" = add ] && echo Add || echo Update ) $SLUG: $TITLE" --body-file "$BODY")"
echo "$PR"
```

- Rerunning after a failure is safe: the branch is rebuilt from `upstream/HEAD`, pushed again, and an existing pull request is reused.
- `--force-with-lease` only replaces this tool's own branch on the person's fork, never the upstream repository.

## After opening

- `gh pr view --web` opens the pull request for the person.
- `gh pr checks` lists the automatic checks; for a first-time contributor they may wait for a maintainer to approve running them.
- Merging is done by the Disposable team. Do not ask for faster review and do not promise a review time.
