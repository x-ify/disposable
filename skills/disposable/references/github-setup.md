# Getting ready for GitHub

Use this when `gh --version` or `gh auth status` fails. Go one step at a time, wait for the person to say a step is done, and keep the tone friendly. Their prepared tool folder stays safe on their computer while they do this.

## 1. Say why, in two sentences

"Disposable keeps every tool in a public GitHub project, so your GitHub account shows that you made it and lets only you change it later. Creating an account is free and takes a few minutes."

Then ask their age bracket only as needed: GitHub accounts require age 13 or older. If they are younger, stop the share path kindly and offer to keep the folder for later.

## 2. Create the account (the person does this)

- Open https://github.com/signup for them, or give them the link.
- They choose the username, email and password themselves. Mention that the username is public and appears next to their tool.
- They enter the email code GitHub sends. If GitHub asks to set up two-factor authentication, encourage it and let them follow GitHub's own screens.
- Never ask them to read out, paste or send the password or any code.

## 3. Install the GitHub CLI (you may do this, with permission)

Ask before installing anything. Use the platform's usual installer:

| System | Command |
| --- | --- |
| macOS with Homebrew | `brew install gh` |
| Windows | `winget install --id GitHub.cli` |
| Debian or Ubuntu | follow https://github.com/cli/cli/blob/trunk/docs/install_linux.md |

If installing is not possible, stop the publish step and tell them the folder is ready to share later from a computer where it is.

## 4. Sign in (the person approves in the browser)

`gh auth login --web --git-protocol https` prints a one-time code, opens github.com and waits until the person approves. Your shell may time out while it waits, so prefer one of these:

- Ask the person to run it in their own terminal and tell you when it says they are logged in.
- Or start it in the background, show them the code it printed and https://github.com/login/device, and wait for them to say done.

The person enters the code on GitHub's page and approves. The code is single-use and harmless to show; you never see their password.

Check with `gh auth status`, then run `gh auth setup-git` so `git push` uses the same sign-in. When it shows their login, return to the share workflow at the step that sets `maintainers`.

## If something goes wrong

- Email code missing: check spam, then use GitHub's "resend" link.
- Browser did not open: give them https://github.com/login/device and the code `gh` printed.
- They want to stop: that is fine. Tell them where the folder is and that they can say "share this on Disposable" again later.
