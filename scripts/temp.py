import math
from datetime import datetime, timedelta

# Set the starting date (7 days ago) and initial value
end_date = datetime.now()
start_date = end_date - timedelta(days=7)

# Constants for temperature simulation
base_temp = -5  # Starting base temperature (January, cold)
daily_max_temp = 10  # Max temperature to reach by the end of the day

# Open a file to write the SQL statement
with open('sensor_data_insert.sql', 'w') as file:
    # Write the header for the INSERT statement
    file.write("INSERT INTO sensor_data (device_id, timestamp, value)\nVALUES\n")
    
    # Generate SQL for hourly intervals and realistic temperatures over the last 7 days
    sql_values = []
    for day in range(7):  # 7 days
        # Get the start of the day
        current_day_start = start_date + timedelta(days=day)
        
        for hour in range(24):  # 24 hours in each day
            # Simulate a sine wave for temperature fluctuation
            # The sine wave oscillates between -1 and 1, creating day-night temperature pattern
            temp_variation = math.sin((hour / 24) * 2 * math.pi)  # Sine wave for daily cycle
            # Scale the temperature from base to max value
            temperature = base_temp + (daily_max_temp - base_temp) * ((temp_variation + 1) / 2)
            # Round to 2 decimal places for realistic temperature values
            temperature = round(temperature, 2)
            
            # Create timestamp for current hour
            timestamp = current_day_start + timedelta(hours=hour)
            
            # Append the SQL insert value for this hour
            sql_values.append(f"(1, '{timestamp.strftime('%Y-%m-%d %H:%M:%S')}', {temperature})")
    
    # Write the values to the file, separated by commas
    file.write(",\n".join(sql_values) + ";\n")

print("SQL Insert statement written to 'sensor_data_insert.sql'")
