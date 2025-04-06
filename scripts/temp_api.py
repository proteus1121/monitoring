import requests
import json
from datetime import datetime, timedelta

# Function to generate Unix timestamp for a given date
def to_unix_timestamp(date_str):
    dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
    return int(dt.timestamp())

# Function to save data to SQL file
def save_to_sql_file(weather_data, file_name="weather_data.sql"):
    with open(file_name, "w") as file:
        file.write("INSERT INTO sensor_data (device_id, timestamp, value)\nVALUES\n")
        for record in weather_data:
            timestamp = record.get('timestamp')
            value = record.get('value')
            if timestamp and value is not None:
                # Assuming 'device_id' is static for this example (can change as per actual data)
                device_id = 1
                file.write(f"({device_id}, '{timestamp}', {value}),\n")
        file.truncate()  # Remove trailing comma from last entry
        file.write(";\n")

# Function to fetch weather data from Open-Meteo API
def fetch_weather_data(lat, lon, start_date, end_date):
    url = f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}&start_date={start_date}&end_date={end_date}&hourly=temperature_2m&timezone=auto"
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        
        # Debug: Print raw API response to inspect structure
        print(json.dumps(data, indent=4))  # Pretty-print the response for inspection
        
        hourly_data = data.get('hourly', {})
        times = hourly_data.get('time', [])
        temperatures = hourly_data.get('temperature_2m', [])
        
        weather_data = []
        
        # Process hourly data to fit the SQL format
        for timestamp, temp in zip(times, temperatures):
            if temp is not None:  # Skip null values
                weather_data.append({'timestamp': timestamp, 'value': temp})
            else:
                print(f"Skipping data for {timestamp} due to missing temperature")
        
        if not weather_data:
            print("No valid weather data found.")
        
        return weather_data
    else:
        print(f"Failed to fetch data. Status Code: {response.status_code}")
        return []

# Example usage
lat, lon = 46.4857, 30.7438  # Coordinates for Odesa, Ukraine
start_date = "2024-12-01"
end_date = "2025-01-28"

weather_data = fetch_weather_data(lat, lon, start_date, end_date)
if weather_data:
    save_to_sql_file(weather_data)
    print("Data saved to SQL file.")
else:
    print("No weather data fetched.")
