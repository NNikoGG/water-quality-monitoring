import json
import requests
from datetime import datetime

def train_corrosion_model():
    # Load corrosion data
    with open('corrosion_data.json', 'r') as f:
        try:
            # Load the JSON data
            file_data = json.load(f)
            
            # Check if the data is nested under 'corrosion_data'
            raw_data = file_data.get('corrosion_data', file_data)
            
            if not isinstance(raw_data, dict):
                print("Error: Invalid data format in corrosion_data.json")
                return
            
            # Convert the data format to match the API expectation
            corrosion_data = []  # Change to list instead of dictionary
            for timestamp, value in raw_data.items():
                try:
                    # Ensure all required fields are present
                    required_fields = ['ph', 'turbidity', 'tds', 'temperature', 'conductivity']
                    if not all(field in value for field in required_fields):
                        print(f"Skipping data point {timestamp}: missing required fields")
                        continue

                    # Convert all values to float and ensure timestamp is present
                    data_point = {
                        "ph": float(value["ph"]),
                        "turbidity": float(value["turbidity"]),
                        "tds": float(value["tds"]),
                        "temperature": float(value["temperature"]),
                        "conductivity": float(value["conductivity"]),
                        "timestamp": value.get("timestamp", timestamp)  # Use existing timestamp or key as fallback
                    }
                    
                    # Validate timestamp format
                    if not data_point["timestamp"]:
                        print(f"Skipping data point {timestamp}: missing timestamp")
                        continue

                    # Add the validated data point to the list
                    corrosion_data.append(data_point)

                except (KeyError, ValueError, TypeError) as e:
                    print(f"Skipping invalid data point {timestamp}: {str(e)}")
                    continue
            
            if not corrosion_data:
                print("Error: No valid data points found in corrosion_data.json")
                return
            
            # API endpoint
            url = 'http://localhost:8000/train-corrosion-model'
            
            # Training parameters
            params = {
                'sequence_length': 10  # You can adjust this value
            }
            
            try:
                print("\nPreparing to analyze data distribution...")
                print(f"Number of valid data points: {len(corrosion_data)}")
                
                # First, just get the data distribution without training
                response = requests.post(url + "/analyze", json={"readings": corrosion_data}, params=params)
                response.raise_for_status()
                
                # Print data distribution
                result = response.json()
                print("\nData Distribution Analysis:")
                print("=" * 50)
                for key, value in result['data_distribution'].items():
                    print(f"{key}: {value}")
                
                # Ask for confirmation
                while True:
                    proceed = input("\nDoes the data distribution look correct? (y/n): ").lower()
                    if proceed in ['y', 'n']:
                        break
                    print("Please enter 'y' or 'n'")
                
                if proceed == 'n':
                    print("\nTraining cancelled. Please fix the data distribution issues.")
                    return
                
                print("\nProceeding with model training...")
                
                # Send POST request to train model
                response = requests.post(url, json={"readings": corrosion_data}, params=params)
                response.raise_for_status()
                
                # Print training results
                result = response.json()
                print("\nTraining Results:")
                print("=" * 50)
                print(f"Status: {result['message']}")
                
                print("\nModel Parameters:")
                for key, value in result['model_parameters'].items():
                    print(f"{key}: {value}")
                
                print("\nTraining History:")
                history = result['training_history']
                for epoch, (loss, acc) in enumerate(zip(history['loss'], history['accuracy']), 1):
                    print(f"Epoch {epoch}: loss = {loss:.4f}, accuracy = {acc:.4f}")
                    
            except requests.exceptions.RequestException as e:
                print(f"Error during training: {e}")
                if hasattr(e, 'response') and e.response is not None:
                    print(f"Server response: {e.response.text}")
                    
        except json.JSONDecodeError as e:
            print(f"Error reading JSON file: {e}")
            return

if __name__ == '__main__':
    train_corrosion_model() 