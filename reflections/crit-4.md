# Crit 4 reflection

**What was the breakthrough that moved the work forward?**

Realising that the agent's confidence and its correctness were completely
uncorrelated for anything I could hear or see and it couldn't. It read sheet
music carefully and still guessed wrong twice about which line of a song
people actually recognise it by, because that's knowledge from having heard
the song, not from reading the page. It reasoned soundly about 3D lighting
and still shipped a nearly-black scene, because it could not look at the
result. The breakthrough wasn't a technical fix; it was realising my most
useful input all week wasn't picking features, it was being the ears and eyes
in the loop --- naming the exact line of a song, saying a render looked wrong
and what it looked like, rejecting a "fix" outright when it made things worse
instead of describing it as a minor tweak. The work got better exactly in
proportion to how specific that feedback was.

**What did this work change about who I want to be as a software developer?**

I used to think directing an agent well meant writing a good initial prompt.
This week it was closer to being a good reviewer under time pressure: catch
the wrong assumption fast, say precisely what's wrong rather than "this is
bad," and know when to cut a feature entirely rather than keep iterating on
it. Dropping the auto-echoing bell tier after it was built and working, and
dropping a song transcription twice rather than shipping something that
merely resembled the source, felt less like failure and more like the actual
job --- deciding what's good enough to keep, on the basis of the result, not
the effort that went into it.
