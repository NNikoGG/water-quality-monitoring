import numpy as np
import tensorflow as tf
from sklearn.preprocessing import StandardScaler
import joblib

class WaterQualityLSTM:
    def __init__(self, sequence_length=15, forecast_horizon=1):
        self.model = None
        self.scalers = {}  # Store scalers for each feature
        self.sequence_length = sequence_length
        self.forecast_horizon = forecast_horizon
        self.feature_names = ['ph', 'turbidity', 'tds', 'temperature', 'conductivity']
        
    def create_sequences(self, data, seq_length):
        """Create sequences for LSTM training"""
        X, y = [], []
        for i in range(len(data) - seq_length):
            X.append(data[i:(i + seq_length)])
            y.append(data[i + seq_length])
        return np.array(X), np.array(y)
    
    def build_model(self, seq_length, n_features):
        """Build enhanced LSTM model with weighted loss"""
        from tensorflow.keras.models import Model
        from tensorflow.keras.layers import Input, LSTM, Dense, Dropout, Bidirectional, Attention
        
        inputs = Input(shape=(seq_length, n_features))

        x = Bidirectional(
            LSTM(64, activation='relu', return_sequences=True)
        )(inputs)
        x = Dropout(0.2)(x)

        attention_output = Attention()([x, x])

        x = LSTM(32, activation='relu', return_sequences=False)(attention_output)
        x = Dropout(0.2)(x)

        x = Dense(16, activation='relu',
                  kernel_regularizer=tf.keras.regularizers.l2(0.01))(x)
        outputs = Dense(n_features)(x)

        model = Model(inputs=inputs, outputs=outputs)

        # Use standard MSE loss instead of custom weighted loss for better compatibility
        optimizer = tf.keras.optimizers.Adam(learning_rate=0.001, clipnorm=1.0)
        model.compile(
            optimizer=optimizer,
            loss='mse',
            metrics=['mae', 'mse']
        )
        return model
    
    def prepare_data(self, df):
        """Prepare data with feature-specific scaling"""
        scaled_data = np.zeros_like(df[self.feature_names])
        for i, feature in enumerate(self.feature_names):
            scaler = StandardScaler()
            scaled_data[:, i] = scaler.fit_transform(df[[feature]].values)[:, 0]
            self.scalers[feature] = scaler  # Store scaler for each feature
        X, y = self.create_sequences(scaled_data, self.sequence_length)

        print(f"Created {len(X)} sequences of length {self.sequence_length}")
        print(f"Input shape: {X.shape}, Output shape: {y.shape}")

        return X, y

    def train(self, df, seq_length=15, epochs=50, batch_size=32, validation_split=0.2):
        """Train the enhanced model with callbacks"""
        # Update sequence length if provided
        self.sequence_length = seq_length
        
        X, y = self.prepare_data(df)

        self.model = self.build_model(self.sequence_length, len(self.feature_names))

        callbacks = [
            tf.keras.callbacks.EarlyStopping(patience=15, restore_best_weights=True),
            tf.keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=5)
        ]

        history = self.model.fit(
            X, y,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            verbose=1,
            callbacks=callbacks
        )

        return history
        
    def predict(self, last_sequence, n_steps):
        """Enhanced prediction with feature-specific scaling"""
        print(f"Input sequence shape: {last_sequence.shape}")
        
        # Convert to DataFrame if it's a numpy array
        if isinstance(last_sequence, np.ndarray):
            import pandas as pd
            last_sequence = pd.DataFrame(last_sequence, columns=self.feature_names)
        
        # Scale input sequence using feature-specific scalers
        scaled_sequence = np.zeros_like(last_sequence[self.feature_names].values)
        for i, feature in enumerate(self.feature_names):
            if feature in self.scalers:
                scaled_sequence[:, i] = self.scalers[feature].transform(last_sequence[[feature]].values)[:, 0]
            else:
                print(f"Warning: No scaler found for {feature}, using StandardScaler")
                scaler = StandardScaler()
                scaled_sequence[:, i] = scaler.fit_transform(last_sequence[[feature]].values)[:, 0]
        
        print(f"Scaled sequence shape: {scaled_sequence.shape}")
        
        predictions = []
        current_sequence = scaled_sequence.copy()
        
        for step in range(n_steps):
            try:
                # Predict next step
                scaled_prediction = self.model.predict(current_sequence.reshape(1, *current_sequence.shape), verbose=0)
                print(f"Step {step} prediction shape: {scaled_prediction.shape}")
                predictions.append(scaled_prediction[0])
                
                # Update sequence for next prediction
                current_sequence = np.roll(current_sequence, -1, axis=0)
                current_sequence[-1] = scaled_prediction[0]
            except Exception as e:
                print(f"Prediction failed at step {step}: {str(e)}")
                raise
            
        # Inverse transform predictions using feature-specific scalers
        predictions = np.array(predictions)
        print(f"All predictions shape before inverse: {predictions.shape}")
        
        try:
            for i, feature in enumerate(self.feature_names):
                if feature in self.scalers:
                    predictions[:, i] = self.scalers[feature].inverse_transform(predictions[:, [i]])[:, 0]
                else:
                    print(f"Warning: No scaler found for {feature} during inverse transform")
            print(f"All predictions shape after inverse: {predictions.shape}")
        except Exception as e:
            print(f"Inverse transform failed: {str(e)}")
            raise
        
        return predictions
    
    def save(self, model_path, scaler_path):
        """Save model and all feature-specific scalers"""
        # Save model in native Keras format with .keras extension
        self.model.save(f"{model_path}.keras")
        
        # Save all scalers and metadata
        save_data = {
            'scalers': self.scalers,
            'sequence_length': self.sequence_length,
            'feature_names': self.feature_names,
            'forecast_horizon': self.forecast_horizon
        }
        joblib.dump(save_data, scaler_path)
    
    def load(self, model_path, scaler_path):
        """Load model and all feature-specific scalers"""
        print(f"Loading enhanced model from: {model_path}.keras")
        
        # Load model
        self.model = tf.keras.models.load_model(f"{model_path}.keras")
        
        # Load scalers and metadata with backward compatibility
        save_data = joblib.load(scaler_path)
        
        # Check if it's the new format (dict) or old format (direct scaler)
        if isinstance(save_data, dict):
            # New format
            self.scalers = save_data.get('scalers', {})
            self.sequence_length = save_data.get('sequence_length', 15)
            self.feature_names = save_data.get('feature_names', ['ph', 'turbidity', 'tds', 'temperature', 'conductivity'])
            self.forecast_horizon = save_data.get('forecast_horizon', 1)
            print("Loaded enhanced model format")
        else:
            # Old format - single scaler for all features
            print("Detected legacy model format - converting to new format")
            from sklearn.preprocessing import MinMaxScaler
            
            # Create individual scalers for each feature using the legacy scaler's parameters
            self.scalers = {}
            for feature in self.feature_names:
                # Create a new StandardScaler for each feature
                # Note: We can't perfectly convert MinMaxScaler to StandardScaler, so we'll recreate
                from sklearn.preprocessing import StandardScaler
                self.scalers[feature] = StandardScaler()
                
            print("Legacy model loaded - will need retraining for optimal performance")
        
        print(f"Loaded model with {len(self.scalers)} feature scalers")
        print(f"Sequence length: {self.sequence_length}") 