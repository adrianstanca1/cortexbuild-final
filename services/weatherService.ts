import { DailyLog } from '@/types';

interface WeatherData {
    temp: number;
    condition: string;
    windSpeed: number;
    precipitation: number;
}

export const getWeather = async (date: string, lat: number = 51.5074, lon: number = -0.1278): Promise<WeatherData> => {
    try {
        // OpenMeteo API (Free, no key)
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_sum,windspeed_10m_max,weathercode&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&start_date=${date}&end_date=${date}`
        );
        const data = await response.json();

        if (!data.daily) throw new Error("No weather data found");

        const code = data.daily.weathercode[0];
        let condition = "Clear";

        // Simple WMO code mapping
        if (code >= 1 && code <= 3) condition = "Partly Cloudy";
        if (code >= 45 && code <= 48) condition = "Foggy";
        if (code >= 51 && code <= 67) condition = "Rain";
        if (code >= 71 && code <= 77) condition = "Snow";
        if (code >= 80 && code <= 82) condition = "Heavy Rain";
        if (code >= 95) condition = "Thunderstorm";

        return {
            temp: data.daily.temperature_2m_max[0],
            condition,
            windSpeed: data.daily.windspeed_10m_max[0],
            precipitation: data.daily.precipitation_sum[0]
        };
    } catch (error) {
        console.error("Weather fetch failed:", error);
        // Fallback Mock Data
        return {
            temp: 18,
            condition: "Sunny (Mock)",
            windSpeed: 12,
            precipitation: 0
        };
    }
};
