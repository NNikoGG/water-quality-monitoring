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
    def __init__(self, sequence_length=10):
        self.model = None
        self.scaler = MinMaxScaler()
        self.sequence_length = sequence_length
        self.api_url = os.getenv("API_URL", "http://localhost:8080")  # Fallback 8080

    def create_sequences(self, data, seq_length=10):
        """Create sequences for LSTM training"""
        features = ['ph', 'turbidity', 'tds', 'temperature', 'conductivity']
        
        # Sort by timestamp if available
        if 'timestamp' in data.columns:
            data = data.sort_values('timestamp')

        X, y = [], []
        for i in range(len(data) - seq_length):
            # Get sequence of features
            sequence = data[features].iloc[i:i + seq_length].values
            # Get label for the next time point
            label = 1 if data['is_corrosive'].iloc[i + seq_length] else 0

            X.append(sequence)
            y.append(label)

        return np.array(X), np.array(y)

    def prepare_data(self, data):
        """Prepare sequential data for LSTM training"""
        # Create sequences
        X, y = self.create_sequences(data, self.sequence_length)

        if len(X) == 0:
            raise ValueError(f"Not enough data to create sequences of length {self.sequence_length}")

        print(f"Created {len(X)} sequences of length {self.sequence_length}")
        print(f"Input shape: {X.shape}")

        # Scale the features
        # Reshape for scaling (samples * timesteps, features)
        original_shape = X.shape
        X_reshaped = X.reshape(-1, X.shape[-1])
        X_scaled = self.scaler.fit_transform(X_reshaped)
        X_scaled = X_scaled.reshape(original_shape)

        return X_scaled, y

    def add_realistic_noise(self, X, y, noise_factor=0.02):
        """Add realistic noise to prevent overfitting"""
        X_noisy = X.copy()

        # Add Gaussian noise to features
        noise = np.random.normal(0, noise_factor, X.shape)
        X_noisy = X_noisy + noise

        # Clip to reasonable bounds (scaled data should be between 0 and 1)
        X_noisy = np.clip(X_noisy, 0, 1)

        return X_noisy, y

    def balance_dataset(self, X, y, target_ratio=0.3):
        """Balance the dataset to have a more realistic class distribution"""
        # Get indices for each class
        corrosive_indices = np.where(y == 1)[0]
        non_corrosive_indices = np.where(y == 0)[0]

        print(f"Original distribution - Corrosive: {len(corrosive_indices)}, Non-corrosive: {len(non_corrosive_indices)}")

        # Calculate target sizes
        total_corrosive = len(corrosive_indices)
        target_non_corrosive = int(total_corrosive / target_ratio * (1 - target_ratio))

        # Subsample non-corrosive if we have too many
        if len(non_corrosive_indices) > target_non_corrosive:
            selected_non_corrosive = np.random.choice(
                non_corrosive_indices,
                size=target_non_corrosive,
                replace=False
            )
        else:
            selected_non_corrosive = non_corrosive_indices

        # Combine indices
        balanced_indices = np.concatenate([corrosive_indices, selected_non_corrosive])
        np.random.shuffle(balanced_indices)

        X_balanced = X[balanced_indices]
        y_balanced = y[balanced_indices]

        print(f"Balanced distribution - Corrosive: {np.sum(y_balanced)}, Non-corrosive: {len(y_balanced) - np.sum(y_balanced)}")
        print(f"Corrosive percentage: {(np.sum(y_balanced) / len(y_balanced) * 100):.2f}%")

        return X_balanced, y_balanced

    def preprocess_data(self, data):
        """Enhanced preprocessing with balancing and noise"""
        # Prepare sequential data
        X, y = self.prepare_data(data)
        
        # Balance the dataset for realistic evaluation
        X_balanced, y_balanced = self.balance_dataset(X, y, target_ratio=0.25)  # 25% corrosive
        
        # Add realistic noise to prevent overfitting
        X_noisy, y_noisy = self.add_realistic_noise(X_balanced, y_balanced, noise_factor=0.03)
        
        return X_noisy, y_noisy

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
        """Build enhanced LSTM model with realistic complexity"""
        self.model = Sequential([
            LSTM(64, input_shape=input_shape, return_sequences=True),
            Dropout(0.2),
            LSTM(32, return_sequences=False),
            Dropout(0.2),
            Dense(16, activation='relu'),
            Dense(1, activation='sigmoid')
        ])

        self.model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy', 'precision', 'recall']
        )

        return self.model

    def train(self, X_train, y_train, epochs=30, batch_size=32, validation_split=0.2):
        """Enhanced training with class weights and callbacks"""
        if self.model is None:
            self.build_model((X_train.shape[1], X_train.shape[2]))
        
        # Calculate class weights for imbalanced dataset
        unique_classes, class_counts = np.unique(y_train, return_counts=True)
        total_samples = len(y_train)
        class_weights = {}
        
        for cls, count in zip(unique_classes, class_counts):
            class_weights[cls] = total_samples / (len(unique_classes) * count)
        
        # Give extra weight to corrosive class if it's rare
        if 1 in class_weights and class_weights[1] > 1:
            class_weights[1] = min(class_weights[1] * 2, 5.0)  # Cap at 5x weight
        
        print(f"Using class weights: {class_weights}")
        
        # Add callbacks for better training
        callbacks = [
            tf.keras.callbacks.EarlyStopping(patience=10, restore_best_weights=True),
            tf.keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=5)
        ]
        
        return self.model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            verbose=1,
            class_weight=class_weights,
            callbacks=callbacks
        )

    def is_trained(self):
        """Check if the model and scaler are ready for predictions"""
        return (self.model is not None and 
                hasattr(self.scaler, 'scale_') and 
                self.scaler.scale_ is not None)

    def predict(self, data):
        """Enhanced prediction with better risk level determination"""
        # Check if model is trained
        if not self.is_trained():
            raise ValueError("Model is not trained. Please train the model first or load a pre-trained model.")
        
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
        
        # Enhanced risk level determination
        risk_level = "High" if prediction > 0.7 else "Medium" if prediction > 0.3 else "Low"
        
        # Additional risk factors analysis
        latest_values = X[-1]  # Most recent readings
        risk_factors = self._analyze_risk_factors(latest_values)
        
        return {
            "risk_probability": float(prediction),
            "risk_level": risk_level,
            "current_conditions_corrosive": bool(prediction > 0.5),
            "risk_factors": risk_factors,
            "confidence": self._calculate_confidence(prediction)
        }

    def _analyze_risk_factors(self, values):
        """Analyze individual risk factors"""
        ph, turbidity, tds, temperature, conductivity = values
        factors = []
        
        if ph < 6.5:
            factors.append({"factor": "Low pH", "value": ph, "threshold": 6.5, "severity": "high"})
        elif ph > 8.5:
            factors.append({"factor": "High pH", "value": ph, "threshold": 8.5, "severity": "high"})
            
        if conductivity > 800:
            factors.append({"factor": "High Conductivity", "value": conductivity, "threshold": 800, "severity": "high"})
        elif conductivity > 600:
            factors.append({"factor": "Elevated Conductivity", "value": conductivity, "threshold": 600, "severity": "medium"})
            
        if tds > 400:
            factors.append({"factor": "High TDS", "value": tds, "threshold": 400, "severity": "high"})
        elif tds > 300:
            factors.append({"factor": "Elevated TDS", "value": tds, "threshold": 300, "severity": "medium"})
            
        if temperature > 30:
            factors.append({"factor": "High Temperature", "value": temperature, "threshold": 30, "severity": "medium"})
            
        if turbidity > 3.0:
            factors.append({"factor": "High Turbidity", "value": turbidity, "threshold": 3.0, "severity": "medium"})
            
        return factors

    def _calculate_confidence(self, prediction):
        """Calculate prediction confidence based on how far from decision boundary"""
        # Distance from 0.5 (decision boundary)
        distance_from_boundary = abs(prediction - 0.5)
        # Convert to confidence score (0-1)
        confidence = min(distance_from_boundary * 2, 1.0)
        return float(confidence)

    def save_model(self, model_path, scaler_path):
        """Save the enhanced model and scaler with metadata"""
        if not model_path.endswith('.keras'):
            model_path = model_path + '.keras'
        self.model.save(model_path)
        
        # Save scaler and metadata
        save_data = {
            'scaler': self.scaler,
            'sequence_length': self.sequence_length,
            'model_version': 'enhanced_v2'
        }
        joblib.dump(save_data, scaler_path)
        print(f"Enhanced model saved to {model_path}, scaler saved to {scaler_path}")

    def load_model(self, model_path, scaler_path):
        """Load the enhanced model and scaler with metadata"""
        try:
            if not model_path.endswith('.keras'):
                model_path = model_path + '.keras'
            self.model = tf.keras.models.load_model(model_path)
            
            # Load scaler and metadata
            save_data = joblib.load(scaler_path)
            if isinstance(save_data, dict):
                self.scaler = save_data.get('scaler', save_data)
                self.sequence_length = save_data.get('sequence_length', 10)
                model_version = save_data.get('model_version', 'legacy')
                print(f"Loaded {model_version} model")
            else:
                # Legacy format - just the scaler
                self.scaler = save_data
                print("Loaded legacy model format")
                
            print(f"Model loaded from {model_path}, scaler loaded from {scaler_path}")
            print(f"Sequence length: {self.sequence_length}")
        except Exception as e:
            print(f"Error loading model or scaler: {str(e)}")
            raise