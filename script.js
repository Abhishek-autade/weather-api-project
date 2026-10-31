// Store the API key in a constant variable.
const API_KEY = '1fb04bd2162d6ead080de1654698f657';

async function fetchWeather(city) {
  // NEW: The `try` block encloses the code that might throw an error.
  // If any line inside this block fails, execution will immediately jump to the `catch` block.
  try {
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      // Our custom error for bad responses (e.g., 404 Not Found)
      throw new Error('City not found or API error.');
    }

    const weatherData = await response.json();

    console.log(weatherData);

  // NEW: The `catch` block. This code only runs if an error was thrown in the `try` block.
  // The 'error' parameter will contain the Error object that was thrown.
  } catch (error) {
    // We use console.error to log the error to the console. This is better for
    // debugging as it clearly marks the output as an error.
    console.error('Failed to fetch weather data:', error);
  }
}

// We are still calling the function with a default city to test it.
fetchWeather('ThisIsClearlyNotARealCit');