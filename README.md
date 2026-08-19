# FitFlow

FitFlow is a personal wellness companion built around a simple idea: **logging data is not the goal — knowing what to do next is.**

The product turns everyday wellness records into a repeatable loop:

**Log → Understand → Act → Review**

Users can record activity, meals, and sleep, review trends, see practical next actions, and return for a weekly review of consistency.

## Core features

- **Actionable dashboard** — Builds a simple daily plan from recently logged wellness data.
- **Activity tracking** — Record workouts, movement, duration, calories, and notes.
- **Nutrition tracking** — Log meals and nutrition values with history and trends.
- **Sleep tracking** — Record sleep duration, quality, goals, and consistency.
- **Progress review** — Compare activity, nutrition, and sleep across week, month, and year views.
- **Achievements** — Track milestones earned from real activity in the app.
- **Authentication** — Firebase email/password authentication plus Google Sign-In.
- **Responsive UI** — Shared navigation, accessible controls, reusable visual tokens, and responsive layouts.
- **Data-driven guidance** — The core product loop does not depend on a generative AI model or a client-side AI API key.

## How it works

```text
Log → Understand → Act → Review
 ↑                         │
 └─────────────────────────┘
```

1. **Log** — Add an activity, meal, or sleep record.
2. **Understand** — Review current totals, trends, goals, and achievements.
3. **Act** — Use the dashboard's data-driven daily plan to choose a practical next step.
4. **Review** — Return to progress views and use the new records to inform the next cycle.

## Tech stack

- HTML5
- CSS3
- Vanilla JavaScript with ES modules
- Firebase Authentication
- Firebase Realtime Database
- Chart.js
- Font Awesome
- Netlify

## Project structure

FitFlow is a static multi-page web application rather than a framework-based SPA. The main product surfaces are kept as individual HTML/CSS/JS modules:

- `index.html` — public home page
- `about.html` — product/about page
- `tracker.html` — public tracker entry point
- `features.html` — feature overview
- `blog.html` — product notes
- `login.html`, `signup.html`, `forgotpassword.html`, `changepassword.html` — authentication flows
- `dashboard.html` — authenticated overview and daily plan
- `activites.html` — activity logging and history
- `nutrition.html` — nutrition logging and history
- `sleep.html` — sleep logging and history
- `progress.html` — trends and achievements
- `contact-support.html` — combined contact and support page

`contact.html` and `support.html` remain as lightweight redirects so existing links continue to resolve after the contact/support pages were consolidated.

Shared behavior lives primarily in `hamburger.js`, `components/sidebar.js`, `components/google-auth.js`, `firebaseConfig.js`, and the shared design-system/navigation styles.

## Local development

```bash
git clone https://github.com/techykaif/FitFlow.git
cd FitFlow
```

Serve the project through a local HTTP server (for example, VS Code Live Server). Firebase authentication and ES modules should be served over HTTP rather than opened directly with `file://`.

## Live site

https://fitflowt.netlify.app

## Project direction

FitFlow intentionally focuses on a useful and explainable wellness workflow instead of adding AI for the sake of having AI. The core experience should remain dependable without a generative model.

## License

MIT
