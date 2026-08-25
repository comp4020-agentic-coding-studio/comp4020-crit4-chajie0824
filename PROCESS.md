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

1. **The two-tier bell design sounded wrong even though it worked as
   designed.** I'd built a second, smaller tier of bells that auto-echoed
   whatever note was struck, specifically to answer a concern that a
   real bianzhong has far more bells than a five-tone rack and a bigger rack
   would be too crowded to actually play. The echo tier was a deliberate
   answer to that: more bells visible, no extra bells to aim at. Once it was
   actually playable, though, the verdict was that the echo itself just
   didn't sound good, independent of whether the design problem it solved was
   real. I dropped the auto-strike entirely and kept the tier as a silent,
   idle-swaying visual layer, which keeps the "many bells, one hand" answer
   intact without the sound anyone actually disliked. I confirmed by removing
   the trigger call outright rather than muting its volume, so there was no
   remaining code path that could make it audible again, and it was
   contradicted (or not) in the very next round of listening
   ([`024135f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-chajie0824/commit/024135f)).

2. **A wrong guess about which line of a song is its "hook" cost two whole
   attempts, and only outside knowledge fixed it.** For 兰亭序, I first
   transcribed the bracketed instrumental intro, then the verse's opening
   line, reasoning each time from the sheet music alone that it was the
   recognizable part of the song. Both were confirmed wrong by ear, and on
   the second miss I was told directly which line actually is the song's
   hook ("无关风月，我题序等你回"), something no amount of careful
   score-reading on my side could have told me since I have no way to hear
   audio and no independent memory of exactly how this particular song goes.
   I re-transcribed from the named line, and reasoned through why the earlier
   sections specifically wouldn't have sounded recognizable regardless of
   transcription accuracy --- an instrumental intro and a verse opening are
   structurally the least memorable parts of a pop song even transcribed
   perfectly. That reasoning, not just the retry, is what told me the
   original two attempts had the right method and the wrong target
   ([`d345ef4`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-chajie0824/commit/d345ef4),
   [`6c13e08`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-chajie0824/commit/6c13e08)).

3. **A layout fix was rejected outright as "completely wrong," which was the
   right call.** Trying to make the page fill the viewport without a dead gap
   below the bells, I set the bell stage to grow to fill its container
   (`flex: 1`). Combined with an existing formula that stretches each bell's
   cord to reach the bottom of whatever height the stage has, that let the
   stage balloon to nearly the full viewport on a tall screen, and the cords
   stretched to match --- a hugely oversized, disproportionate instrument.
   The response wasn't a request for a minor tweak; it was flagged as
   completely broken, which was the correct read: this wasn't a tuning
   problem, it was the wrong mechanism. I reverted the container to a capped
   height and kept only the part that was actually correct --- bells filling
   whatever height they're given, not the container growing without limit ---
   and rebuilt before reporting back rather than assuming the revert was
   sufficient
   ([`bee0d43`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-chajie0824/commit/bee0d43),
   [`836a6b1`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-chajie0824/commit/836a6b1)).

4. **A "correct" translation was still useless, and only a native speaker's
   reaction caught it.** Translating the seven scale-degree names to
   English, I rendered the two less-common ones as plain pinyin ("Qingjiao",
   "Biangong") on the reasoning that romanization is the standard way to
   represent a term with no direct English word. The response was that even
   as a Chinese speaker, "Qingjiao" meant nothing --- the core five degree
   names are known by their characters (宫商角徵羽), not by pinyin, and the
   two added for a full seven-tone scale are obscure enough that
   romanization alone doesn't identify them to anyone, native speaker or
   not. Correctness of translation and actually being understood turned out
   to be different bars, and I'd only checked the first. I rewrote every
   label to show the character, its pinyin, and its closest solfège note
   together (清角 (Qīngjiǎo) · Fa), and checked it against the same standard
   that had just failed --- would this actually mean something to the person
   reading it, not just is it technically right
   ([`79ddd73`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-chajie0824/commit/79ddd73)).

## Before you ship

`pnpm check:evidence` verifies your citations resolve to real commits, that a
reflection entry the marker reads is in `reflections/`, and that your
`CLAUDE.md` is there --- before a marker ever opens the file. It checks that
your map is traceable, not that it is good: the marker judges whether your
small, deliberately chosen set of moments shows real judgement and reflection. A
green check is not a substitute for that curation.

Images aren't checked: whether one renders is visible the moment you look. Open
this file on GitHub and look at it before you ship.
