from app.utils.firebase_client import fetch_sensor_data
from app.models.water_quality_classifier import WaterQualityClassifier
import os

def train_quality_classifier():
    print("\nInitializing Water Quality Classification Training...")
    print("=" * 50)
    
    try:
        # Initialize the classifier
        classifier = WaterQualityClassifier()
        
        # Fetch training data from Firebase
        print("\nFetching data from Firebase...")
        df = fetch_sensor_data()
        
        if df.empty:
            print("Error: No data available in Firebase")
            return
            
        print(f"\nData loaded successfully!")
        print(f"Total number of samples: {len(df)}")
        print("\nSample data:")
        print(df.head())
        
        # Train the model
        print("\nTraining the classifier...")
        training_results = classifier.train(df)
        
        # Print training results
        print("\nTraining Results:")
        print("=" * 50)
        
        print("\nClass Distribution:")
        for grade, count in training_results['class_distribution'].items():
            print(f"Grade {grade}: {count} samples")
            
        print("\nClass Percentages:")
        for grade, percentage in training_results['class_percentages'].items():
            print(f"Grade {grade}: {percentage:.2f}%")
            
        print("\nFeature Importance:")
        for feature, importance in training_results['feature_importance'].items():
            print(f"{feature}: {importance * 100:.2f}%")
        
        # Save the model
        print("\nSaving the model...")
        os.makedirs('app/models/saved', exist_ok=True)
        classifier.save_model(
            'app/models/saved/quality_classifier',
            'app/models/saved/quality_scaler.pkl'
        )
        print("Model saved successfully!")
        
        # Print example predictions
        print("\nExample Predictions:")
        print("=" * 50)
        if len(df) > 0:
            latest_reading = df.iloc[-1].to_dict()
            prediction = classifier.predict(latest_reading)
            print("\nLatest reading prediction:")
            print(f"Grade: {prediction['grade']}")
            print("\nGrade Probabilities:")
            for grade, prob in prediction['grade_probabilities'].items():
                print(f"Grade {grade}: {prob * 100:.2f}%")
        
    except Exception as e:
        print(f"\nError during training: {str(e)}")
        raise

if __name__ == '__main__':
    train_quality_classifier() 