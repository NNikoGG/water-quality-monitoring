import json
import requests
from datetime import datetime
import sys
import argparse

def train_corrosion_model(sequence_length=10, api_url='http://localhost:8080', epochs=30):
    """
    Enhanced training function for corrosion prediction model
    
    Args:
        sequence_length (int): Length of input sequences for LSTM
        api_url (str): API endpoint URL
        epochs (int): Number of training epochs
    """
    print("=" * 60)
    print("ENHANCED CORROSION PREDICTION MODEL TRAINING")
    print("=" * 60)
    
    # Load corrosion data
    print("Loading corrosion data from JSON file...")
    try:
        with open('corrosion_data.json', 'r') as f:
            # Load the JSON data
            file_data = json.load(f)
            
            # Check if the data is nested under 'corrosion_data'
            raw_data = file_data.get('corrosion_data', file_data)
            
            if not isinstance(raw_data, dict):
                print("Error: Invalid data format in corrosion_data.json")
                return False
            
            # Convert the data format to match the API expectation
            corrosion_data = []
            validation_errors = []
            
            for timestamp, value in raw_data.items():
                try:
                    # Ensure all required fields are present
                    required_fields = ['ph', 'turbidity', 'tds', 'temperature', 'conductivity']
                    if not all(field in value for field in required_fields):
                        validation_errors.append(f"Missing fields in {timestamp}")
                        continue

                    # Convert all values to float and validate ranges
                    data_point = {
                        "ph": float(value["ph"]),
                        "turbidity": float(value["turbidity"]),
                        "tds": float(value["tds"]),
                        "temperature": float(value["temperature"]),
                        "conductivity": float(value["conductivity"]),
                        "timestamp": value.get("timestamp", timestamp)
                    }
                    
                    # Basic validation
                    if not (0 <= data_point["ph"] <= 14):
                        validation_errors.append(f"Invalid pH value in {timestamp}: {data_point['ph']}")
                        continue
                    
                    if data_point["turbidity"] < 0:
                        validation_errors.append(f"Invalid turbidity value in {timestamp}: {data_point['turbidity']}")
                        continue
                    
                    if data_point["tds"] < 0:
                        validation_errors.append(f"Invalid TDS value in {timestamp}: {data_point['tds']}")
                        continue
                    
                    if not (0 <= data_point["temperature"] <= 100):
                        validation_errors.append(f"Invalid temperature value in {timestamp}: {data_point['temperature']}")
                        continue
                    
                    if data_point["conductivity"] < 0:
                        validation_errors.append(f"Invalid conductivity value in {timestamp}: {data_point['conductivity']}")
                        continue
                    
                    # Validate timestamp format
                    if not data_point["timestamp"]:
                        validation_errors.append(f"Missing timestamp in {timestamp}")
                        continue

                    # Add the validated data point to the list
                    corrosion_data.append(data_point)

                except (KeyError, ValueError, TypeError) as e:
                    validation_errors.append(f"Invalid data point {timestamp}: {str(e)}")
                    continue
            
            if validation_errors:
                print(f"\nValidation warnings ({len(validation_errors)} issues):")
                for error in validation_errors[:10]:  # Show first 10 errors
                    print(f"  - {error}")
                if len(validation_errors) > 10:
                    print(f"  ... and {len(validation_errors) - 10} more issues")
            
            if not corrosion_data:
                print("Error: No valid data points found in corrosion_data.json")
                return False
            
            print(f"\nSuccessfully loaded {len(corrosion_data)} valid data points")
            
            # Show data quality summary
            ph_values = [d["ph"] for d in corrosion_data]
            turbidity_values = [d["turbidity"] for d in corrosion_data]
            tds_values = [d["tds"] for d in corrosion_data]
            temp_values = [d["temperature"] for d in corrosion_data]
            cond_values = [d["conductivity"] for d in corrosion_data]
            
            print(f"\nData Quality Summary:")
            print(f"pH range: {min(ph_values):.2f} - {max(ph_values):.2f}")
            print(f"Turbidity range: {min(turbidity_values):.2f} - {max(turbidity_values):.2f}")
            print(f"TDS range: {min(tds_values):.0f} - {max(tds_values):.0f}")
            print(f"Temperature range: {min(temp_values):.1f} - {max(temp_values):.1f}")
            print(f"Conductivity range: {min(cond_values):.0f} - {max(cond_values):.0f}")
            
    except json.JSONDecodeError as e:
        print(f"Error reading JSON file: {e}")
        return False
    except FileNotFoundError:
        print("Error: corrosion_data.json file not found")
        return False
    
    # API endpoint
    url = f'{api_url}/train-corrosion-model'
    
    # Enhanced training parameters
    params = {
        'sequence_length': sequence_length
    }
    
    try:
        print(f"\nTraining Configuration:")
        print(f"  - Sequence length: {sequence_length}")
        print(f"  - API URL: {api_url}")
        print(f"  - Expected epochs: {epochs}")
        print(f"  - Data points: {len(corrosion_data)}")
        
        print("\nStep 1: Analyzing data distribution...")
        
        # First, analyze data distribution
        response = requests.post(url + "/analyze", json={"readings": corrosion_data}, params=params)
        response.raise_for_status()
        
        # Print data distribution
        result = response.json()
        print("\nData Distribution Analysis:")
        print("=" * 40)
        for key, value in result['data_distribution'].items():
            print(f"{key}: {value}")
        
        # Interactive confirmation
        print(f"\nThis will create sequences of length {sequence_length} for LSTM training.")
        print("The model will learn to predict corrosion risk based on sequential patterns.")
        
        while True:
            proceed = input("\nProceed with training? (y/n): ").lower()
            if proceed in ['y', 'yes']:
                break
            elif proceed in ['n', 'no']:
                print("Training cancelled by user.")
                return False
            else:
                print("Please enter 'y' or 'n'")
        
        print("\nStep 2: Training enhanced corrosion prediction model...")
        print("This may take several minutes depending on the data size...")
        
        # Send POST request to train model
        response = requests.post(url, json={"readings": corrosion_data}, params=params)
        response.raise_for_status()
        
        # Print detailed training results
        result = response.json()
        print(f"\n{'='*60}")
        print("TRAINING COMPLETED SUCCESSFULLY!")
        print(f"{'='*60}")
        print(f"Status: {result['message']}")
        
        # Model parameters
        print(f"\nModel Architecture:")
        for key, value in result['model_parameters'].items():
            print(f"  {key}: {value}")
        
        # Enhanced training history analysis
        print(f"\nTraining Progress:")
        history = result['training_history']
        
        # Show training metrics
        final_epoch = len(history['loss'])
        final_loss = history['loss'][-1]
        final_accuracy = history['accuracy'][-1]
        final_val_loss = history['val_loss'][-1]
        final_val_accuracy = history['val_accuracy'][-1]
        
        print(f"  Total epochs completed: {final_epoch}")
        print(f"  Final training loss: {final_loss:.4f}")
        print(f"  Final training accuracy: {final_accuracy:.4f}")
        print(f"  Final validation loss: {final_val_loss:.4f}")
        print(f"  Final validation accuracy: {final_val_accuracy:.4f}")
        
        # Show epoch-by-epoch progress (last 10 epochs)
        print(f"\nTraining History (Last 10 epochs):")
        print("Epoch | Train Loss | Train Acc | Val Loss | Val Acc")
        print("-" * 50)
        start_epoch = max(0, len(history['loss']) - 10)
        for i in range(start_epoch, len(history['loss'])):
            epoch_num = i + 1
            train_loss = history['loss'][i]
            train_acc = history['accuracy'][i]
            val_loss = history['val_loss'][i] if 'val_loss' in history else 0
            val_acc = history['val_accuracy'][i] if 'val_accuracy' in history else 0
            print(f"{epoch_num:5d} | {train_loss:10.4f} | {train_acc:9.4f} | {val_loss:8.4f} | {val_acc:7.4f}")
        
        # Model performance assessment
        print(f"\nModel Performance Assessment:")
        if final_val_accuracy >= 0.9:
            performance = "Excellent"
        elif final_val_accuracy >= 0.8:
            performance = "Good"
        elif final_val_accuracy >= 0.7:
            performance = "Fair"
        else:
            performance = "Needs Improvement"
        
        print(f"  Overall Performance: {performance}")
        
        # Recommendations
        print(f"\nRecommendations:")
        if final_val_accuracy < 0.8:
            print("  - Consider collecting more diverse training data")
            print("  - Try adjusting the sequence length parameter")
            print("  - Verify data quality and labeling accuracy")
        elif abs(final_loss - final_val_loss) > 0.1:
            print("  - Model may be overfitting - consider regularization")
        else:
            print("  - Model training appears successful!")
            print("  - Monitor real-world performance and retrain as needed")
        
        print(f"\nTraining completed successfully! Model saved to ml-service/app/models/saved/")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"\nError during training: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_detail = e.response.json()
                print(f"Server error details: {error_detail}")
            except:
                print(f"Server response: {e.response.text}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False

def train_all_models():
    """Train all available models"""
    print("Training all water quality monitoring models...")
    
    # Train corrosion model
    success = train_corrosion_model()
    if success:
        print("\n" + "="*60)
        print("ALL MODELS TRAINED SUCCESSFULLY!")
        print("="*60)
        print("Next steps:")
        print("1. Test the models using the API endpoints")
        print("2. Monitor model performance in production")
        print("3. Retrain periodically with new data")
    else:
        print("\nTraining failed. Please check the error messages above.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train Enhanced Corrosion Prediction Model')
    parser.add_argument('--sequence-length', type=int, default=10, 
                       help='Length of input sequences for LSTM (default: 10)')
    parser.add_argument('--api-url', type=str, default='http://localhost:8000',
                       help='API endpoint URL (default: http://localhost:8000)')
    parser.add_argument('--epochs', type=int, default=30,
                       help='Number of training epochs (default: 30)')
    parser.add_argument('--all', action='store_true',
                       help='Train all models')
    
    args = parser.parse_args()
    
    if args.all:
        train_all_models()
    else:
        train_corrosion_model(
            sequence_length=args.sequence_length,
            api_url=args.api_url,
            epochs=args.epochs
        ) 