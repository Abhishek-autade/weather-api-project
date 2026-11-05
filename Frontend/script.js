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

// ---------- State ----------
let searchHistory = JSON.parse(localStorage.getItem('weatherHistory')) || [];

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

// ---------- Update UI ----------
function displayCurrentWeather(data) {
  const currentDate = new Date().toLocaleDateString();
  cityNameEl.textContent = `${data.name} (${currentDate})`;
  temperatureEl.textContent = `${Math.round(data.main.temp)}`;
  humidityEl.textContent = `${data.main.humidity}`;
  windSpeedEl.textContent = `${data.wind.speed}`;
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

    card.append(dateEl, iconEl, tempEl, forecastHumidityEl);
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
