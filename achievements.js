import { auth, database, onAuthStateChanged, ref, get } from "./firebaseConfig.js"

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("achievementsContainer")
  if (!container) return

  const formatEmail = (email) => email.toLowerCase().replace(/\./g, "_dot_").replace(/@/g, "_at_")

  const toDate = (value) => {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const uniqueDays = (records) => new Set(records.map((record) => record.date).filter(Boolean)).size

  const latestDate = (records) => {
    const dates = records.map((record) => toDate(record.date)).filter(Boolean)
    return dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null
  }

  const formatEarnedDate = (date) => {
    if (!date) return "Earned today"
    return `Earned ${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
  }

  const daysSince = (date) => date ? Math.floor((Date.now() - date.getTime()) / 86400000) : Infinity

  async function loadRecords(user) {
    const email = formatEmail(user.email)
    const paths = ["sleep", "nutrition", "activities"]
    const results = await Promise.all(
      paths.map(async (path) => {
        const snapshot = await get(ref(database, `users/${email}/${path}`))
        if (!snapshot.exists()) return []
        return Object.values(snapshot.val()).map((record) => ({ ...record }))
      }),
    )

    const [sleep, nutrition, activities] = results
    renderAchievements(sleep, nutrition, activities)
  }

  function renderAchievements(sleep, nutrition, activities) {
    const allRecords = [...sleep, ...nutrition, ...activities]
    const recentWeek = (records) => records.filter((record) => {
      const date = toDate(record.date)
      return date && Date.now() - date.getTime() <= 7 * 86400000
    })

    const activeDays = uniqueDays(activities)
    const activityMinutes = activities.reduce((total, item) => total + Number(item.duration || 0), 0)
    const nutritionDays = uniqueDays(nutrition)
    const sleepDays = uniqueDays(sleep)
    const recentActivityDays = uniqueDays(recentWeek(activities))
    const recentSleep = recentWeek(sleep)
    const recentNutrition = recentWeek(nutrition)

    const avgSleep = sleep.length
      ? sleep.reduce((total, item) => total + Number(item.duration || 0), 0) / sleep.length
      : 0

    const sleepDurations = recentSleep.map((item) => Number(item.duration || 0)).filter(Boolean)
    const sleepRange = sleepDurations.length
      ? Math.max(...sleepDurations) - Math.min(...sleepDurations)
      : Infinity

    const wellRoundedDays = new Set([
      ...recentWeek(sleep).map((item) => item.date),
      ...recentWeek(nutrition).map((item) => item.date),
      ...recentWeek(activities).map((item) => item.date),
    ])

    const candidates = [
      {
        id: "first-move",
        icon: "fa-person-running",
        tone: "activity",
        title: "First Move",
        description: "Logged your first activity and started your movement history.",
        earned: activities.length >= 1,
        date: latestDate(activities),
      },
      {
        id: "move-hour",
        icon: "fa-stopwatch",
        tone: "activity",
        title: "Move for an Hour",
        description: "Reached 60 total minutes of logged activity.",
        earned: activityMinutes >= 60,
        date: latestDate(activities),
      },
      {
        id: "active-five",
        icon: "fa-calendar-check",
        tone: "activity",
        title: "Five Active Days",
        description: "Logged activity across five different days.",
        earned: activeDays >= 5,
        date: latestDate(activities),
      },
      {
        id: "sleep-started",
        icon: "fa-bed",
        tone: "sleep",
        title: "Sleep Tracked",
        description: "Recorded your first sleep entry so FitFlow can track recovery.",
        earned: sleep.length >= 1,
        date: latestDate(sleep),
      },
      {
        id: "sleep-consistent",
        icon: "fa-moon",
        tone: "sleep",
        title: "Consistent Sleeper",
        description: "Logged at least three recent sleep records within a 1.5-hour duration range.",
        earned: recentSleep.length >= 3 && sleepRange <= 1.5,
        date: latestDate(recentSleep),
      },
      {
        id: "nutrition-started",
        icon: "fa-utensils",
        tone: "nutrition",
        title: "Nutrition Started",
        description: "Logged your first meal and started building a nutrition history.",
        earned: nutrition.length >= 1,
        date: latestDate(nutrition),
      },
      {
        id: "nutrition-three",
        icon: "fa-apple-whole",
        tone: "nutrition",
        title: "Nutrition Routine",
        description: "Logged nutrition on three different days.",
        earned: nutritionDays >= 3,
        date: latestDate(nutrition),
      },
      {
        id: "well-rounded",
        icon: "fa-layer-group",
        tone: "combined",
        title: "Well-Rounded Week",
        description: "Logged sleep, nutrition, and activity during the same recent week.",
        earned: recentSleep.length > 0 && recentNutrition.length > 0 && recentWeek(activities).length > 0 && wellRoundedDays.size >= 3,
        date: latestDate(allRecords),
      },
    ]

    const earned = candidates.filter((item) => item.earned)
    const newlyEarned = earned.filter((item) => daysSince(item.date) <= 7)
    const locked = candidates.filter((item) => !item.earned)

    const sortedEarned = [...earned].sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))

    container.innerHTML = `
      ${newlyEarned.length ? `
        <div class="achievement-spotlight" aria-label="Recently earned achievements">
          <div class="achievement-spotlight-copy">
            <span class="achievement-kicker"><i class="fa-solid fa-sparkles"></i> Recently earned</span>
            <h3>${newlyEarned.length === 1 ? newlyEarned[0].title : `${newlyEarned.length} achievements unlocked`}</h3>
            <p>${newlyEarned.length === 1 ? newlyEarned[0].description : "Your latest progress has unlocked new milestones. Keep the loop moving."}</p>
          </div>
          <div class="achievement-spotlight-badge ${newlyEarned[0].tone}"><i class="fa-solid ${newlyEarned[0].icon}"></i></div>
        </div>
      ` : ""}

      ${sortedEarned.length ? `
        <div class="achievement-group">
          <div class="achievement-group-heading">
            <span><i class="fa-solid fa-trophy"></i> Unlocked</span>
            <strong>${sortedEarned.length}</strong>
          </div>
          <div class="achievement-grid">
            ${sortedEarned.map((item) => `
              <article class="achievement-card earned ${item.tone}">
                <div class="achievement-icon"><i class="fa-solid ${item.icon}"></i></div>
                <div class="achievement-card-copy">
                  <span class="achievement-status"><i class="fa-solid fa-check"></i> Earned</span>
                  <h3>${item.title}</h3>
                  <p>${item.description}</p>
                  <time>${formatEarnedDate(item.date)}</time>
                </div>
              </article>
            `).join("")}
          </div>
        </div>
      ` : `
        <div class="achievement-empty">
          <div class="achievement-empty-icon"><i class="fa-solid fa-trophy"></i></div>
          <div><h3>Your first milestone is waiting</h3><p>Log one activity, sleep record, or meal to unlock your first FitFlow achievement.</p></div>
        </div>
      `}

      ${locked.length ? `
        <details class="achievement-next">
          <summary><span><i class="fa-solid fa-lock"></i> Next milestones</span><small>${locked.length} to unlock</small></summary>
          <div class="achievement-locked-grid">
            ${locked.map((item) => `
              <article class="achievement-locked ${item.tone}">
                <div class="achievement-icon"><i class="fa-solid ${item.icon}"></i></div>
                <div><h3>${item.title}</h3><p>${item.description}</p></div>
              </article>
            `).join("")}
          </div>
        </details>
      ` : ""}
    `

    container.classList.add("is-ready")
  }

  onAuthStateChanged(auth, (user) => {
    if (!user) return
    loadRecords(user).catch((error) => {
      console.error("Unable to calculate achievements:", error)
      container.innerHTML = `
        <div class="achievement-empty">
          <div class="achievement-empty-icon"><i class="fa-solid fa-trophy"></i></div>
          <div><h3>Achievements are temporarily unavailable</h3><p>Your progress is safe. Refresh the page and we'll calculate your milestones again.</p></div>
        </div>`
      container.classList.add("is-ready")
    })
  })
})
