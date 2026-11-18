// ---------- DOM references ----------
const searchFormEl = document.querySelector('#search-form');
const searchInputEl = document.querySelector('#search-input');
const errorMessageEl = document.querySelector('#error-message');
const loadingIndicatorEl = document.querySelector('#loading-indicator');
const historyContainerEl = document.querySelector('#history-container');

const cityNameEl = document.querySelector('#city-name');
const temperatureEl = document.querySelector('#temperature');
const humidityEl = document.querySelector('#humidity');
const windSpeedEl = document.querySelector('#wind-speed');
const forecastContainerEl = document.querySelector('#forecast-container');
const sceneEl = document.querySelector('#weather-scene');

// ---------- State ----------
let searchHistory = JSON.parse(localStorage.getItem('weatherHistory')) || [];

// OpenWeather returns wind in m/s (metric). Convert to km/h.
const toKmh = (metersPerSecond) => (metersPerSecond * 3.6).toFixed(1);

// ---------- Search history ----------
function renderSearchHistory() {
  historyContainerEl.innerHTML = '';
  for (const city of searchHistory) {
    const historyBtn = document.createElement('button');
    historyBtn.type = 'button';
    historyBtn.classList.add('history-btn');
    historyBtn.textContent = city;
    historyContainerEl.append(historyBtn);
  }
}

function saveCityToHistory(city) {
  const formattedCity = city.trim();
  searchHistory = searchHistory.filter(item => item.toLowerCase() !== formattedCity.toLowerCase());
  searchHistory.unshift(formattedCity);
  if (searchHistory.length > 5) searchHistory.pop();
  localStorage.setItem('weatherHistory', JSON.stringify(searchHistory));
  renderSearchHistory();
}

// ---------- Animated weather scene ----------
const rnd = (a, b) => a + Math.random() * (b - a);
const piece = (cls, style = '') => `<div class="${cls}" style="${style}"></div>`;

function cloudsHTML(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += piece('cloud',
      `top:${rnd(40, 320).toFixed(0)}px;scale:${rnd(0.7, 1.6).toFixed(2)};` +
      `opacity:${rnd(0.6, 0.95).toFixed(2)};animation-duration:${rnd(40, 90).toFixed(0)}s;` +
      `animation-delay:-${rnd(0, 60).toFixed(0)}s`);
  }
  return html;
}

function rainHTML(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += piece('drop',
      `left:${rnd(0, 100).toFixed(1)}%;opacity:${rnd(0.4, 0.9).toFixed(2)};` +
      `animation-duration:${rnd(0.55, 1).toFixed(2)}s;animation-delay:-${rnd(0, 2).toFixed(2)}s`);
  }
  return html;
}

function snowHTML(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    const size = rnd(4, 10).toFixed(1);
    html += piece('flake',
      `left:${rnd(0, 100).toFixed(1)}%;width:${size}px;height:${size}px;opacity:${rnd(0.5, 1).toFixed(2)};` +
      `animation-duration:${rnd(7, 14).toFixed(1)}s;animation-delay:-${rnd(0, 12).toFixed(1)}s`);
  }
  return html;
}

function starsHTML(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += piece('star',
      `left:${rnd(0, 100).toFixed(1)}%;top:${rnd(0, 90).toFixed(1)}%;` +
      `animation-duration:${rnd(2, 5).toFixed(1)}s;animation-delay:-${rnd(0, 5).toFixed(1)}s`);
  }
  return html;
}

function fogHTML(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += piece('fog',
      `top:${(i * 22 + rnd(0, 10)).toFixed(0)}%;animation-duration:${rnd(14, 26).toFixed(0)}s;` +
      `animation-delay:-${rnd(0, 10).toFixed(0)}s`);
  }
  return html;
}

function getSceneType(weather) {
  const main = weather.main.toLowerCase();
  const night = weather.icon.endsWith('n');
  if (main === 'thunderstorm') return { type: 'thunder', night };
  if (main === 'rain' || main === 'drizzle') return { type: 'rain', night };
  if (main === 'snow') return { type: 'snow', night };
  if (main === 'clouds') return { type: 'clouds', night };
  if (main === 'clear') return { type: night ? 'night' : 'sunny', night };
  return { type: 'mist', night };
}

// Test any scene from the console, e.g. showWeatherScene('snow')
function showWeatherScene(type, night = false) {
  const scenes = {
    sunny: () => '<div class="sun"><div class="sun-rays"></div><div class="sun-core"></div></div>' + cloudsHTML(3),
    clouds: () => cloudsHTML(9),
    rain: () => cloudsHTML(5) + rainHTML(140),
    thunder: () => cloudsHTML(6) + rainHTML(170) + piece('lightning'),
    snow: () => cloudsHTML(3) + snowHTML(90),
    mist: () => fogHTML(5),
    night: () => piece('moon') + starsHTML(70)
  };
  document.body.className = `theme-${type}${night ? ' is-night' : ''}`;
  sceneEl.innerHTML = `<div class="scene-inner">${scenes[type]()}</div>`;
}

function applyWeatherScene(data) {
  const { type, night } = getSceneType(data.weather[0]);
  showWeatherScene(type, night);
}

// ---------- Update UI ----------
function displayCurrentWeather(data) {
  const currentDate = new Date().toLocaleDateString();
  cityNameEl.textContent = `${data.name} (${currentDate})`;
  temperatureEl.textContent = `${Math.round(data.main.temp)}`;
  humidityEl.textContent = `${data.main.humidity}`;
  windSpeedEl.textContent = toKmh(data.wind.speed);
  applyWeatherScene(data);
}

function displayForecast(forecastList) {
  forecastContainerEl.innerHTML = '';

  // One entry per day at midday; fall back to every 8th entry if needed
  let daily = forecastList.filter(item => item.dt_txt.includes('12:00:00'));
  if (daily.length < 5) daily = forecastList.filter((_, index) => index % 8 === 0);
  daily = daily.slice(0, 5);

  for (const dailyForecast of daily) {
    const card = document.createElement('div');
    card.classList.add('forecast-card');

    const date = new Date(dailyForecast.dt * 1000);
    const dateEl = document.createElement('h3');
    dateEl.textContent = date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

    const iconEl = document.createElement('img');
    iconEl.setAttribute('src', `https://openweathermap.org/img/wn/${dailyForecast.weather[0].icon}@2x.png`);
    iconEl.setAttribute('alt', dailyForecast.weather[0].description);

    const tempEl = document.createElement('p');
    tempEl.textContent = `Temp: ${Math.round(dailyForecast.main.temp)} °C`;

    const forecastHumidityEl = document.createElement('p');
    forecastHumidityEl.textContent = `Humidity: ${dailyForecast.main.humidity}%`;

    const forecastWindEl = document.createElement('p');
    forecastWindEl.textContent = `Wind: ${toKmh(dailyForecast.wind.speed)} km/h`;

    card.append(dateEl, iconEl, tempEl, forecastHumidityEl, forecastWindEl);
    forecastContainerEl.append(card);
  }
}

// ---------- Fetching (calls our backend server) ----------
async function loadWeather(url, errorPrefix = '') {
  try {
    errorMessageEl.textContent = '';
    errorMessageEl.classList.add('hidden');
    forecastContainerEl.innerHTML = '';
    loadingIndicatorEl.classList.remove('hidden');

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'An unknown error occurred.');
    }

    const { currentWeather, forecast } = await response.json();

    displayCurrentWeather(currentWeather);
    displayForecast(forecast.list);
    saveCityToHistory(currentWeather.name);
  } catch (error) {
    console.error('Frontend Fetch Error:', error);
    errorMessageEl.textContent = errorPrefix + error.message;
    errorMessageEl.classList.remove('hidden');
  } finally {
    loadingIndicatorEl.classList.add('hidden');
  }
}

function fetchWeather(city) {
  return loadWeather(`/api/weather/${encodeURIComponent(city)}`);
}

function fetchWeatherByCoords(lat, lon) {
  return loadWeather(`/api/weather/coords?lat=${lat}&lon=${lon}`, 'Could not fetch weather for your location. ');
}

// ---------- Events ----------
searchFormEl.addEventListener('submit', (event) => {
  event.preventDefault();
  const city = searchInputEl.value.trim();

  if (city) {
    fetchWeather(city);
    searchInputEl.value = '';
  } else {
    errorMessageEl.textContent = 'Please enter a city name before searching.';
    errorMessageEl.classList.remove('hidden');
  }
});

historyContainerEl.addEventListener('click', (event) => {
  if (event.target.classList.contains('history-btn')) {
    fetchWeather(event.target.textContent);
  }
});

// ---------- Startup: geolocation, then last city, then London ----------
function loadFallbackCity() {
  fetchWeather(searchHistory.length > 0 ? searchHistory[0] : 'London');
}

function initGeolocationWeather() {
  renderSearchHistory();

  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => fetchWeatherByCoords(position.coords.latitude, position.coords.longitude),
      (error) => {
        console.warn('Geolocation permission denied or unavailable:', error.message);
        loadFallbackCity();
      },
      { timeout: 8000 }
    );
  } else {
    loadFallbackCity();
  }
}

initGeolocationWeather();
