import os
import requests
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from sklearn.preprocessing import MinMaxScaler
import joblib
import pandas as pd
from app.utils.data_processor import is_corrosive

class CorrosionPredictor:
    def __init__(self):
        self.model = None
        self.scaler = MinMaxScaler()
        self.sequence_length = 10
        self.api_url = os.getenv("API_URL", "http://localhost:8080")  # Fallback 8080

    def preprocess_data(self, data):
        """Preprocess the input data for LSTM model"""
        sensor_features = ['ph', 'turbidity', 'tds', 'temperature', 'conductivity']
        scaled_data = self.scaler.fit_transform(data[sensor_features])
        X, y = [], []
        for i in range(len(scaled_data) - self.sequence_length):
            X.append(scaled_data[i:(i + self.sequence_length)])
            y.append(1 if data['is_corrosive'].iloc[i + self.sequence_length] else 0)
        return np.array(X), np.array(y)

    def train_model(self, corrosive_data):
        """Train the model by calling the API endpoint"""
        url = f"{self.api_url}/train-corrosion-model"
        payload = {"readings": corrosive_data}
        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            print("Model trained successfully:", response.json())
            return response.json()
        except requests.RequestException as e:
            raise Exception(f"Failed to train model: {str(e)}")

    def build_model(self, input_shape):
        """Build the LSTM model"""
        self.model = Sequential([
            LSTM(64, input_shape=input_shape, return_sequences=True),
            Dropout(0.2),
            LSTM(32),
            Dropout(0.2),
            Dense(16, activation='relu'),
            Dense(1, activation='sigmoid')
        ])
        self.model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

    def train(self, X_train, y_train, epochs=50, batch_size=32, validation_split=0.2):
        """Train the model locally (used by /train-corrosion-model endpoint)"""
        if self.model is None:
            self.build_model((X_train.shape[1], X_train.shape[2]))
        return self.model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            verbose=1
        )

    def predict(self, data):
        """Predict corrosion risk"""
        sensor_features = ['ph', 'turbidity', 'tds', 'temperature', 'conductivity']
        if isinstance(data, pd.DataFrame):
            X = data[sensor_features].values
        else:
            X = data
        if X.shape[0] < self.sequence_length:
            raise ValueError(f"Input data must have at least {self.sequence_length} timesteps")
        X_scaled = self.scaler.transform(X)
        X_sequence = np.array([X_scaled[-self.sequence_length:]])
        prediction = self.model.predict(X_sequence, verbose=0)[0][0]
        risk_level = "High" if prediction > 0.7 else "Medium" if prediction > 0.3 else "Low"
        return {
            "risk_probability": float(prediction),
            "risk_level": risk_level,
            "current_conditions_corrosive": bool(prediction > 0.5)
        }

    def save_model(self, model_path, scaler_path):
        """Save the model and scaler"""
        if not model_path.endswith('.keras'):
            model_path = model_path + '.keras'
        self.model.save(model_path)
        joblib.dump(self.scaler, scaler_path)
        print(f"Model saved to {model_path}, scaler saved to {scaler_path}")

    def load_model(self, model_path, scaler_path):
        """Load the model and scaler"""
        try:
            if not model_path.endswith('.keras'):
                model_path = model_path + '.keras'
            self.model = tf.keras.models.load_model(model_path)
            self.scaler = joblib.load(scaler_path)
            print(f"Model loaded from {model_path}, scaler loaded from {scaler_path}")
        except Exception as e:
            print(f"Error loading model or scaler: {str(e)}")
            raise