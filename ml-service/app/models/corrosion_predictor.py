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
        self.sequence_length = 10  # We'll use 10 time steps for prediction
        
    def preprocess_data(self, data):
        """Preprocess the input data for LSTM model"""
        # Assuming data has columns: pH, TDS, temperature, etc.
        scaled_data = self.scaler.fit_transform(data)
        X, y = [], []
        
        for i in range(len(scaled_data) - self.sequence_length):
            X.append(scaled_data[i:(i + self.sequence_length)])
            # 1 for corrosive, 0 for non-corrosive
            y.append(1 if data['is_corrosive'].iloc[i + self.sequence_length] else 0)
            
        return np.array(X), np.array(y)
    
    def build_model(self, input_shape):
        """Build the LSTM model architecture"""
        self.model = Sequential([
            LSTM(64, input_shape=input_shape, return_sequences=True),
            Dropout(0.2),
            LSTM(32),
            Dropout(0.2),
            Dense(16, activation='relu'),
            Dense(1, activation='sigmoid')
        ])
        
        self.model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy']
        )
        
    def train(self, X_train, y_train, epochs=50, batch_size=32, validation_split=0.2):
        """Train the LSTM model"""
        if self.model is None:
            self.build_model((X_train.shape[1], X_train.shape[2]))
            
        return self.model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            verbose=1
        )
    
    def predict(self, sequence):
        """Make predictions on new data"""
        if self.model is None:
            raise ValueError("Model not trained yet")
            
        # Convert sequence to DataFrame if it's a numpy array
        if isinstance(sequence, np.ndarray):
            sequence = pd.DataFrame(sequence, columns=['ph', 'turbidity', 'tds', 'temperature', 'conductivity'])
            
        # Check if the sequence is corrosive based on actual values
        current_corrosive = is_corrosive(sequence.iloc[-1].to_dict())
            
        # Ensure sequence is properly scaled
        try:
            # Convert to numpy array before scaling to avoid the warning
            sequence_values = sequence[['ph', 'turbidity', 'tds', 'temperature', 'conductivity']].values
            scaled_sequence = self.scaler.transform(sequence_values)
        except ValueError as e:
            print(f"Scaling error: {e}")
            print("Attempting to reshape data...")
            # Try to reshape the data if needed
            if len(sequence.shape) == 2 and sequence.shape[0] >= self.sequence_length:
                sequence = sequence[-self.sequence_length:]
                sequence_values = sequence[['ph', 'turbidity', 'tds', 'temperature', 'conductivity']].values
                scaled_sequence = self.scaler.transform(sequence_values)
            else:
                raise ValueError(f"Invalid sequence shape: {sequence.shape}. Expected ({self.sequence_length}, 5)")
        
        # Reshape for prediction
        X = scaled_sequence.reshape(1, self.sequence_length, -1)
        
        # Get prediction
        prediction = self.model.predict(X)
        risk_probability = float(prediction[0][0])
        
        # Determine risk level based on both model prediction and current conditions
        if current_corrosive:
            risk_level = 'High'
            # Adjust probability to be in the high range
            risk_probability = max(0.7, risk_probability)
        else:
            if risk_probability > 0.7:
                risk_level = 'High'
            elif risk_probability > 0.3:
                risk_level = 'Medium'
            else:
                risk_level = 'Low'
        
        return {
            'risk_probability': risk_probability,
            'risk_level': risk_level,
            'current_conditions_corrosive': current_corrosive
        }
    
    def save_model(self, model_path, scaler_path):
        """Save the model and scaler"""
        if self.model is None:
            raise ValueError("No model to save")
        
        self.model.save(model_path)
        joblib.dump(self.scaler, scaler_path)
    
    def load_model(self, model_path, scaler_path):
        """Load the saved model and scaler"""
        self.model = tf.keras.models.load_model(model_path)
        self.scaler = joblib.load(scaler_path) 