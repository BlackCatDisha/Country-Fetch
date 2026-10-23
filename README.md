# Country Finder

## Run locally

Install Node.js, open a terminal in this folder, and run:

```sh
npm start
```

Open <http://localhost:3000>. The Node server serves the pages and the `/api/countries` endpoint, so the browser and backend use the same origin.

## Country data API

`GET /api/countries?name=india` validates the search, requests current country data from [countries.dev](https://countries.dev/), and reshapes the result for the table. The provider request is made by the server, not by browser JavaScript. This provider does not require an API key.

Search results are cached in the browser for 10 minutes. Use **Refresh data** to bypass that cache and request current provider data. The backend has a 10-second upstream timeout and returns a useful error status if the provider cannot be reached.

The provider is an external dependency; if it is unavailable, searches will fail until it recovers.
