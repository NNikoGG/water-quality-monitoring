from app.utils.firebase_client import fetch_sensor_data
from app.models.water_quality_classifier import WaterQualityClassifier
import os
import argparse
import pandas as pd
import numpy as np
from datetime import datetime

def train_quality_classifier(use_realistic_grading=True, use_cross_validation=True, min_samples_per_class=80):
    """
    Enhanced training function for water quality classifier
    
    Args:
        use_realistic_grading (bool): Use realistic grading algorithm vs legacy thresholds
        use_cross_validation (bool): Perform cross-validation during training
        min_samples_per_class (int): Minimum samples per class for balancing
    """
    print("\n" + "=" * 70)
    print("ENHANCED WATER QUALITY CLASSIFICATION TRAINING")
    print("=" * 70)
    print(f"Training Configuration:")
    print(f"  - Realistic Grading: {'Enabled' if use_realistic_grading else 'Legacy'}")
    print(f"  - Cross-Validation: {'Enabled' if use_cross_validation else 'Disabled'}")
    print(f"  - Min Samples per Class: {min_samples_per_class}")
    print(f"  - Training Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    try:
        # Initialize the enhanced classifier
        classifier = WaterQualityClassifier()
        
        # Fetch training data from Firebase
        print("\nStep 1: Fetching training data from Firebase...")
        df = fetch_sensor_data()
        
        if df.empty:
            print("❌ Error: No data available in Firebase")
            print("Please ensure sensor data is available before training.")
            return False
            
        print(f"✅ Data loaded successfully!")
        print(f"   Total samples: {len(df)}")
        print(f"   Date range: {df['timestamp'].min()} to {df['timestamp'].max()}")
        
        # Display data quality summary
        print(f"\nData Quality Summary:")
        print(f"  pH range: {df['ph'].min():.2f} - {df['ph'].max():.2f}")
        print(f"  Turbidity range: {df['turbidity'].min():.2f} - {df['turbidity'].max():.2f}")
        print(f"  TDS range: {df['tds'].min():.0f} - {df['tds'].max():.0f}")
        print(f"  Temperature range: {df['temperature'].min():.1f} - {df['temperature'].max():.1f}")
        print(f"  Conductivity range: {df['conductivity'].min():.0f} - {df['conductivity'].max():.0f}")
        
        # Check for missing values
        missing_values = df.isnull().sum()
        if missing_values.sum() > 0:
            print(f"\n⚠️  Missing values detected:")
            for col, count in missing_values.items():
                if count > 0:
                    print(f"   {col}: {count} missing values")
            
            # Fill missing values with column means
            df = df.fillna(df.mean())
            print("   Missing values filled with column means.")
        
        print(f"\nSample data preview:")
        print(df.head())
        
        # Train the enhanced model
        print(f"\nStep 2: Training enhanced classifier...")
        print("-" * 50)
        
        training_results = classifier.train(
            df, 
            use_realistic_grading=use_realistic_grading,
            use_cross_validation=use_cross_validation
        )
        
        # Display comprehensive training results
        print(f"\n" + "=" * 70)
        print("TRAINING RESULTS SUMMARY")
        print("=" * 70)
        
        # Model Performance Metrics
        print(f"\n📊 Model Performance Metrics:")
        print(f"   Accuracy: {training_results['accuracy']:.4f}")
        print(f"   F1-Score (Macro): {training_results['f1_macro']:.4f}")
        
        if 'cv_f1_score' in training_results:
            print(f"   Cross-Validation F1: {training_results['cv_f1_score']:.4f} (±{training_results['cv_std']:.4f})")
        
        print(f"   Total Training Samples: {training_results['training_samples']}")
        
        # Performance Assessment
        f1_score = training_results['f1_macro']
        if f1_score >= 0.9:
            performance = "🌟 Excellent"
        elif f1_score >= 0.8:
            performance = "✅ Good"
        elif f1_score >= 0.7:
            performance = "⚠️  Fair"
        else:
            performance = "❌ Needs Improvement"
        
        print(f"\n🎯 Overall Performance: {performance}")
        
        # Class Distribution Analysis
        print(f"\n📈 Class Distribution Analysis:")
        total_samples = sum(training_results['class_distribution'].values())
        print(f"   Total samples after balancing: {total_samples}")
        
        for grade in sorted(training_results['class_distribution'].keys()):
            count = training_results['class_distribution'][grade]
            percentage = training_results['class_percentages'][grade]
            print(f"   Grade {grade}: {count:4d} samples ({percentage:5.1f}%)")
        
        # Feature Importance Analysis
        print(f"\n🔍 Feature Importance Analysis:")
        sorted_features = sorted(
            training_results['feature_importance'].items(), 
            key=lambda x: x[1], 
            reverse=True
        )
        
        for i, (feature, importance) in enumerate(sorted_features, 1):
            bar_length = int(importance * 50)  # Scale for visualization
            bar = "█" * bar_length + "░" * (50 - bar_length)
            print(f"   {i}. {feature:15s}: {importance*100:5.1f}% |{bar}|")
        
        # Save the enhanced model
        print(f"\nStep 3: Saving enhanced model...")
        os.makedirs('app/models/saved', exist_ok=True)
        
        model_path = 'app/models/saved/quality_classifier'
        scaler_path = 'app/models/saved/quality_scaler.pkl'
        
        classifier.save_model(model_path, scaler_path)
        print(f"✅ Enhanced model saved successfully!")
        print(f"   Model: {model_path}")
        print(f"   Scaler: {scaler_path}")
        
        # Test predictions with various examples
        print(f"\nStep 4: Testing model predictions...")
        print("-" * 50)
        
        # Test with latest reading
        if len(df) > 0:
            print(f"\n🧪 Latest Reading Prediction:")
            latest_reading = df.iloc[-1].to_dict()
            prediction = classifier.predict(latest_reading)
            
            print(f"   Input Parameters:")
            for param in ['ph', 'turbidity', 'tds', 'temperature', 'conductivity']:
                print(f"     {param:12s}: {latest_reading[param]:7.2f}")
            
            print(f"\n   Prediction Result:")
            print(f"     Grade: {prediction['grade']} ({prediction['grade_probabilities'][prediction['grade']]*100:.1f}% confidence)")
            
            print(f"\n   Grade Probabilities:")
            for grade in ['A', 'B', 'C', 'D']:
                prob = prediction['grade_probabilities'][grade] * 100
                bar_length = int(prob / 5)  # Scale for visualization
                bar = "█" * bar_length + "░" * (20 - bar_length)
                print(f"     Grade {grade}: {prob:5.1f}% |{bar}|")
        
        # Test with ideal water quality
        print(f"\n🧪 Ideal Water Quality Test:")
        ideal_params = {
            'ph': 7.2,
            'turbidity': 0.5,
            'tds': 250,
            'temperature': 26,
            'conductivity': 400,
            'timestamp': datetime.now().isoformat()
        }
        
        ideal_prediction = classifier.predict(ideal_params)
        print(f"   Expected: Grade A")
        print(f"   Predicted: Grade {ideal_prediction['grade']} ({ideal_prediction['grade_probabilities'][ideal_prediction['grade']]*100:.1f}% confidence)")
        
        # Test with poor water quality
        print(f"\n🧪 Poor Water Quality Test:")
        poor_params = {
            'ph': 9.5,
            'turbidity': 6.0,
            'tds': 900,
            'temperature': 10,
            'conductivity': 1200,
            'timestamp': datetime.now().isoformat()
        }
        
        poor_prediction = classifier.predict(poor_params)
        print(f"   Expected: Grade D")
        print(f"   Predicted: Grade {poor_prediction['grade']} ({poor_prediction['grade_probabilities'][poor_prediction['grade']]*100:.1f}% confidence)")
        
        # Training recommendations
        print(f"\n💡 Training Recommendations:")
        if training_results['f1_macro'] < 0.8:
            print(f"   • Consider collecting more diverse training data")
            print(f"   • Verify sensor calibration and data quality")
            print(f"   • Try adjusting the minimum samples per class")
        elif 'cv_f1_score' in training_results and abs(training_results['f1_macro'] - training_results['cv_f1_score']) > 0.1:
            print(f"   • Model may be overfitting - consider regularization")
            print(f"   • Increase training data diversity")
        else:
            print(f"   • Model training appears successful! ✅")
            print(f"   • Monitor real-world performance and retrain periodically")
            print(f"   • Consider deploying to production")
        
        print(f"\n" + "=" * 70)
        print("🎉 ENHANCED TRAINING COMPLETED SUCCESSFULLY!")
        print(f"   Next steps: Test the API endpoints and monitor performance")
        print("=" * 70)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error during training: {str(e)}")
        print(f"   Please check your data and configuration.")
        raise

def main():
    """Main function with command line argument support"""
    parser = argparse.ArgumentParser(description='Enhanced Water Quality Classifier Training')
    parser.add_argument('--realistic-grading', action='store_true', default=True,
                       help='Use realistic grading algorithm (default: True)')
    parser.add_argument('--legacy-grading', action='store_true',
                       help='Use legacy threshold-based grading')
    parser.add_argument('--no-cv', action='store_true',
                       help='Disable cross-validation')
    parser.add_argument('--min-samples', type=int, default=80,
                       help='Minimum samples per class for balancing (default: 80)')
    
    args = parser.parse_args()
    
    # Determine grading method
    use_realistic_grading = not args.legacy_grading
    use_cross_validation = not args.no_cv
    
    # Run training
    success = train_quality_classifier(
        use_realistic_grading=use_realistic_grading,
        use_cross_validation=use_cross_validation,
        min_samples_per_class=args.min_samples
    )
    
    if success:
        print(f"\n✅ Training completed successfully!")
        exit(0)
    else:
        print(f"\n❌ Training failed!")
        exit(1)

if __name__ == '__main__':
    main() 