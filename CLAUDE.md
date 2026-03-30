# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

German-language weather forecast visualization web app. Pure static HTML/CSS/JS — no build system, no framework, no package.json.

## How to Run

Serve files with any static HTTP server (e.g. `python -m http.server`). No install or build step needed. Open `index.html` in browser.

## Architecture

**Files:**
- `index.html` — Single-page layout with 10 stacked panels (temperature, weather symbols, wind direction/speed, wind chart, precip probability, precipitation, snowfall, sunshine, cloud cover, pressure)
- `app.js` — All application logic: API calls, rendering, chart management, state
- `style.css` — Layout and responsive styling (CSS Grid/Flexbox, mobile breakpoint at 768px)
- `weather-icons.js` — WMO weather code → emoji mapping + wind direction helpers (`degreesToArrow`, `degreesToDirection`)

**External dependencies (CDN-loaded):**
- Chart.js v4.4.7 for line/bar charts

**APIs (no auth required):**
- Open-Meteo Forecast API (`api.open-meteo.com/v1/forecast`) — hourly weather data
- Open-Meteo Geocoding API (`geocoding-api.open-meteo.com/v1/search`) — location search

## Key Concepts

**Alignment system:** All panels share a common time axis. Positioning uses percentage-based `left: idx/N * 100%` where N = total forecast hours. Chart.js x-axis is configured with `min: -0.5, max: N-0.5` to align chart data points with the CSS grid columns.

**Two rendering patterns:**
- **Chart.js panels** (temperature, wind chart, pressure): Use `<canvas>` elements, destroyed and recreated on each render. Y-axis and x-axis are hidden (`display: false`); scale labels are rendered as separate DOM overlays via `addScaleLeft()` (in panel-label) and `addScaleOverlayRight()` (inside panel-content).
- **DOM bar panels** (precip probability, precipitation, snowfall, sunshine, clouds): Pure CSS bars using `flex: 1` per hour with percentage-based heights. Max value normalized via `niceBarMax()`.

**Forecast range:** User selects 1, 2, 4, 7, or 15 days. Default is 4 days. 1/2/4-day fit viewport width; 7/15-day use scaled `minWidth` with horizontal scrolling. Icon/wind label interval adapts: 1h (1-day), 3h (2/4-day), 6h (7-day), 12h (15-day) via `getIconInterval()`.

**Day separators:** Rendered as a single full-height overlay container (`#day-sep-overlay`) positioned above all panels (not per-panel). Hourly grid lines are added per-panel via `applyGrid()`.

**Rendering flow:** `loadForecast()` → API fetch → `renderAll()` → individual panel renders + grid/axis/separator overlays.

**State:** Global variables (`tempChart`, `pressureChart`, `windChart`, `forecastDays`, `currentLat/Lon/Name`, `dayBoundaryIndices`, `N`). No framework state management.

**Station search:** Input first filters `PRESET_STATIONS` (18 German/Austrian/Swiss cities), then falls back to geocoding API with 300ms debounce.

## Conventions

- Language: German UI text, German timezone (`Europe/Berlin`)
- Default station: Hamburg
- Wind speed displayed in knots (conversion factor `KMH_TO_KNOTS = 1/1.852`)
- Chart animations disabled for performance
- Panel labels are 100px wide (50px on mobile), sticky on horizontal scroll
- Number formatting uses German locale (comma decimal separator) via `formatTickDE()`
