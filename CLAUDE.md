# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

German-language weather forecast visualization web app. Pure static HTML/CSS/JS — no build system, no framework, no package.json.

## How to Run

Serve files with any static HTTP server (e.g. `python -m http.server`). No install or build step needed. Open `index.html` in browser.

## Architecture

**Files:**
- `index.html` — Single-page layout with 9 stacked panels (temperature, weather symbols, wind, precipitation, sunshine, cloud cover, pressure)
- `app.js` — All application logic: API calls, rendering, chart management, state
- `style.css` — Layout and responsive styling (CSS Grid/Flexbox, mobile breakpoint at 768px)
- `weather-icons.js` — WMO weather code → emoji mapping and utility functions

**External dependencies (CDN-loaded):**
- Chart.js v4.4.7 for line/bar charts

**APIs (no auth required):**
- Open-Meteo Forecast API (`api.open-meteo.com/v1/forecast`) — hourly weather data
- Open-Meteo Geocoding API (`geocoding-api.open-meteo.com/v1/search`) — location search

## Key Concepts

**Alignment system:** All panels share a common time axis. Positioning uses percentage-based `left: idx/N * 100%` where N = total forecast hours. Chart.js x-axis is configured with `min: -0.5, max: N-0.5` to align chart data points with the CSS grid columns.

**Forecast range:** User selects 4, 7, or 15 days. 4-day fits viewport width; 7/15-day use scaled `minWidth` with horizontal scrolling.

**Day separators:** Rendered as a single full-height overlay container positioned above all panels (not per-panel).

**Rendering flow:** `loadForecast()` → API fetch → `renderAll()` → individual panel renders + grid/axis/separator overlays.

**State:** Global variables (`tempChart`, `pressureChart`, `windChart`, `forecastDays`, `currentLat/Lon/Name`, `dayBoundaryIndices`, `N`). No framework state management.

## Conventions

- Language: German UI text, German timezone (`Europe/Berlin`)
- Default station: Hamburg
- Wind speed displayed in knots
- Chart animations disabled for performance
