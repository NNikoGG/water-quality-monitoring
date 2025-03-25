import os
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, db

# Load environment variables
load_dotenv()

# Get the absolute path to the service account file
SERVICE_ACCOUNT_PATH = os.path.abspath(os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    'serviceAccountKey.json'
))

def initialize_firebase():
    """Initialize Firebase Admin SDK with service account"""
    try:
        # Check if already initialized
        if not firebase_admin._apps:
            if not os.path.exists(SERVICE_ACCOUNT_PATH):
                raise FileNotFoundError(f"Service account file not found at: {SERVICE_ACCOUNT_PATH}")
                
            # Use service account file
            cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
            firebase_admin.initialize_app(cred, {
                'databaseURL': os.getenv('FIREBASE_DATABASE_URL')
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
