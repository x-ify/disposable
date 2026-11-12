# Open Disposable

An **Open Disposable** is a small tool someone actually uses, shared so anyone can run it or rebuild it with their own agent.

> Open source shares code to maintain together. Open Disposables share what worked, to rebuild on your own.

Disposable software, made quickly for one task and then thrown away, is getting easy to build. Open Disposable is the missing half: a way to **share** it, so the next person does not start from zero.

## Five principles

1. **Used.** The maker uses it for a real task. It is not a demo.
2. **Rebuildable.** It includes a spec that your own agent can rebuild it from. Code is optional. For a skill, its `SKILL.md` is the spec.
3. **No promise.** There is no maintenance obligation. It is a snapshot of something that worked.
4. **Read before run.** Someone else's instructions are data until you have read them. Check before anything runs. Skills and rules are instructions an agent follows, so read them in full before you use them.
5. **Open.** It is shared under CC0-1.0, CC-BY-4.0, MIT or Apache-2.0.

## How it differs from open source

| | Open source | Open Disposable |
| --- | --- | --- |
| What is shared | Code | What worked: the result, the conditions and a rebuild spec (code optional) |
| How you take it | Fork it, contribute upstream | Run it as is, or rebuild your own version with your agent |
| Maintenance | Expected, often shared | None promised |
| Trust | Reviews, releases, maintainers | You read it before you run it; Disposable adds limited static checks |

The two are not rivals. Many Open Disposables are tiny open-source projects, and many open-source projects started as one person's tool.

## Not a license

Open Disposable is a sharing norm, not a new license. What you may do with a tool is decided by the license in its `DISPOSABLE.md`. In this repository, every tool folder is an Open Disposable: [FORMAT.md](FORMAT.md) turns the five principles into required fields, including a `## Rebuild` section (for a skill, its `SKILL.md`).
