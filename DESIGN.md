---
name: SpeakFlow
colors:
  bg-base: "#FAF7F2"
  card-bg: "#FFFFFF"
  accent-primary: "#C9BFF0"
  accent-secondary: "#F5C6D8"
  text-primary: "#1A1A1A"
  text-secondary: "#4B4B4B"
  success: "#34C759"
  warning: "#FFB020"
  error: "#FF4D4F"
typography:
  heading-1: { fontFamily: DM Sans, fontSize: 32px, fontWeight: bold }
  heading-2: { fontFamily: DM Sans, fontSize: 20px, fontWeight: bold }
  body: { fontFamily: DM Sans, fontSize: 16px, fontWeight: normal }
  caption: { fontFamily: DM Sans, fontSize: 12px, fontWeight: 500 }
  label-mono: { fontFamily: JetBrains Mono, fontSize: 14px, fontWeight: 500 }
components:
  card:
    backgroundColor: "{colors.card-bg}"
    rounded: 16px
  button-primary:
    backgroundColor: "{colors.accent-primary}"
    textColor: "{colors.text-primary}"
---

# SpeakFlow Design System

## Overview
SpeakFlow is a dual-interface application:
1. **Student Experience (Kid Facing)**: Simple, engaging, story-based, and highly encouraging.
2. **Teacher Experience (Admin Facing)**: Professional, data-rich dashboards to monitor, diagnose, and track progress.

## Colors
- **Background Base (`#FAF7F2`)**: Warm, friendly off-white for the main app background.
- **Card Background (`#FFFFFF`)**: Clean white for elevated surfaces.
- **Accent Primary (`#C9BFF0`)**: Soft purple for primary actions and highlights.
- **Accent Secondary (`#F5C6D8`)**: Soft pink for secondary playful highlights.
- **Text Primary (`#1A1A1A`)**: High contrast dark gray for readability.
- **Text Secondary (`#4B4B4B`)**: Mid gray for supporting text.
- **Status Colors**: Success (`#34C759`), Warning (`#FFB020`), Error (`#FF4D4F`).

## Typography
- **DM Sans** is used for all UI text, headings, and body copy.
- **JetBrains Mono** is used for numbers, metrics, and labels to ensure tabular alignment and a technical/precise feel where needed (e.g., in the Teacher Dashboard).

## Screens Identified
**Student Experience (S1-S5):**
1. Story Map / Chapter Select (S1)
2. Checkpoint Screen (S2)
3. Recording & Feedback (S3)
4. Gemini Feedback (Phase 2) (S4)
5. Progress & Rewards (S5)

**Teacher Experience (T0-T4):**
1. Sidebar/Layout Framework (T0)
2. Overview Dashboard (T1)
3. Student Progress (T2)
4. Session Analysis (T3)
5. Checkpoint Overview (T4)

## General UI Guidelines (Do's and Don'ts)
1. **Keep it clean**: White space is your friend. Don't overcrowd the UI.
2. **Use friendly language**: Simple, encouraging, and kid-appropriate.
3. **Feedback first**: Show results quickly (Phase 1 latency ~400ms), then load detailed Gemini feedback (Phase 2).
4. **Consistent patterns**: Same icons, colors, and behaviors everywhere.
5. **Accessible design**: Large tap targets, good contrast, and readable text.
