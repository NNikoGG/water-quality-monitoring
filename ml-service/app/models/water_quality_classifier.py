import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import MinMaxScaler
import joblib

class WaterQualityClassifier:
    def __init__(self):
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        self.scaler = MinMaxScaler()
        
    def get_quality_grade(self, features: dict) -> str:
        """
        Determine water quality grade based on parameter thresholds.
        Used for generating training labels.
        """
        ph = features['ph']
        turbidity = features['turbidity']
        tds = features['tds']
        temperature = features['temperature']
        conductivity = features['conductivity']
        
        # Grade D: Poor Quality (Check this first)
        # If any parameter is outside Grade C bounds, it's automatically Grade D
        if (ph < 6.0 or ph > 8.5 or
            turbidity >= 5.0 or
            tds >= 800 or
            temperature < 15 or temperature > 35 or
            conductivity >= 1000):
            return 'D'
            
        # Grade A: Excellent Quality
        if (6.8 <= ph <= 7.5 and
            turbidity < 1.0 and
            tds < 300 and
            25 <= temperature <= 28 and
            conductivity < 500):
            return 'A'
            
        # Grade B: Good Quality
        elif (6.5 <= ph <= 8.0 and
              turbidity < 3.0 and
              tds < 500 and
              20 <= temperature <= 30 and
              conductivity < 700):
            return 'B'
            
        # Grade C: Fair Quality
        else:
            return 'C'
    
    def prepare_data(self, data: pd.DataFrame) -> tuple:
        """Prepare data for training or prediction"""
        features = ['ph', 'turbidity', 'tds', 'temperature', 'conductivity']
        X = data[features].values
        
        if X.shape[0] == 1:  # Single prediction
            X = self.scaler.transform(X)
        else:  # Training data
            X = self.scaler.fit_transform(X)
            
        return X
    
    def train(self, data: pd.DataFrame) -> dict:
        """Train the classifier"""
        # Prepare features
        X = self.prepare_data(data)
        
        # Generate labels
        y = data.apply(self.get_quality_grade, axis=1)
        
        # Train model
        self.model.fit(X, y)
        
        # Calculate class distribution
        class_distribution = y.value_counts().to_dict()
        total_samples = len(y)
        class_percentages = {grade: (count/total_samples)*100 
                           for grade, count in class_distribution.items()}
        
        return {
            'class_distribution': class_distribution,
            'class_percentages': class_percentages,
            'feature_importance': dict(zip(
                ['pH', 'Turbidity', 'TDS', 'Temperature', 'Conductivity'],
                self.model.feature_importances_
            ))
        }
    
    def predict(self, features: dict) -> dict:
        """Make prediction for a single sample"""
        # First check if the reading qualifies for Grade D based on thresholds
        ph = features['ph']
        turbidity = features['turbidity']
        tds = features['tds']
        temperature = features['temperature']
        conductivity = features['conductivity']
        
        # Check Grade D conditions
        is_grade_d = (ph < 6.0 or ph > 8.5 or
                     turbidity >= 5.0 or
                     tds >= 800 or
                     temperature < 15 or temperature > 35 or
                     conductivity >= 1000)
        
        if is_grade_d:
            # If conditions meet Grade D criteria, override model prediction
            return {
                'grade': 'D',
                'grade_probabilities': {
                    'A': 0.0,
                    'B': 0.0,
                    'C': 0.0,
                    'D': 1.0
                },
                'feature_importance': dict(zip(
                    ['pH', 'Turbidity', 'TDS', 'Temperature', 'Conductivity'],
                    self.model.feature_importances_
                )),
                'timestamp': features.get('timestamp', None)
            }
        
        # If not Grade D, proceed with model prediction
        # Convert to DataFrame
        df = pd.DataFrame([features])
        
        # Prepare features
        X = self.prepare_data(df)
        
        # Get prediction and probabilities
        grade = self.model.predict(X)[0]
        probabilities = self.model.predict_proba(X)[0]
        
        # Map probabilities to grades
        grade_probs = dict(zip(self.model.classes_, probabilities))
        
        # Add Grade D probability as 0.0 since it's not Grade D
        grade_probs['D'] = 0.0
        
        # Get feature importance for this prediction
        feature_importance = dict(zip(
            ['pH', 'Turbidity', 'TDS', 'Temperature', 'Conductivity'],
            self.model.feature_importances_
        ))
        
        return {
            'grade': grade,
            'grade_probabilities': grade_probs,
            'feature_importance': feature_importance,
            'timestamp': features.get('timestamp', None)
        }
    
    def save_model(self, model_path: str, scaler_path: str):
        """Save the model and scaler"""
        joblib.dump(self.model, model_path)
        joblib.dump(self.scaler, scaler_path)
    
    def load_model(self, model_path: str, scaler_path: str):
        """Load the saved model and scaler"""
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path) 