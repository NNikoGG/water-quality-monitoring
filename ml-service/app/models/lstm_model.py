import numpy as np
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler
import joblib

class WaterQualityLSTM:
    def __init__(self):
        self.model = None
        self.scaler = MinMaxScaler()
        
    def create_sequences(self, data, seq_length):
        X, y = [], []
        for i in range(len(data) - seq_length):
            X.append(data[i:(i + seq_length)])
            y.append(data[i + seq_length])
        return np.array(X), np.array(y)
    
    def build_model(self, seq_length, n_features):
        model = tf.keras.Sequential([
            tf.keras.layers.LSTM(50, activation='relu', input_shape=(seq_length, n_features)),
            tf.keras.layers.Dense(25, activation='relu'),
            tf.keras.layers.Dense(n_features)
        ])
        model.compile(optimizer='adam', loss='mse')
        return model
    
    def train(self, df, seq_length=10):
        # Scale the data
        scaled_data = self.scaler.fit_transform(df)
        
        # Create sequences
        X, y = self.create_sequences(scaled_data, seq_length)
        
        # Build and train model
        self.model = self.build_model(seq_length, df.shape[1])
        self.model.fit(X, y, epochs=50, batch_size=32, verbose=1)
        
    def predict(self, last_sequence, n_steps):
        predictions = []
        current_sequence = last_sequence.copy()
        
        for _ in range(n_steps):
            # Predict next step
            scaled_prediction = self.model.predict(current_sequence.reshape(1, *current_sequence.shape))
            predictions.append(scaled_prediction[0])
            
            # Update sequence
            current_sequence = np.roll(current_sequence, -1, axis=0)
            current_sequence[-1] = scaled_prediction[0]
            
        # Inverse transform predictions
        predictions = np.array(predictions)
        predictions = self.scaler.inverse_transform(predictions)
        
        return predictions
    
    def save(self, model_path, scaler_path):
        self.model.save(model_path)
        joblib.dump(self.scaler, scaler_path)
    
    def load(self, model_path, scaler_path):
        self.model = tf.keras.models.load_model(model_path)
        self.scaler = joblib.load(scaler_path)

