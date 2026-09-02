# SpeakFlow — What We're Building (Team Briefing)

For anyone on the team who hasn't read the technical docs — here's what each piece does and why it's in the demo, in plain English.

**1. The "it actually hears you" engine.**
This is the core of the whole project. Instead of just turning speech into text (what most apps do), we analyze the actual sound of how a word was said — pitch, tone, shape of the sound — so we catch a specific mispronunciation, not just "did they say roughly the right word."

**2. The Urdu and English word list.**
We picked a focused set of words and sounds in both languages, especially Urdu ones that are genuinely hard to tell apart by ear (like ق and ک). We're using an existing free tool to generate a first draft of correct pronunciations, then double-checking the tricky ones by hand with a native Urdu speaker — getting these wrong in front of judges would be bad.

**3. Google's Gemini AI — our reasoning layer (not the sponsor's tech).**
We weren't given Alibaba Cloud access and don't have budget to buy it, so we're using Gemini 3.5 Flash-Lite (free) instead. It does two jobs: turns our raw error data into friendly, encouraging feedback a kid can understand, and listens directly to the trickier moments — like figuring out if a kid paused because they're nervous versus because they genuinely don't know the word. Heads up: this is a real gap for an Alibaba-sponsored hackathon, and it's worth one more direct ask to the organizers before the finale — see the full evaluation for why.

**4. The story/game the kid sees.**
A short story with a handful of checkpoints — say the word right, the story moves forward. Simple on purpose, so it's reliably working on demo day instead of ambitious and broken.

**5. The "how's this kid doing overall" flag.**
We track hesitation and speaking pace as a gentle heads-up for teachers and parents — never a diagnosis, just "this might be worth a closer look."

**6. Works with no internet.**
The teacher's laptop can run everything locally if the WiFi drops — important for schools with unreliable internet. This uses a separate, smaller AI model that lives on the laptop itself, since our fast online option (Groq) only works with internet.

**7. The parent text message.**
A sample WhatsApp-style update in Urdu, so a parent with no tech background instantly understands how their kid is doing. We're showing one real example rather than building the full live messaging system — not worth the risk in three days.

**8. The teacher's dashboard.**
A simple screen showing which sounds the whole class is struggling with, so a teacher managing 40 kids doesn't need to check in with each one individually.

---

**One thing to know as a team:** every feature is tagged BUILT / TO BUILD / ROADMAP-ONLY in the technical doc. If it says ROADMAP-ONLY, it does not go in the live demo or the pitch script — no exceptions, even if it would look cool.
