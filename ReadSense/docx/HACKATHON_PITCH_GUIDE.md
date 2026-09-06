# SpeakFlow: Hackathon Demo Video Script & Strategy

**Target Video Length:** 4:30 - 4:50 (Do not exceed 5:00)
**Goal:** Hit all 5 required points precisely to score maximum points across the Judging Criteria.

---

## The "1-Hour Window" GitHub Strategy (CRITICAL)
**Rule:** *Do not create the repository or make any commits before 09:00 AM.*
If you push code with timestamps from before 9:00 AM, you will be disqualified.
**The Playbook (At 09:01 AM):**
1. Create a brand new, empty folder on your computer (e.g., `SpeakFlow_Final`).
2. Copy your `frontend` and `backend` folders into it (DO NOT copy `.git`, `.next`, `__pycache__`, or `node_modules` folders!).
3. Initialize Git in that new folder: `git init`.
4. Create the repo on GitHub, link it, and run your first commit: `git add . && git commit -m "Initial commit for SpeakFlow Hackathon" && git push origin main`. 
5. This ensures all your timestamps show up legitimately inside the 1-hour window.

---

## 5-Minute Demo Video Script (The "Steve Jobs" Masterclass Pacing)

*ElevenLabs Pro-Tip: To get that dramatic, keynote-style delivery, paste the script exactly as it is formatted below. The hard line breaks (pressing Enter twice) and the em-dashes (—) force the AI to take a deep breath and pause naturally, giving it incredible weight and authority.*

### Part 1: Project Overview & Live Demo (0:00 - 1:15)
*Targeting: Innovation & Impact (30%) & Functionality (20%)*
* **Visual:** Show the SpeakFlow dashboard. Briefly click through the menu tabs on the left (Dashboard, Students, Practice, Settings). Return to Dashboard. Click "Start Reading", read a sentence, and click "Stop".

* **Script:** 
"Hello judges. This is SpeakFlow.

An AI-powered diagnostic reading platform... designed for elementary education.

Worldwide... teachers struggle to give individual students the one-on-one reading analysis they desperately need. 

SpeakFlow solves this. By instantly diagnosing phonetic struggles — measuring fluency — and tracking emotional engagement.

Let me demonstrate. 

I will act as a third-grade student... reading this sentence."

*(Stop generating audio here. In your video editor, leave 5 seconds of silence as you record yourself reading the sentence on screen. Then resume the audio below).* 

"As you can see... the pipeline processes the audio instantly. Generating mathematical telemetry, and populating our dashboard with highly targeted AI insights.

Behind the scenes... we have five different AI agents working together as a team.

First... The Phonetic Analyst. It listens for exactly which words the student struggled to say.

Second... The Difficulty Assessor. It figures out if the reading level is too hard, or too easy.

Third... The Engagement Tracker. Checking the student's confidence and emotional state.

Fourth... The Practice Generator. Creating custom exercises based on the exact mistakes they just made.

And finally... The Progress Synthesizer. Summarizing how they are doing overall."

### Part 2: Project Structure Walkthrough (1:15 - 1:45)
*Targeting: Brief walkthrough of the project structure (Required Point 5)*
* **Visual:** Open VS Code. Quickly show the folder tree. 

* **Script:** 
"Our project is decoupled into a modern... dual-stack architecture. 

On the client side... we have our frontend. Built with Next.js, React, and Tailwind CSS... for a highly responsive UI.

On the server side... we have our backend. Running on Python and FastAPI. 

This decoupling ensures the heavy AI compute is entirely offloaded from cheap school devices... directly onto our centralized API."

### Part 3: Code Execution & Compilation (1:45 - 2:30)
*Targeting: Code compilation/execution showing output (Required Point 3)*
* **Visual:** Split terminal showing both backend and frontend starting up via your `start_speakflow.bat`. 

* **Script:** 
"Let me demonstrate the execution. 

We use a batch script to spin up both servers simultaneously. 

Here... you can see Uvicorn initializing the FastAPI backend on port 8000. And Next.js compiling our frontend on port 3000.

During startup... the backend dynamically binds FFmpeg. It pre-loads the OpenAI Whisper base model directly into memory. 

This ensures that local acoustic processing is lightning-fast... and instantly ready for incoming audio streams."

### Part 4: Technical Backend Implementation (2:30 - 3:45)
*Targeting: Frontend/Backend implementation (Required Point 2) & Gemma Integration (30%)*
* **Visual:** Show `pipeline.py` (specifically the `run_pipeline` function) and `AgentsAtWorkCard.tsx`.

* **Script:** 
"Under the hood... the backend implementation relies on a strictly typed, asynchronous processing pipeline.

When the frontend transmits a WebM audio blob... FastAPI routes it to our local Whisper model for transcript extraction. While simultaneously... feeding the audio array into Librosa for zero-crossing rate and pitch variance analysis.

We then parallelize requests... to Gemma... via our Multi-Agent Orchestrator. 

We engineered five distinct, specialized AI agents. We inject the raw acoustic telemetry — such as word-level timestamps... pause counts over 800 milliseconds... and calculated string-matching accuracy using Python's difflib — directly into Gemma's context window. 

Each agent is strictly prompted to return structured JSON... which our Next.js client state parses in real-time."

### Part 5: Key Architectural Features & Edge Cases (3:45 - 4:45)
*Targeting: Demonstration of key features (Required Point 4)*
* **Visual:** Point to the "Session Telemetry" card and the "Targeted Practice" card on the UI.

* **Script:** 
"A key feature of our system... is how the Gemma agents interact with edge cases.

For example. If a student reads with one hundred percent phonetic accuracy... our Practice Generator agent doesn't just stop working. 

It dynamically scales the difficulty. Utilizing Gemma's language generation to automatically spawn advanced tongue-twisters... and complex vocabulary exercises for the student to achieve mastery.

Furthermore... our UI components use dynamic React hooks to ensure the five agents update the DOM asynchronously as the JSON payloads arrive. 

Ensuring a completely non-blocking... fluid user experience."

### Part 6: Outro (4:45 - 5:00)
* **Visual:** Back to the main dashboard.

* **Script:** 
"SpeakFlow proves that by combining lightweight local acoustic processing... with the deep reasoning capabilities of Gemma... 

We can turn any standard device... into a world-class reading tutor. 

Thank you."
