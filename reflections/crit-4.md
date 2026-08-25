# Crit 4 reflection

**What was the breakthrough that moved the work forward?**

Realising that the agent's confidence had nothing to do with whether it could
actually get right the two kinds of things it has no way to reach on its own:
what something really sounds or looks like, and where to find the real thing
it's supposed to be imitating. Its first pass at the bell sound was built
entirely from guessed partial ratios --- reasoned through carefully, but
built on nothing real, because it has no way to go and find, let alone
license-check, an actual bianzhong recording by itself. I went and sourced a
real sample library from a Wuhan Conservatory bianzhong replica myself; only
once that recording existed could the agent check its manual for a license
and rebuild the sound around real samples instead of a guess. The same gap
showed up reading sheet music (it named the wrong line as a song's
recognisable hook twice, because that's knowledge from having heard the song,
not from the page) and in a 3D render that stayed nearly black despite sound
lighting reasoning, because it couldn't look at the result. The breakthrough
was realising my most useful input all week wasn't picking features --- it
was supplying exactly what the agent structurally can't get itself: the real
recording it had no way to source, the specific line it had no way to have
heard, the description of what a render actually looked like. The work
improved in direct proportion to how concrete that input was.

**What did this work change about who I want to be as a software developer?**

I used to think directing an agent well meant writing a good initial prompt.
This week it was closer to knowing when to hand it a decision and when to
just go get the thing myself --- sourcing the real bianzhong recordings
rather than asking the agent to somehow find and vet a licensed library it
had no way to evaluate on its own was the clearest case of that. The rest of
it was being a fast, specific reviewer: naming exactly what was wrong rather
than "this is bad," and knowing when to cut a feature entirely rather than
keep iterating on it. Dropping the auto-echoing bell tier after it was built
and working, and dropping a song transcription after two honest misses rather
than shipping something that merely resembled the source, felt less like
failure and more like the actual job --- deciding what's good enough to keep,
based on the result in front of me, not the effort that went into producing
it.
