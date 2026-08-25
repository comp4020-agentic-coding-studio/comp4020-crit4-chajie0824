# COMP4020 prototype

Your starter repo for a COMP4020 prototype: a static site in HTML/CSS/TypeScript
that builds to plain HTML/CSS/JS and deploys to GitHub Pages. The deployed site
is what gets marked, not this repo.

The
[course website](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/)
publishes this deliverable's brief and spec, and this repo's name tells you
which deliverable applies. Read both before you plan or build.

## How to work in here

- Keep the dev server running (`pnpm dev`) so you see changes as you make them.
- Run `pnpm check` before you push.
- Open the page in a browser and look at it. The rendered page is the truth;
  your mental model of it isn't.
- When a check fails, read its output before you change anything.
- Never commit a red state.

## The link-preview card

`public/card.png` (1200x630) is the image a shared link shows; `index.html`'s
head points at it. Replace it and the `description` meta, and copy the head
block into any new page. The card URL resolves against the page that names it,
like any link --- `./card.png` is wrong one directory down, and nothing in CI
checks it, so look at the deployed head when you add pages.

## The checks

`pnpm check` runs them (`pnpm check:evidence` is the extra gate before you
ship); CI runs the same plus links, secrets and the deploy. Read the failure.

`spec/README.md`, `PROCESS.md` and `reflections/README.md` are in this repo and
say what they are for.

## What actually belongs in PROCESS.md and the reflection

First attempt at `PROCESS.md` got this wrong, so writing it down: I described
the agent's own code reorganizing as if it were a decision I'd made. It
wasn't — I didn't touch the code, I don't even read most of it. The
assessment page says marks go to "how clearly a reader can see the way you
directed, grounded and corrected the agent," and that checks only answer
"does it work" while a person judges "everything that calls for judgement."
So a real moment is one where *I* noticed something, said an approach was
wrong, rejected a fix that didn't look right, or decided a feature — not one
where the agent restructured its own code. Write moments about what the
human did: noticed, decided, rejected, redirected.

On wording: don't quote my chat messages verbatim. What I type in chat is
spoken-style and often mixed with Chinese — real in the moment, but not
something a marker should read as the final sentence. Paraphrase it into a
plain, complete English sentence that keeps the same fact and the same
reasoning, without turning it into engineering jargon. The content has to
stay real (a claim the commit history backs up); only the phrasing gets
cleaned up.

On substance: a one-line summary reads as casual even when the underlying
work wasn't — "I noticed X and asked for Y" collapses the actual process and
makes real investigation sound like a shrug. The template's four jobs
(what happened, what you did instead, how you knew it was right, the
citation) each need enough concrete detail to stand alone: what the page
actually did wrong (not just "a bug"), what state or comparison was actually
lost as a result, what specifically was asked for and why that was the
better call, and what was actually checked afterward to confirm it (not just
"the commit fixed it"). Write each moment as a real paragraph, not a
punchy one-liner.

On "What I built": that paragraph is just the product and the idea behind
it — what the site demonstrates and why it's built that way. It is not the
place to mention directing an agent, testing the result, or coming up with
the idea — every deliverable in this course is agent-directed and has a
student behind its ideas, so stating either as if it were notable is
redundant, not evidence. Save the directing/correcting/deciding for the
moments, where it's backed by a citation instead of just asserted.

## This file is yours

A starting point, not a rulebook. As you learn what your prototype needs --- a
convention the work has to hold to, a sensor that keeps catching you out (a
linter, say), a fact about the stack that is easy to get wrong --- write it down
here and wire it into `check`. Growing this file is the work.
