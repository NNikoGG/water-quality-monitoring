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
    # Fetch recent data
    df = fetch_sensor_data()
    features = df[['ph', 'turbidity', 'tds', 'temperature', 'conductivity']].values[-10:]
    
    # Make predictions
    predictions = model.predict(features, n_steps=24)  # Predict next 24 points
    
    # Generate future timestamps
    last_timestamp = df['timestamp'].max()
    future_timestamps = [
        (last_timestamp + timedelta(hours=i)).isoformat()
        for i in range(1, 25)
    ]
    
    # Format response
    response = {
        "timestamps": future_timestamps,
        "predictions": {
            "ph": predictions[:, 0].tolist(),
            "turbidity": predictions[:, 1].tolist(),
            "tds": predictions[:, 2].tolist(),
            "temperature": predictions[:, 3].tolist(),
            "conductivity": predictions[:, 4].tolist()
        }
    }
    
    return response
