import pandas as pd
import numpy as np
from typing import List, Dict, Union, Tuple
from sklearn.preprocessing import MinMaxScaler

def is_corrosive(row: Dict[str, float]) -> bool:
    """
    Determine if water conditions are corrosive based on multiple parameters.
    Returns True if conditions are corrosive, False otherwise.
    
    Thresholds based on actual data patterns:
    - pH: Below 6.8 indicates increasing corrosion risk
    - TDS: >400 mg/L starts to be concerning
    - Conductivity: >700 µS/cm indicates high mineral content
    - Temperature: Outside 26-29°C may increase risk
    """
    # Define severity levels for each parameter
    severe_conditions = [
        row['ph'] < 6.5,                      # Severe pH drop
        row['tds'] > 450,                     # Very high TDS
        row['conductivity'] > 800,            # Very high conductivity
        abs(row['temperature'] - 27.5) > 3    # Far from optimal temp
    ]
    
    moderate_conditions = [
        6.5 <= row['ph'] < 6.8,              # Moderate pH drop
        350 < row['tds'] <= 450,             # Moderate TDS
        700 < row['conductivity'] <= 800,     # Moderate conductivity
        1.5 < abs(row['temperature'] - 27.5) <= 3  # Moderate temp deviation
    ]
    
    # Count conditions
    severe_count = sum(severe_conditions)
    moderate_count = sum(moderate_conditions)
    
    # Water is considered corrosive if:
    # 1. pH drops below 6.5 (severe)
    # 2. pH is moderately low (6.5-6.8) with other concerning factors
    # 3. Multiple parameters show concerning values
    return (
        severe_conditions[0] or  # Severe pH drop
        (row['ph'] < 6.8 and (severe_count + moderate_count >= 2)) or  # Moderate pH with other issues
        severe_count >= 2 or  # Multiple severe conditions
        (severe_count >= 1 and moderate_count >= 2) or  # One severe + two moderate
        (moderate_count >= 3)  # Multiple moderate conditions
    )

def prepare_sequence_data(data: List[Dict[str, Union[float, str]]], sequence_length: int = 10, scaler: MinMaxScaler = None) -> tuple:
    """
    Prepare sequential data for LSTM model.
    
    Args:
        data: List of dictionaries containing sensor readings
        sequence_length: Number of time steps to use for each sequence
        scaler: Optional pre-fitted MinMaxScaler
        
    Returns:
        X: numpy array of shape (n_sequences, sequence_length, n_features)
        y: numpy array of shape (n_sequences,) containing labels
        scaler: Fitted MinMaxScaler
    """
    # Convert to DataFrame
    df = pd.DataFrame(data)
    
    # Sort by timestamp
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp')
    
    # Extract features
    features = ['ph', 'turbidity', 'tds', 'temperature', 'conductivity']
    
    # Create sequences and labels before scaling
    sequences = []
    labels = []
    
    for i in range(len(df) - sequence_length):
        # Get the sequence data
        sequence_data = df[features].iloc[i:i + sequence_length].values
        next_reading = df[features].iloc[i + sequence_length].to_dict()
        
        # Label based on the next reading's conditions (using unscaled data)
        label = 1 if is_corrosive(next_reading) else 0
        
        sequences.append(sequence_data)
        labels.append(label)
    
    # Convert sequences to numpy array
    sequences = np.array(sequences)
    
    # Scale the sequences if needed
    if scaler is None:
        scaler = MinMaxScaler()
        # Reshape to 2D for scaling
        original_shape = sequences.shape
        sequences_2d = sequences.reshape(-1, sequences.shape[-1])
        sequences_2d = scaler.fit_transform(sequences_2d)
        # Reshape back to 3D
        sequences = sequences_2d.reshape(original_shape)
    else:
        # Reshape to 2D for scaling
        original_shape = sequences.shape
        sequences_2d = sequences.reshape(-1, sequences.shape[-1])
        sequences_2d = scaler.transform(sequences_2d)
        # Reshape back to 3D
        sequences = sequences_2d.reshape(original_shape)
    
    return sequences, np.array(labels), scaler

def combine_and_prepare_data(
    corrosive_data: List[Dict[str, Union[float, str]]], 
    non_corrosive_data: List[Dict[str, Union[float, str]]], 
    sequence_length: int = 10
) -> Tuple[np.ndarray, np.ndarray, MinMaxScaler]:
    """
    Combine corrosive and non-corrosive data and prepare for training.
    
    Args:
        corrosive_data: List of readings from corrosive conditions
        non_corrosive_data: List of readings from non-corrosive conditions
        sequence_length: Number of time steps to use for each sequence
        
    Returns:
        X_train: Training sequences
        y_train: Training labels
        scaler: Fitted MinMaxScaler
    """
    # Process corrosive data first to get the scaler
    X_corrosive, y_corrosive, scaler = prepare_sequence_data(corrosive_data, sequence_length)
    
    # Process non-corrosive data with the same scaler
    X_non_corrosive, y_non_corrosive, _ = prepare_sequence_data(non_corrosive_data, sequence_length, scaler)
    
    # Combine datasets
    X_combined = np.concatenate([X_corrosive, X_non_corrosive])
    y_combined = np.concatenate([y_corrosive, y_non_corrosive])
    
    # Shuffle the data
    indices = np.arange(len(X_combined))
    np.random.shuffle(indices)
    
    return X_combined[indices], y_combined[indices], scaler

def analyze_data_distribution(y: np.ndarray) -> Dict[str, float]:
    """
    Analyze the distribution of classes in the dataset.
    
    Args:
        y: Array of labels
        
    Returns:
        Dictionary containing class distribution statistics
    """
    total = len(y)
    corrosive = np.sum(y)
    non_corrosive = total - corrosive
    
    return {
        'total_sequences': total,
        'corrosive_sequences': int(corrosive),
        'non_corrosive_sequences': int(non_corrosive),
        'corrosive_percentage': (corrosive / total) * 100,
        'non_corrosive_percentage': (non_corrosive / total) * 100
    } 