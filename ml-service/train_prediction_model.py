import pandas as pd
import numpy as np
import firebase_admin
from firebase_admin import credentials, db, initialize_app
from app.models.lstm_model import WaterQualityLSTM
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def fetch_data_from_firebase():
    """Fetch water quality data from Firebase"""
    # Initialize Firebase Admin SDK if not already initialized
    if not len(firebase_admin._apps):
        cred = credentials.Certificate("serviceAccountKey.json")
        initialize_app(cred, {
            'databaseURL': os.getenv('FIREBASE_DATABASE_URL')
        })

    # Get reference to sensor_data node
    ref = db.reference('sensor_data')
    
    # Get all data
    data = ref.get()
    
    # Convert to DataFrame
    df = pd.DataFrame.from_dict(data, orient='index')
    
    # Sort by timestamp
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp')
    
    # Select features for prediction
    features = ['ph', 'turbidity', 'tds', 'temperature', 'conductivity']
    return df[features]

def main():
    print("Fetching data from Firebase...")
    data = fetch_data_from_firebase()
    
    print("Creating and training LSTM model...")
    model = WaterQualityLSTM()
    
    # Train the model with sequence length of 10
    model.train(data, seq_length=10)
    
    print("Saving model...")
    os.makedirs('app/models/saved/lstm_model', exist_ok=True)
    model.save(
        'app/models/saved/lstm_model/model',
        'app/models/saved/lstm_model/scaler.pkl'
    )
    print("Model training completed!")

if __name__ == "__main__":
    main() 