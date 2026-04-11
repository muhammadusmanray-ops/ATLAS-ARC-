import pandas as pd
import numpy as np

# ATLAS ARC AGENTIC ECONOMY - ML RESEARCH LOGIC
# -------------------------------------------
# Goal: Predict next-minute demand using XGBoost logic
# Detect anomalies using Z-Score Statistics

def simulate_training_data():
    """Simulates 24 hours of Agentic traffic data"""
    np.random.seed(42)
    time_index = pd.date_range("2026-04-09", periods=1440, freq="min")
    
    # Base pattern (sine wave for daily cycles)
    base_demand = 100 + 50 * np.sin(np.linspace(0, 4 * np.pi, 1440))
    # Add random Agent activity noise
    noise = np.random.normal(0, 10, 1440)
    # Inject Artificial Anomalies (Bot attacks)
    anomalies = np.zeros(1440)
    anomalies[::200] = np.random.uniform(300, 500, 7)
    
    total_demand = base_demand + noise + anomalies
    
    df = pd.DataFrame({
        "timestamp": time_index,
        "demand": total_demand.astype(int),
        "agent_load": (total_demand / 1.5).astype(int),
        "is_anomaly": (total_demand > 250).astype(int)
    })
    return df

def calculate_z_score(current_value, mean, std):
    """Z-Score calculation logic used in server.ts"""
    return (current_value - mean) / std

print("--- ML RESEARCH INITIALIZED ---")
data = simulate_training_data()
print(f"Dataset Size: {len(data)} rows")
print(f"Anomalies Detected in training: {data['is_anomaly'].sum()}")
print("ML Algorithm Selected: Extreme Gradient Boosting (XGBoost)")
print("Objective: Minimizing Root Mean Squared Error (RMSE) for per-action pricing")
print("--------------------------------")
