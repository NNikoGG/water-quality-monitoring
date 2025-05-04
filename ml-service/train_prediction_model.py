import pandas as pd
import numpy as np
import firebase_admin
from firebase_admin import credentials, db, initialize_app
from app.models.lstm_model import WaterQualityLSTM
import os
from dotenv import load_dotenv

# Load .env file for local development
if os.getenv("COOLIFY") != "true":
    load_dotenv()

def initialize_firebase():
    """Initialize Firebase Admin SDK with environment variables"""
    try:
        # Check if already initialized
        if not firebase_admin._apps:
            # Check for required environment variables
            required_env_vars = [
                "FIREBASE_PROJECT_ID",
                "FIREBASE_PRIVATE_KEY_ID",
                "FIREBASE_PRIVATE_KEY",
                "FIREBASE_CLIENT_EMAIL",
                "FIREBASE_CLIENT_ID",
                "FIREBASE_CLIENT_CERT_URL",
                "FIREBASE_DATABASE_URL"
            ]
            for var in required_env_vars:
                if not os.getenv(var):
                    raise EnvironmentError(f"Missing required environment variable: {var}")

            # Format private key
            private_key = os.getenv("FIREBASE_PRIVATE_KEY")
            if private_key:
                private_key = private_key.replace('\\n', '\n')

            # Create credentials dictionary
            cred = credentials.Certificate({
                "type": "service_account",
                "project_id": os.getenv("FIREBASE_PROJECT_ID"),
                "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
                "private_key": private_key,
                "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
                "client_id": os.getenv("FIREBASE_CLIENT_ID"),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_CERT_URL")
            })

            # Initialize Firebase
            initialize_app(cred, {
                'databaseURL': os.getenv('FIREBASE_DATABASE_URL')
            })
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        raise

def fetch_data_from_firebase():
    """Fetch water quality data from Firebase"""
    # Initialize Firebase if not already initialized
    initialize_firebase()

    # Get reference to sensor_data node
    ref = db.reference('sensor_data')
    
    # Get all data
    data = ref.get()
    
    if not data:
        return pd.DataFrame()
    
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
    os.makedirs('app/models/saved', exist_ok=True)
    model.save(
        'app/models/saved/lstm_model',  # Will save as lstm_model.keras
        'app/models/saved/lstm_model_scaler.pkl'
    )
    print("Model training completed!")

if __name__ == "__main__":
    main()