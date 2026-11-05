require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_BASE = 'https://api.openweathermap.org/data/2.5';

app.use(express.static(path.join(__dirname, 'Frontend')));

async function sendWeather(params, res, notFoundMessage) {
  const { API_KEY } = process.env;
  if (!API_KEY) {
    return res.status(500).json({ error: 'API key is missing on the server.' });
  }

  const query = new URLSearchParams({ ...params, appid: API_KEY, units: 'metric' }).toString();

  const [currentResponse, forecastResponse] = await Promise.all([
    fetch(`${API_BASE}/weather?${query}`),
    fetch(`${API_BASE}/forecast?${query}`),
  ]);

  if (currentResponse.status === 404 || forecastResponse.status === 404) {
    return res.status(404).json({ error: notFoundMessage });
  }
  if (!currentResponse.ok || !forecastResponse.ok) {
    return res.status(502).json({ error: 'Weather service error. Please try again.' });
  }

  const currentWeather = await currentResponse.json();
  const forecast = await forecastResponse.json();
  res.json({ currentWeather, forecast });
}

// Coordinates route (must stay above the :city route)
app.get('/api/weather/coords', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }
    await sendWeather({ lat, lon }, res, 'No weather found for those coordinates.');
  } catch (error) {
    console.error('Error fetching weather by coords:', error.message);
    res.status(500).json({ error: 'Failed to fetch weather data.' });
  }
});

// City name route
app.get('/api/weather/:city', async (req, res) => {
  try {
    await sendWeather({ q: req.params.city }, res, 'City not found.');
  } catch (error) {
    console.error('Error fetching weather data:', error.message);
    res.status(500).json({ error: 'Failed to fetch weather data.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
