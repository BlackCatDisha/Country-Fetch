// countries.js – the Country Finder page: API call, cache, table, filter.

// ---------- 1. Login check ----------
const loggedIn = localStorage.getItem("loggedInUser");
if (!loggedIn) {
  window.location.href = "index.html";          // not logged in -> back to login
}

// Find this user's name in the saved users list and greet them
const me = (JSON.parse(localStorage.getItem("users")) || []).find(function (u) {
  return u.email === loggedIn;
});
document.getElementById("welcome").textContent = me ? "Hi, " + me.name : "";

// Logout: forget the user AND delete every saved search (cache)
function logout() {
  localStorage.removeItem("loggedInUser");
  Object.keys(localStorage).forEach(function (key) {
    if (key.startsWith("cache_")) localStorage.removeItem(key);
  });
  window.location.href = "index.html";
}

// ---------- 2. Settings and variables ----------
const CACHE_MINUTES = 10;       // saved results are fresh for 10 minutes
let currentResults = [];        // the countries from the latest search

// ---------- 3. Cache helpers ----------
// Each search is saved under its own key, e.g. "cache_india"
function getFromCache(name) {
  const saved = JSON.parse(localStorage.getItem("cache_" + name));
  if (!saved) return null;                                   // nothing saved
  const ageMinutes = (Date.now() - saved.time) / 60000;      // how old is it?
  if (ageMinutes > CACHE_MINUTES) return null;               // too old -> ignore it
  saved.age = Math.round(ageMinutes);
  return saved;
}

function saveToCache(name, data) {
  localStorage.setItem("cache_" + name, JSON.stringify({ time: Date.now(), data: data }));
}

// ---------- 4. The API call ----------
async function fetchCountries(name) {
  let response;
  try {
    response = await fetch("/api/countries?name=" + encodeURIComponent(name));
  } catch {
    throw new Error("Could not contact the backend. Start it with npm start and try again.");
  }
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Country service returned HTTP " + response.status);
  }
  return result.data;
}

// ---------- 5. Search (runs when the form is submitted) ----------
// forceFresh = true is used by the "Refresh data" button to skip the cache
async function search(event, forceFresh) {
  event.preventDefault();
  const name = document.getElementById("searchBox").value.trim().toLowerCase();
  const status = document.getElementById("status");

  if (name === "") {
    status.textContent = "Type a country name first.";
    return;
  }

  // Use saved data if we have it and it is still fresh
  const cached = forceFresh ? null : getFromCache(name);
  if (cached) {
    currentResults = cached.data;
    status.textContent = "Loaded from cache (" + cached.age + " min old)";
  } else {
    status.textContent = "Loading...";
    try {
      currentResults = await fetchCountries(name);   // real API call
      saveToCache(name, currentResults);
      status.textContent = currentResults.length ? "Loaded live data from API" : "No country matched that search.";
    } catch (error) {
      currentResults = [];
      console.error("Country search failed:", error);
      status.textContent = error.message || "Could not load country data. Make sure the backend is running.";
    }
  }
  showTable();
}

// ---------- 6. Draw the table (also runs when the region dropdown changes) ----------
function showTable() {
  const region = document.getElementById("regionFilter").value;

  // Filter: keep everything, or only the chosen region. No API call here.
  const list = currentResults.filter(function (c) {
    return region === "All" || c.region === region;
  });

  const body = document.getElementById("tableBody");
  if (list.length === 0) {
    body.innerHTML = '<tr><td colspan="8" class="empty">No countries found.</td></tr>';
    return;
  }

  // Build one table row for each country
  body.innerHTML = list.map(function (c) {
    // Some fields can be missing or are objects, so we tidy them first
    const capital = c.capital && c.capital.length ? c.capital[0] : "N/A";
    const languages = c.languages ? Object.values(c.languages).join(", ") : "N/A";
    const currency = c.currencies
      ? Object.values(c.currencies).map(function (cur) { return cur.name; }).join(", ")
      : "N/A";
    const flag = c.flags && c.flags.png ? c.flags.png : "";
    const name = c.name && c.name.common ? c.name.common : "N/A";
    const population = typeof c.population === "number" ? c.population.toLocaleString() : "N/A";
    const area = typeof c.area === "number" ? c.area.toLocaleString() : "N/A";

    return "<tr>" +
      '<td><img src="' + flag + '" alt="Flag of ' + name + '" width="40"></td>' +
      "<td><strong>" + name + "</strong></td>" +
      "<td>" + capital + "</td>" +
      "<td>" + c.region + "</td>" +
      "<td>" + population + "</td>" +   // adds commas
      "<td>" + area + "</td>" +
      "<td>" + languages + "</td>" +
      "<td>" + currency + "</td>" +
      "</tr>";
  }).join("");
}
