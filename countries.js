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
// ?fields= asks the API for only the data we need, so the reply is small
async function fetchCountries(name) {
  const url = "https://restcountries.com/v3.1/name/" + encodeURIComponent(name) +
    "?fields=name,capital,population,region,area,flags,currencies,languages";
  const response = await fetch(url);          // go to the address and wait for the reply
  if (response.status === 404) return [];     // 404 = no country matched
  if (!response.ok) throw new Error("API error " + response.status);
  return await response.json();               // turn the reply into a JS array
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
      status.textContent = "Loaded from API";
    } catch (error) {
      currentResults = [];
      status.textContent = "Could not reach the API. Check your internet and try again.";
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

    return "<tr>" +
      '<td><img src="' + c.flags.png + '" alt="Flag of ' + c.name.common + '" width="40"></td>' +
      "<td><strong>" + c.name.common + "</strong></td>" +
      "<td>" + capital + "</td>" +
      "<td>" + c.region + "</td>" +
      "<td>" + c.population.toLocaleString() + "</td>" +   // adds commas
      "<td>" + c.area.toLocaleString() + "</td>" +
      "<td>" + languages + "</td>" +
      "<td>" + currency + "</td>" +
      "</tr>";
  }).join("");
}
