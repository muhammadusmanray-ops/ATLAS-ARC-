# ML Code Architecture: Atlas Arc

Is project mein ML logic ko hum niche diye gaye structure ke mutabiq implement karenge:

## 1. Data Pipeline (The Input)
Hum har request ko aik "Log" ki surat mein save karenge:
*   `timestamp`: Kab request aayi.
*   `volume`: Kitni requests aayin.
*   `latency`: Server kitna slow hua.
*   `agent_id`: Kisne request ki.

## 2. Feature Vector (The Model Input)
Inference se pehle hum data ko "Feature Vector" mein badlenge:
*   `lag_1`: Pichle 1 minute ka traffic.
*   `lag_5`: Pichle 5 minute ka traffic.
*   `rolling_mean`: 15 minute ka average.
*   `is_peak_hour`: Boolean (True/False).

## 3. Inference Engine (The Brain)
Hum **XGBoost** ka lightweight version ya **Simple Linear Regression** use karenge.
*   **Function**: `predictNextMinuteDemand(features)`
*   **Output**: `predicted_volume` (e.g., 500 requests/sec).

## 4. Pricing Logic (The Output)
```javascript
const base_price = 0.001; // USDC
const capacity = 300; // Normal server capacity
const surge_multiplier = Math.max(1, predicted_volume / capacity);
const final_price = base_price * surge_multiplier;
```

## 5. Anomaly Detection Logic
Model check karega:
*   `Entropy of Requests`: Agar requests bohat zyada repetitive hain to woh bot hai.
*   `Velocity Spike`: Agar 1 second mein 1000% izafa hua to woh anomaly hai.
