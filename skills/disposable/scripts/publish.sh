#!/usr/bin/env bash
# Opens or updates a Disposable pull request from a prepared tool folder, then prints its link.
# Run it only after the person approved the exact content (SKILL.md, Boundary 1), as one call with absolute paths.
#   bash publish.sh --mode add|update --repo owner/name --slug <slug> --title <title> \
#     --folder <tool folder> --body <pull request body file> --name <commit name> --email <commit email>
# Exit 2: a missing or invalid option or command; nothing was created. Exit 1: GitHub or git refused a step.
# Rerunning is safe: the branch is rebuilt from the upstream default branch and an open pull request is reused.
set -euo pipefail

usage() {
  echo "Usage: bash publish.sh --mode add|update --repo owner/name --slug <slug> --title <title> --folder <path> --body <path> --name <name> --email <email>" >&2
  exit 2
}
MODE='' REPO='' SLUG='' TITLE='' FOLDER='' BODY='' NAME='' EMAIL=''
while [ $# -gt 0 ]; do
  case "$1" in
    --mode|--repo|--slug|--title|--folder|--body|--name|--email) [ $# -ge 2 ] || usage ;;
    *) echo "Unknown option: $1" >&2; usage ;;
  esac
  case "$1" in
    --mode) MODE="$2" ;; --repo) REPO="$2" ;; --slug) SLUG="$2" ;; --title) TITLE="$2" ;;
    --folder) FOLDER="$2" ;; --body) BODY="$2" ;; --name) NAME="$2" ;; --email) EMAIL="$2" ;;
  esac
  shift 2
done
for option in mode repo slug title folder body name email; do
  variable="$(echo "$option" | tr '[:lower:]' '[:upper:]')"
  [ -n "${!variable}" ] || { echo "Missing --$option" >&2; usage; }
done
case "$MODE" in add) VERB=Add ;; update) VERB=Update ;; *) echo "--mode must be add or update, not: $MODE" >&2; exit 2 ;; esac
[[ "$REPO" =~ ^[A-Za-z0-9-]+/[A-Za-z0-9._-]+$ ]] || { echo "--repo must be owner/name, not: $REPO" >&2; exit 2; }
# Same rule as the checker's folder name: lowercase letters, digits and single hyphens, 60 characters max.
[[ "$SLUG" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] && [ "${#SLUG}" -le 60 ] || { echo "--slug must be lowercase letters, digits and single hyphens (60 characters max), not: $SLUG" >&2; exit 2; }
[ -f "$FOLDER/DISPOSABLE.md" ] || { echo "--folder must be the tool folder containing DISPOSABLE.md: $FOLDER" >&2; exit 2; }
[ -f "$BODY" ] || { echo "--body file not found: $BODY" >&2; exit 2; }
for cmd in git gh; do command -v "$cmd" >/dev/null || { echo "$cmd is not installed" >&2; exit 2; }; done
FOLDER="$(cd "$FOLDER" && pwd)"
BODY="$(cd "$(dirname "$BODY")" && pwd)/$(basename "$BODY")"

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
# Dotfiles (.DS_Store and similar) are never shown at the approval gate or read by the checker, so they never ship.
find "tools/$SLUG" -mindepth 1 -name '.*' -prune -exec rm -rf {} +
git add -A "tools/$SLUG"
git commit -m "$VERB $SLUG: $TITLE"
git push --force-with-lease -u origin "$BRANCH"   # the branch belongs to this tool; reruns replace it
PR="$(gh pr list --repo "$REPO" --head "$BRANCH" --author "$LOGIN" --state open --json url --jq '.[0].url // empty')"
[ -n "$PR" ] || PR="$(gh pr create --repo "$REPO" --head "$LOGIN:$BRANCH" --title "$VERB $SLUG: $TITLE" --body-file "$BODY")"
echo "$PR"
