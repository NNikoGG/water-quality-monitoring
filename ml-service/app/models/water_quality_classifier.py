import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.metrics import classification_report, accuracy_score, f1_score
import joblib

class WaterQualityClassifier:
    def __init__(self):
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            class_weight='balanced'  # Handle class imbalance
        )
        self.scaler = MinMaxScaler()
        
    def get_quality_grade_realistic(self, row):
        """Determine water quality grade with realistic uncertainty but good predictability"""
        ph = row['ph']
        turbidity = row['turbidity']
        tds = row['tds']
        temperature = row['temperature']
        conductivity = row['conductivity']

        # Add small amount of realistic noise (reduced from previous version)
        ph_noise = np.random.normal(0, 0.05)  # Reduced noise
        turbidity_noise = np.random.normal(0, 0.1)  # Reduced noise
        tds_noise = np.random.normal(0, 5)  # Reduced noise

        ph += ph_noise
        turbidity += turbidity_noise
        tds += tds_noise

        # Score-based system with clearer boundaries
        grade_score = 0

        # pH scoring (weight: 25%) - clearer boundaries
        if 7.0 <= ph <= 8.0:
            grade_score += 25
        elif 6.5 <= ph <= 8.5:
            grade_score += 20
        elif 6.0 <= ph <= 9.0:
            grade_score += 12
        else:
            grade_score += 0  # Poor pH

        # Turbidity scoring (weight: 25%)
        if turbidity < 1.5:
            grade_score += 25
        elif turbidity < 3.0:
            grade_score += 20
        elif turbidity < 5.0:
            grade_score += 12
        else:
            grade_score += 0  # High turbidity

        # TDS scoring (weight: 25%)
        if tds < 350:
            grade_score += 25
        elif tds < 550:
            grade_score += 20
        elif tds < 750:
            grade_score += 12
        else:
            grade_score += 0  # High TDS

        # Temperature scoring (weight: 25%)
        if 20 <= temperature <= 28:
            grade_score += 25
        elif 15 <= temperature <= 32:
            grade_score += 20
        elif 10 <= temperature <= 35:
            grade_score += 12
        else:
            grade_score += 0  # Extreme temperature

        # Add small random variation (±3 points instead of ±5)
        grade_score += np.random.randint(-3, 4)

        # Convert to grades with realistic but limited boundary uncertainty
        if grade_score >= 90:
            return 'A' if np.random.random() > 0.05 else 'B'  # 95% confidence
        elif grade_score >= 75:
            return 'B' if np.random.random() > 0.1 else ('A' if np.random.random() > 0.7 else 'C')
        elif grade_score >= 55:
            return 'C' if np.random.random() > 0.1 else ('B' if np.random.random() > 0.8 else 'D')
        elif grade_score >= 35:
            return 'C' if np.random.random() > 0.2 else 'D'
        else:
            return 'D' if np.random.random() > 0.1 else 'C'  # 90% confidence for poor quality

    def get_quality_grade(self, features: dict) -> str:
        """
        Legacy threshold-based grading method (kept for backward compatibility)
        """
        ph = features['ph']
        turbidity = features['turbidity']
        tds = features['tds']
        temperature = features['temperature']
        conductivity = features['conductivity']
        
        # Grade D: Poor Quality (Check this first)
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
    
    def prepare_data(self, data: pd.DataFrame, use_enhanced_features=False) -> np.ndarray:
        """Prepare data for training or prediction with optional feature engineering"""
        base_features = ['ph', 'turbidity', 'tds', 'temperature', 'conductivity']
        
        if use_enhanced_features:
            # Add feature engineering
            if 'ph_turbidity_interaction' not in data.columns:
                data = data.copy()
                data['ph_turbidity_interaction'] = data['ph'] * data['turbidity']
                data['tds_conductivity_ratio'] = data['tds'] / (data['conductivity'] + 1e-8)
            
            features = base_features + ['ph_turbidity_interaction', 'tds_conductivity_ratio']
        else:
            features = base_features
        
        X = data[features].values
        
        if X.shape[0] == 1:  # Single prediction
            X = self.scaler.transform(X)
        else:  # Training data
            X = self.scaler.fit_transform(X)
            
        return X
    
    def balance_classes(self, data: pd.DataFrame, min_samples_per_class=80) -> pd.DataFrame:
        """Balance classes by generating synthetic samples"""
        print("Balancing classes...")
        balanced_data = data.copy()
        
        for grade in ['A', 'B', 'C', 'D']:
            current_count = (balanced_data['quality_grade'] == grade).sum()
            print(f"Grade {grade}: {current_count} samples")

            if current_count < min_samples_per_class:
                grade_samples = balanced_data[balanced_data['quality_grade'] == grade].copy()
                additional_needed = min_samples_per_class - current_count

                print(f"Adding {additional_needed} synthetic samples for Grade {grade}")

                for _ in range(additional_needed):
                    if len(grade_samples) > 0:
                        base_sample = grade_samples.sample(1).copy()

                        # Add controlled noise based on parameter ranges
                        for col in ['ph', 'turbidity', 'tds', 'temperature', 'conductivity']:
                            original_value = base_sample[col].iloc[0]
                            # Add 2-5% noise
                            noise_factor = np.random.uniform(0.02, 0.05)
                            noise = np.random.normal(0, abs(original_value) * noise_factor)
                            base_sample[col] = original_value + noise

                        # Ensure the synthetic sample still belongs to the same grade
                        new_grade = self.get_quality_grade_realistic(base_sample.iloc[0])
                        if new_grade == grade:
                            balanced_data = pd.concat([balanced_data, base_sample], ignore_index=True)
        
        return balanced_data
    
    def train(self, data: pd.DataFrame, use_realistic_grading=True, use_cross_validation=True, use_enhanced_features=False) -> dict:
        """Enhanced training with realistic grading and cross-validation"""
        print("=" * 60)
        print("ENHANCED WATER QUALITY CLASSIFIER TRAINING")
        print("=" * 60)
        
        # Set random seed for reproducibility
        np.random.seed(42)
        
        # Generate labels using realistic grading
        if use_realistic_grading:
            print("Using realistic grading algorithm...")
            data = data.copy()
            data['quality_grade'] = data.apply(self.get_quality_grade_realistic, axis=1)
        else:
            print("Using legacy threshold-based grading...")
            data = data.copy()
            data['quality_grade'] = data.apply(self.get_quality_grade, axis=1)
        
        # Balance classes
        balanced_data = self.balance_classes(data)
        
        # Add feature engineering only if requested
        if use_enhanced_features:
            balanced_data['ph_turbidity_interaction'] = balanced_data['ph'] * balanced_data['turbidity']
            balanced_data['tds_conductivity_ratio'] = balanced_data['tds'] / (balanced_data['conductivity'] + 1e-8)
        
        # Prepare features
        X = self.prepare_data(balanced_data, use_enhanced_features=use_enhanced_features)
        y = balanced_data['quality_grade']
        
        # Cross-validation
        if use_cross_validation:
            print("\nPerforming cross-validation...")
            kfold = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
            cv_scores = cross_val_score(self.model, X, y, cv=kfold, scoring='f1_macro')
            print(f"CV F1-Score (Macro): {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
        
        # Train final model
        print("Training final model...")
        self.model.fit(X, y)
        
        # Calculate metrics
        y_pred = self.model.predict(X)
        accuracy = accuracy_score(y, y_pred)
        f1_macro = f1_score(y, y_pred, average='macro')
        
        # Calculate class distribution
        class_distribution = y.value_counts().to_dict()
        total_samples = len(y)
        class_percentages = {grade: (count/total_samples)*100 
                           for grade, count in class_distribution.items()}
        
        # Feature importance
        if use_enhanced_features:
            feature_names = ['pH', 'Turbidity', 'TDS', 'Temperature', 'Conductivity', 
                            'pH×Turbidity', 'TDS/Conductivity']
        else:
            feature_names = ['pH', 'Turbidity', 'TDS', 'Temperature', 'Conductivity']
        
        feature_importance = dict(zip(feature_names, self.model.feature_importances_))
        
        results = {
            'accuracy': accuracy,
            'f1_macro': f1_macro,
            'class_distribution': class_distribution,
            'class_percentages': class_percentages,
            'feature_importance': feature_importance,
            'training_samples': len(balanced_data),
            'features_used': feature_names
        }
        
        if use_cross_validation:
            results['cv_f1_score'] = cv_scores.mean()
            results['cv_std'] = cv_scores.std()
        
        print(f"\nTraining completed!")
        print(f"Features used: {feature_names}")
        print(f"Final accuracy: {accuracy:.4f}")
        print(f"F1-Score (Macro): {f1_macro:.4f}")
        if use_cross_validation:
            print(f"Cross-validation F1: {cv_scores.mean():.4f}")
        print(f"Total training samples: {len(balanced_data)}")
        
        return results
    
    def predict(self, features: dict) -> dict:
        """Make prediction for a single sample using basic 5 features"""
        # Convert to DataFrame (no feature engineering for compatibility)
        df = pd.DataFrame([features])
        
        # Prepare features using basic 5 features only
        X = self.prepare_data(df, use_enhanced_features=False)
        
        # Get prediction and probabilities
        grade = self.model.predict(X)[0]
        probabilities = self.model.predict_proba(X)[0]
        
        # Map probabilities to grades
        grade_probs = dict(zip(self.model.classes_, probabilities))
        
        # Ensure all grades are represented
        for g in ['A', 'B', 'C', 'D']:
            if g not in grade_probs:
                grade_probs[g] = 0.0
        
        # Get feature importance (basic 5 features)
        feature_names = ['pH', 'Turbidity', 'TDS', 'Temperature', 'Conductivity']
        feature_importance = dict(zip(feature_names, self.model.feature_importances_))
        
        return {
            'grade': grade,
            'grade_probabilities': grade_probs,
            'feature_importance': feature_importance,
            'timestamp': features.get('timestamp', None)
        }
    
    def save_model(self, model_path: str, scaler_path: str):
        """Save the enhanced model and scaler"""
        joblib.dump(self.model, model_path)
        joblib.dump(self.scaler, scaler_path)
        print(f"Enhanced model saved to {model_path}")
    
    def load_model(self, model_path: str, scaler_path: str):
        """Load the saved model and scaler"""
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        print(f"Enhanced model loaded from {model_path}") 