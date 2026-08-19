# FitFlow

FitFlow is a personal wellness companion built around a simple idea: **logging data is not the goal — knowing what to do next is.**

Instead of being another dashboard where users enter numbers and leave, FitFlow turns everyday wellness records into a repeatable loop:

**Log → Understand → Act → Review**

Users can quickly record activity, meals and sleep, see trends over time, choose practical next actions, and return for a weekly review of their consistency.

## Why would someone use FitFlow?

Fitness apps often collect information without helping users turn it into behavior. FitFlow is designed around the decision that comes after the data.

For example:

- If sleep records are consistently below a healthy target, FitFlow highlights recovery as the next priority.
- If activity is low, the dashboard suggests a manageable movement action instead of showing another empty chart.
- If nutrition has not been logged, FitFlow makes the next meal the easiest place to restart the habit.
- Progress is reviewed as a trend so users can focus on consistency rather than one perfect day.

The product therefore has a reason to be revisited: **each new record changes the user's picture and the next action.**

## Core features

- **Actionable dashboard** — A daily plan based on the user's recent wellness data.
- **Activity tracking** — Record workouts, movement, duration and calories.
- **Nutrition tracking** — Log meals and macronutrients with trend charts.
- **Sleep tracking** — Record sleep timing, quality, goals and streaks.
- **Progress review** — Compare sleep, nutrition and activity patterns across time ranges.
- **Achievements** — Reinforce consistency and meaningful milestones.
- **Google Sign-In + email/password** — Firebase Authentication with shared profile/session handling.
- **Responsive premium UI** — Consistent design system across the authenticated experience.
- **Privacy-minded architecture** — No client-side AI model token or external AI dependency is required for the core product loop.

## Product loop

```text
             ┌───────────────┐
             │     LOG       │
             │ sleep / meal  │
             │ / activity    │
             └───────┬───────┘
                     ↓
             ┌───────────────┐
             │  UNDERSTAND   │
             │ trends + goals│
             └───────┬───────┘
                     ↓
             ┌───────────────┐
             │      ACT      │
             │ next small    │
             │ action        │
             └───────┬───────┘
                     ↓
             ┌───────────────┐
             │    REVIEW     │
             │ weekly rhythm │
             └───────┬───────┘
                     │
                     └──────→ back to LOG
```

## Tech stack

- HTML5
- CSS3
- Vanilla JavaScript + ES modules
- Firebase Authentication
- Firebase Realtime Database
- Chart.js
- Font Awesome
- Netlify

## Local development

```bash
git clone https://github.com/techykaif/FitFlow.git
cd FitFlow
```

Use a local web server (for example, VS Code Live Server) because Firebase authentication and ES modules should be served over HTTP rather than opened directly from `file://`.

## Live site

https://fitflowt.netlify.app

## Project direction

FitFlow is intentionally focused on a useful wellness workflow rather than adding AI for the sake of having AI. The core experience should remain useful, explainable and dependable even without a generative model.

## License

MIT
