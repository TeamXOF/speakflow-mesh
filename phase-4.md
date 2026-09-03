# Phase 4: Gemini Feedback (Async API Phase 2 UI)

## Context & Goal
The goal of this phase is to build the asynchronous AI feedback panel that appears 2-3 seconds after the initial Phase 1 feedback (Phase 3 UI). Since there is no backend yet, this will be simulated using a hardcoded `mockPhase2` object and a `setTimeout`.

This phase represents the second half of the interaction model: the heavy GenAI response (speech bubble feedback + practice recommendations) arriving after the fast deterministic STT feedback.

## Task Breakdown

### 1. State Management & Delay Simulation (`page.tsx`)
- Introduce a new state `const [phase2Loaded, setPhase2Loaded] = useState(false)`.
- Use a `useEffect` to trigger a `setTimeout` of 3000ms when the feedback screen mounts.
- After 3000ms, set `phase2Loaded` to `true`.

### 2. Mascot Speech Bubble (`MascotMessage.tsx`)
- Update the `MascotMessage` component to optionally accept a `feedbackText` string.
- When `feedbackText` is provided, render a speech bubble next to or below the mascot.
- It should use the `mockPhase2.feedback_text`: "Try to pronounce 'explorer' a little slower. You did great on the other words!"

### 3. Practice Section (`PracticeSection.tsx`)
- Create a new component `PracticeSection` under `components/Feedback`.
- It will take a `word` prop (`mockPhase2.practice_recommendation`).
- The UI should feature a header "Let's Practice Together", the word displayed prominently, and a play/speaker button (using Lucide `Volume2` icon) to "hear" the correct pronunciation.

### 4. Animations
- The new elements (speech bubble, practice section) must animate in smoothly.
- We will use Tailwind's animation classes (e.g., `animate-in fade-in slide-in-from-bottom-4 duration-300`) so it doesn't jarringly jump onto the screen.

### 5. Enable Navigation
- When `phase2Loaded` is true, the "Next Checkpoint →" button must become enabled.
- Change its styling from gray to active lavender (`bg-[var(--accent-primary)] text-white hover:bg-[#B388FF]`).
- Wire the button to reset the URL parameters and state, sending the user back to the reading mode (to simulate moving to the next checkpoint).

## Agent Assignments
- **Frontend Specialist**: Implement components, state hooks, and animations.

## Phase 4 Verification Checklist (From Roadmap)
- [ ] After seeing the Phase 1 feedback, wait 2–3 seconds.
- [ ] A new section animates in smoothly (fade/slide).
- [ ] The mascot has a speech bubble with encouraging feedback text.
- [ ] You see a "Let's Practice Together" section with the word "explorer" displayed prominently.
- [ ] The "Next Checkpoint →" button is now clickable (lavender/active).
- [ ] Clicking "Next Checkpoint" advances you to the next checkpoint (returns to reading view).
- [ ] The animation felt natural — like the AI "thought about it" before responding.
