# Process overview

A reading-guide to how the work came together --- a map to your process, not an
essay about it. Markers read this file and follow its citations; they don't
trawl the repo for evidence you didn't point at, so if a moment mattered, cite
it.

This file is the shape; the course site's
[assessment page](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/#what-you-submit)
is the requirement, and its
[word counts](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/#word-counts)
cover every deliverable.

## What I built

Bianzhong: Lingering Bells is a bianzhong (编钟, the ancient Chinese bronze
bell chime) you play live in the browser --- drag across bells for a
glissando, strike position shifts pitch between a bell's two real tones
(正鼓音/侧鼓音), and strike speed sets loudness. The bells are a real
open-source 3D scan rather than a drawn shape, and every strike plays an
actual recorded bianzhong sample rather than a synthesized tone, pitch-shifted
to cover notes the recording set didn't include. A song picker lets a player
either hear a short transcribed phrase auto-play or follow a highlighted
sequence of bells and keys to play it themselves, entirely optional and never
required to make the instrument work.

## The moments that mattered

1. **A second tier of bells worked exactly as designed and still sounded
   wrong.** I'd added a small 钮钟 (niuzhong) tier above the main rack that
   auto-echoed whatever note was struck, an octave up, specifically to solve
   a real problem: a historical bianzhong set has far more bells than a rack
   a single hand can actually aim at and play, and this was a way to look
   like a fuller set without adding more pointer targets. It worked exactly
   as built --- every strike produced a clean echo on cue. Once it was
   actually playable, though, the echo itself just didn't sound good,
   independent of whether the design problem it solved was real. I asked for
   the auto-strike sound to be dropped entirely, keeping the tier as a
   silent, idle-swaying visual layer only, which keeps the "many bells, one
   hand" answer intact without the sound I didn't like. I checked afterward
   that the trigger call itself was removed rather than just muted, so there
   was no remaining path that could make it audible again, and confirmed it
   stayed silent on the next few strikes I tried
   ([`024135f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-chajie0824/commit/024135f)).

2. **Evenly-filled cords read as a spreadsheet, not a real instrument.** The
   layout had been tuned so every bell's cord stretched to reach a common
   target height at the bottom of the stage, closing a gap that used to sit
   under the shortest bells. That made the rack look uniform: every cord the
   same effective length, bottoms flush across the whole row. A real
   bianzhong doesn't hang like that --- bell sizes and a rack's own geometry
   are never perfectly uniform, so cords and handles vary visibly in length
   from bell to bell. I asked for the lengths to be genuinely uneven rather
   than bottom-aligned. The fix kept the fill-to-target formula (bells still
   reach roughly the same zone at the bottom of the stage) but layered a
   per-bell offset on top of it so neighbouring cords differ noticeably, and
   I looked at the deployed page again afterward to confirm it read as
   organic variation rather than a still-too-regular pattern
   ([`0738ac3`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-chajie0824/commit/0738ac3)).

## Before you ship

`pnpm check:evidence` verifies your citations resolve to real commits, that a
reflection entry the marker reads is in `reflections/`, and that your
`CLAUDE.md` is there --- before a marker ever opens the file. It checks that
your map is traceable, not that it is good: the marker judges whether your
small, deliberately chosen set of moments shows real judgement and reflection. A
green check is not a substitute for that curation.

Images aren't checked: whether one renders is visible the moment you look. Open
this file on GitHub and look at it before you ship.
