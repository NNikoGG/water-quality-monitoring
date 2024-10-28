from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.utils.firebase_client import fetch_sensor_data
from app.models.lstm_model import WaterQualityLSTM
import numpy as np
from datetime import datetime, timedelta
import os

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model
model = WaterQualityLSTM()
try:
    model.load('app/models/saved/lstm_model', 'app/models/saved/scaler.pkl')
except OSError:
    # Train model if saved model doesn't exist
    # You'll need to implement this part to fetch training data and train the model
    print("No saved model found. Training new model...")
    training_data = fetch_sensor_data()  # Get historical data
    if not training_data.empty:
        features = training_data[['ph', 'turbidity', 'tds', 'temperature', 'conductivity']]
        model.train(features)
        # Save the trained model
        os.makedirs('app/models/saved', exist_ok=True)
        model.save('app/models/saved/lstm_model', 'app/models/saved/scaler.pkl')

@app.get("/predict")
async def get_predictions():
    try:
        # Fetch recent data
        df = fetch_sensor_data()
        if df.empty:
            return {"error": "No sensor data available"}
        
        print(f"Full dataset shape: {df.shape}")  # Debug
        print(f"Available columns: {df.columns.tolist()}")  # Debug
        
        # Check for missing values
        missing_values = df[['ph', 'turbidity', 'tds', 'temperature', 'conductivity']].isnull().sum()
        print(f"Missing values per column: {missing_values}")  # Debug
        
        features = df[['ph', 'turbidity', 'tds', 'temperature', 'conductivity']].values[-10:]
        print(f"Input features shape: {features.shape}")  # Debug
        
        # Make predictions
        predictions = model.predict(features, n_steps=24)
        print(f"Raw predictions shape: {predictions.shape}")  # Debug
        
        # Generate future timestamps
        last_timestamp = df['timestamp'].max()
        future_timestamps = [
            (last_timestamp + timedelta(hours=i)).isoformat()
            for i in range(1, 25)
        ]
        
        # Helper function to clean predictions
        def clean_predictions(arr):
            cleaned = [float(x) if not (np.isnan(x) or np.isinf(x)) else None for x in arr]
            print(f"Cleaned predictions: {cleaned[:5]}...")  # Debug log
            return cleaned
        
        response = {
            "timestamps": future_timestamps,
            "predictions": {
                "ph": clean_predictions(predictions[:, 0]),
                "turbidity": clean_predictions(predictions[:, 1]),
                "tds": clean_predictions(predictions[:, 2]),
                "temperature": clean_predictions(predictions[:, 3]),
                "conductivity": clean_predictions(predictions[:, 4])
            }
        }
        
        return response
    except Exception as e:
        print(f"Prediction error: {str(e)}")  # Debug log
        raise

