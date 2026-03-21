// WMO Weather interpretation codes → SVG icon + description (German)
// Reference: https://open-meteo.com/en/docs#weathervariables
const WEATHER_ICONS = {
  0:  { icon: '☀️', desc: 'Klar' },
  1:  { icon: '🌤️', desc: 'Überwiegend klar' },
  2:  { icon: '⛅', desc: 'Teilweise bewölkt' },
  3:  { icon: '☁️', desc: 'Bedeckt' },
  45: { icon: '🌫️', desc: 'Nebel' },
  48: { icon: '🌫️', desc: 'Reifnebel' },
  51: { icon: '🌦️', desc: 'Leichter Nieselregen' },
  53: { icon: '🌦️', desc: 'Mäßiger Nieselregen' },
  55: { icon: '🌦️', desc: 'Dichter Nieselregen' },
  56: { icon: '🌧️', desc: 'Gefrierender Nieselregen (leicht)' },
  57: { icon: '🌧️', desc: 'Gefrierender Nieselregen (dicht)' },
  61: { icon: '🌧️', desc: 'Leichter Regen' },
  63: { icon: '🌧️', desc: 'Mäßiger Regen' },
  65: { icon: '🌧️', desc: 'Starker Regen' },
  66: { icon: '🌧️', desc: 'Gefrierender Regen (leicht)' },
  67: { icon: '🌧️', desc: 'Gefrierender Regen (stark)' },
  71: { icon: '🌨️', desc: 'Leichter Schneefall' },
  73: { icon: '🌨️', desc: 'Mäßiger Schneefall' },
  75: { icon: '🌨️', desc: 'Starker Schneefall' },
  77: { icon: '🌨️', desc: 'Schneekörner' },
  80: { icon: '🌦️', desc: 'Leichte Regenschauer' },
  81: { icon: '🌧️', desc: 'Mäßige Regenschauer' },
  82: { icon: '🌧️', desc: 'Heftige Regenschauer' },
  85: { icon: '🌨️', desc: 'Leichte Schneeschauer' },
  86: { icon: '🌨️', desc: 'Starke Schneeschauer' },
  95: { icon: '⛈️', desc: 'Gewitter' },
  96: { icon: '⛈️', desc: 'Gewitter mit leichtem Hagel' },
  99: { icon: '⛈️', desc: 'Gewitter mit starkem Hagel' },
};

function getWeatherIcon(code) {
  return WEATHER_ICONS[code] || { icon: '❓', desc: 'Unbekannt' };
}

function degreesToDirection(deg) {
  const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(deg / 45) % 8;
  return dirs[index];
}

function degreesToArrow(deg) {
  // Wind comes FROM this direction, arrow shows where it blows TO
  const arrows = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘'];
  const index = Math.round(deg / 45) % 8;
  return arrows[index];
}
