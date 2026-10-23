const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT) || 3000;
const API_BASE_URL = "https://countries.dev/name/";
const API_FIELDS = "name,capital,population,region,area,flags,currencies,languages";
const PUBLIC_FILES = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/home.html": ["home.html", "text/html; charset=utf-8"],
  "/auth.js": ["auth.js", "text/javascript; charset=utf-8"],
  "/countries.js": ["countries.js", "text/javascript; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"]
};

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(body));
}

function toTableCountry(country) {
  const languages = {};
  for (const language of country.languages || []) {
    const code = language.iso639_1 || language.iso639_2 || language.name;
    if (code && language.name) languages[code] = language.name;
  }

  const currencies = {};
  for (const currency of country.currencies || []) {
    if (currency.code) currencies[currency.code] = { name: currency.name || currency.code };
  }

  return {
    name: { common: country.name },
    capital: country.capital ? [country.capital] : [],
    population: country.population,
    region: country.region || "N/A",
    area: country.area,
    flags: country.flags || {},
    currencies,
    languages
  };
}

async function getCountries(name) {
  const url = new URL(encodeURIComponent(name), API_BASE_URL);
  url.searchParams.set("fields", API_FIELDS);

  const upstream = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (upstream.status === 404) return [];
  if (!upstream.ok) {
    throw new Error("Country data provider returned HTTP " + upstream.status);
  }

  const countries = await upstream.json();
  if (!Array.isArray(countries)) {
    throw new Error("Country data provider returned an unexpected response.");
  }
  const exactMatches = countries.filter(
    (country) => country.name && country.name.toLowerCase() === name.toLowerCase()
  );
  return (exactMatches.length ? exactMatches : countries).map(toTableCountry);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");

  if (url.pathname === "/api/countries") {
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      return sendJson(response, 405, { error: "Use GET to search for countries." });
    }

    const name = (url.searchParams.get("name") || "").trim();
    if (!name || name.length > 80) {
      return sendJson(response, 400, { error: "Enter a country name (up to 80 characters)." });
    }

    try {
      const data = await getCountries(name);
      return sendJson(response, 200, { data });
    } catch (error) {
      console.error("Country data request failed:", error);
      const timedOut = error.name === "TimeoutError";
      return sendJson(response, 502, {
        error: timedOut
          ? "The country data provider took too long to respond. Please try again."
          : "Could not retrieve country data. Check the server connection and try again."
      });
    }
  }

  const file = PUBLIC_FILES[url.pathname];
  if (!file || request.method !== "GET") {
    return sendJson(response, 404, { error: "Page not found." });
  }

  fs.readFile(path.join(__dirname, file[0]), (error, content) => {
    if (error) {
      console.error("Could not read page file:", error);
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      return response.end("Could not load the page.");
    }
    response.writeHead(200, { "Content-Type": file[1] });
    response.end(content);
  });
});

server.listen(PORT, () => {
  console.log("Country Finder is running at http://localhost:" + PORT);
});
