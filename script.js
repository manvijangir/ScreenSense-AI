// --- 1. CSV Upload & Processing (upload.html) ---
const fileInput = document.getElementById("csvFile");
const fileStatus = document.getElementById("fileStatus");
const analyzeBtn = document.getElementById("analyzeBtn");

let parsedData = null;

if (fileInput && fileStatus) {
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    fileStatus.textContent = `Selected: ${file.name}`;
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target.result;
      parsedData = parseScreenTimeCSV(text);
      if (analyzeBtn) analyzeBtn.disabled = false;
    };

    reader.readAsText(file);
  });
}

if (analyzeBtn) {
  analyzeBtn.addEventListener("click", async () => {
  if (!parsedData) {
    alert("Please select a valid CSV file first.");
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append("file", file);
  formData.append("goal", "Reduce screen time");

  const res = await fetch("http://127.0.0.1:8000/analyze", {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  localStorage.setItem("screenTimeReport", JSON.stringify(data));
  window.location.href = "dashboard.html";
});
}

// Parses CSV lines expecting: App,DurationMinutes,Category,Day
// Falls back gracefully if headers vary
function parseScreenTimeCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return null;

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const appIdx = headers.indexOf("app");
  const durIdx = headers.findIndex((h) => h.includes("duration") || h.includes("minute") || h.includes("time"));
  const dayIdx = headers.findIndex((h) => h.includes("day") || h.includes("date"));
  const catIdx = headers.indexOf("category");

  const appMap = {};
  const dayMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  let totalMinutes = 0;
  let productiveMinutes = 0;

  const productiveTags = ["work", "education", "productivity", "study", "code"];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (!cols || cols.length < 2) continue;

    const appName = cols[appIdx !== -1 ? appIdx : 0] || "Unknown";
    const duration = parseFloat(cols[durIdx !== -1 ? durIdx : 1]) || 0;
    const category = (cols[catIdx !== -1 ? catIdx : 2] || "").toLowerCase();
    const day = cols[dayIdx !== -1 ? dayIdx : 3] || "Mon";

    // Track app aggregates
    appMap[appName] = (appMap[appName] || 0) + duration;
    totalMinutes += duration;

    // Track daily usage (mapping full names or short keys)
    const shortDay = day.substring(0, 3);
    if (dayMap.hasOwnProperty(shortDay)) {
      dayMap[shortDay] += duration;
    }

    // Productivity metrics
    if (productiveTags.some((tag) => category.includes(tag))) {
      productiveMinutes += duration;
    }
  }

  // Sort apps descending
  const sortedApps = Object.entries(appMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, mins]) => ({ name, minutes: mins }));

  const productivityScore = totalMinutes > 0 ? Math.round((productiveMinutes / totalMinutes) * 100) : 0;

  return {
    totalMinutes,
    averageDailyMinutes: Math.round(totalMinutes / 7),
    topApps: sortedApps,
    weeklyUsage: Object.values(dayMap).map((m) => +(m / 60).toFixed(1)),
    productivityScore
  };
}

// --- 2. Dashboard Dynamic Rendering (dashboard.html) ---
const ctx = document.getElementById("weeklyChart");

if (ctx) {
  const cached = localStorage.getItem("screenTimeReport");
  const data = cached ? JSON.parse(cached) : null;

  if (data) {
    // 1. Update metric cards
    document.getElementById("totalScreenTime").textContent = formatHoursMins(data.totalMinutes);
    document.getElementById("mostUsedApp").textContent = data.topApps[0]?.name || "N/A";
    document.getElementById("avgDailyUsage").textContent = formatHoursMins(data.averageDailyMinutes);
    document.getElementById("productivityScore").textContent = `${data.productivityScore}%`;

    // 2. Render dynamic Top Apps
    const topAppsList = document.getElementById("topAppsList");
    topAppsList.innerHTML = "";
    data.topApps.slice(0, 5).forEach((app) => {
      const li = document.createElement("li");
      li.textContent = `${app.name} — ${formatHoursMins(app.minutes)}`;
      topAppsList.appendChild(li);
    });

    // 3. Render Chart
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
          {
            label: "Screen Time (hours)",
            data: data.weeklyUsage,
            backgroundColor: "#2563EB",
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } }
      }
    });

    // 4. Generate AI/Dynamic Insights
    const insightText = document.getElementById("aiInsightText");
    const topAppName = data.topApps[0]?.name || "your top apps";
    
    if (data.productivityScore < 30) {
      insightText.textContent = `Your digital diet is heavily skewed toward consumption. ${topAppName} dominates your schedule. Try introducing an app limit during peak hours.`;
    } else if (data.productivityScore < 60) {
      insightText.textContent = `Balanced session! You maintain a steady workflow, but leisure usage on apps like ${topAppName} still cuts into your high-focus windows.`;
    } else {
      insightText.textContent = `Exceptional focus! Over half of your screen activity directly targets work and utility goals. Keep sustaining this routine.`;
    }
  }
}

function formatHoursMins(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hrs}h ${mins}m`;
}