import os
import pandas as pd
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, db

def initialize_firebase():
    """Initialize Firebase Admin SDK with service account"""
    try:
        # Check if already initialized
        if not firebase_admin._apps:
            cred_path = os.getenv("FIREBASE_CREDENTIALS", "/app/serviceAccountKey.json")
            if not os.path.exists(cred_path):
                raise FileNotFoundError(f"Service account file not found at: {cred_path}")
                
            # Use service account file
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, {
                'databaseURL': os.getenv("FIREBASE_DATABASE_URL")
            })
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        raise

def fetch_sensor_data():
    """Fetch sensor data from Firebase Realtime Database"""
    try:
        # Initialize Firebase if not already initialized
        initialize_firebase()
        
        # Get reference to sensor_data
        ref = db.reference('sensor_data')
        
        # Get all data
        data = ref.get()
        if not data:
            return pd.DataFrame()
            
        # Convert to list of dictionaries
        records = []
        for key, value in data.items():
            value['timestamp'] = datetime.strptime(value['timestamp'], '%Y-%m-%d %H:%M:%S')
            records.append(value)
            
        # Convert to DataFrame and sort by timestamp
        df = pd.DataFrame(records)
        df = df.sort_values('timestamp')
        
        return df
        
    except Exception as e:
        print(f"Error fetching sensor data: {e}")
        return pd.DataFrame()