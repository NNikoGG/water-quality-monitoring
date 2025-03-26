from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from app.utils.firebase_client import fetch_sensor_data
from app.models.lstm_model import WaterQualityLSTM
from app.models.corrosion_predictor import CorrosionPredictor
from app.models.water_quality_classifier import WaterQualityClassifier
from app.utils.data_processor import combine_and_prepare_data, analyze_data_distribution
import numpy as np
from datetime import datetime, timedelta
import os
import pandas as pd
from typing import List, Dict, Union, Annotated
from pydantic import BaseModel, Field, RootModel
from typing_extensions import Annotated

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data validation models
class SensorReading(BaseModel):
    ph: float = Field(ge=0, le=14)
    turbidity: float = Field(ge=0)
    tds: float = Field(ge=0)
    temperature: float = Field(ge=0, le=100)
    conductivity: float = Field(ge=0)
    timestamp: str

class CorrosionData(BaseModel):
    readings: List[SensorReading]

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

# Initialize corrosion predictor
corrosion_model = CorrosionPredictor()
try:
    corrosion_model.load_model('app/models/saved/corrosion_model', 'app/models/saved/corrosion_scaler.pkl')
except OSError:
    print("No saved corrosion model found. Model will need to be trained with corrosion data.")

# Initialize water quality classifier
quality_classifier = WaterQualityClassifier()
try:
    print("\nLoading water quality classifier...")
    quality_classifier.load_model('app/models/saved/quality_classifier', 'app/models/saved/quality_scaler.pkl')
    print("Water quality classifier loaded successfully!")
except OSError as e:
    print(f"\nError loading quality classifier: {str(e)}")
    print("No saved quality classifier found. Model will be trained with available data.")
    # Train with available data
    print("\nTraining new quality classifier...")
    df = fetch_sensor_data()
    if not df.empty:
        training_results = quality_classifier.train(df)
        print(f"\nTraining results: {training_results}")
        # Save the trained model
        os.makedirs('app/models/saved', exist_ok=True)
        quality_classifier.save_model(
            'app/models/saved/quality_classifier',
            'app/models/saved/quality_scaler.pkl'
        )
        print("New quality classifier saved successfully!")
    else:
        print("No data available for training")

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

@app.post("/train-corrosion-model")
async def train_corrosion_model(
    corrosive_data: CorrosionData,
    sequence_length: int = Query(default=10, ge=5, le=50)
):
    try:
        # Convert the readings to a list of dictionaries
        corrosive_list = [reading.dict() for reading in corrosive_data.readings]
        
        # Fetch non-corrosive data from Firebase
        non_corrosive_df = fetch_sensor_data()
        if non_corrosive_df.empty:
            raise HTTPException(status_code=400, detail="No sensor data available in Firebase")
        
        print(f"Loaded {len(corrosive_list)} corrosive samples and {len(non_corrosive_df)} non-corrosive samples")
        
        # Convert DataFrame to list of dictionaries
        non_corrosive_list = non_corrosive_df.to_dict('records')
        
        # Prepare data
        X_train, y_train, scaler = combine_and_prepare_data(
            corrosive_list,
            non_corrosive_list,
            sequence_length
        )
        
        # Analyze data distribution
        distribution = analyze_data_distribution(y_train)
        print("Data distribution:", distribution)
        
        # Build and train model
        if corrosion_model.model is None:
            corrosion_model.build_model((sequence_length, X_train.shape[2]))
        
        # Set the scaler in the model
        corrosion_model.scaler = scaler
        
        # Train model
        history = corrosion_model.train(X_train, y_train)
        
        # Save the trained model and scaler
        os.makedirs('app/models/saved', exist_ok=True)
        corrosion_model.save_model('app/models/saved/corrosion_model', 'app/models/saved/corrosion_scaler.pkl')
        
        return {
            "message": "Model trained successfully",
            "data_distribution": distribution,
            "training_history": history.history,
            "model_parameters": {
                "sequence_length": sequence_length,
                "input_features": X_train.shape[2],
                "total_sequences": len(X_train)
            }
        }
        
    except Exception as e:
        print(f"Training error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/predict-corrosion")
async def predict_corrosion():
    try:
        # Fetch recent data
        df = fetch_sensor_data()
        if df.empty:
            return {"error": "No sensor data available"}
        
        # Get last 10 readings for current prediction
        recent_data = df[['ph', 'turbidity', 'tds', 'temperature', 'conductivity']].tail(10).values
        
        # Make prediction for current state
        prediction = corrosion_model.predict(recent_data)
        prediction['timestamp'] = df['timestamp'].iloc[-1].isoformat()
        
        return prediction
    except Exception as e:
        return {"error": str(e)}

@app.post("/train-corrosion-model/analyze")
async def analyze_corrosion_data(
    corrosive_data: CorrosionData,
    sequence_length: int = Query(default=10, ge=5, le=50)
):
    try:
        # Convert the readings to a list of dictionaries
        corrosive_list = [reading.dict() for reading in corrosive_data.readings]
        
        # Fetch non-corrosive data from Firebase
        non_corrosive_df = fetch_sensor_data()
        if non_corrosive_df.empty:
            raise HTTPException(status_code=400, detail="No sensor data available in Firebase")
        
        # Convert DataFrame to list of dictionaries
        non_corrosive_list = non_corrosive_df.to_dict('records')
        
        # Prepare data just to get distribution
        X_train, y_train, _ = combine_and_prepare_data(
            corrosive_list,
            non_corrosive_list,
            sequence_length
        )
        
        # Analyze data distribution
        distribution = analyze_data_distribution(y_train)
        print("Data distribution:", distribution)
        
        return {
            "data_distribution": distribution
        }
        
    except Exception as e:
        print(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train-quality-classifier")
async def train_quality_classifier():
    try:
        # Fetch all available data
        df = fetch_sensor_data()
        if df.empty:
            raise HTTPException(status_code=400, detail="No sensor data available")
        
        # Train the model
        training_results = quality_classifier.train(df)
        
        # Save the trained model
        os.makedirs('app/models/saved', exist_ok=True)
        quality_classifier.save_model(
            'app/models/saved/quality_classifier',
            'app/models/saved/quality_scaler.pkl'
        )
        
        return {
            "message": "Quality classifier trained successfully",
            "training_results": training_results
        }
        
    except Exception as e:
        print(f"Training error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/predict-quality")
async def predict_quality():
    try:
        # Fetch recent data
        print("\nFetching recent data for quality prediction...")
        df = fetch_sensor_data()
        if df.empty:
            return {"error": "No sensor data available"}
        
        # Get latest reading
        latest_reading = df.iloc[-1].to_dict()
        print(f"\nLatest reading: {latest_reading}")
        
        # Make prediction
        print("\nMaking prediction...")
        prediction = quality_classifier.predict(latest_reading)
        print(f"\nPrediction result: {prediction}")
        
        return prediction
    except Exception as e:
        print(f"\nError in predict_quality: {str(e)}")
        return {"error": str(e)}

