# Atlas Arc: ML Research & Strategy

Is document mein Atlas Arc project ke ML components, libraries, aur algorithms ki mukammal tafseel di gayi hai.

## 1. Future Demand Prediction (Concept)
Future demand predict karne ka maqsad yeh hai ke hum pehle se jaan saken ke agle kuch minutes mein traffic kitna barhne wala hai. Isse hum "Predictive Surging" kar sakte hain, yani demand barhne se PEHLE qeemat adjust kar sakte hain.

## 2. ML Libraries
Hum niche di gayi libraries ka istemal karenge:

*   **Pandas & NumPy**: Data manipulation aur numerical calculations ke liye. Raw logs ko "Time-Series" format mein lane ke liye yeh zaroori hain.
*   **Scikit-learn**: Baseline models (jaise Linear Regression) aur data scaling/preprocessing ke liye.
*   **TensorFlow / PyTorch**: Agar hum Deep Learning (LSTM) use karte hain to inmein se aik library use hogi.
*   **Prophet (by Meta)**: Time-series forecasting ke liye behtareen library hai jo "Seasonality" (daily/weekly patterns) ko khud handle karti hai.
*   **XGBoost / LightGBM**: Agar hum tabular data par "Gradient Boosting" use karna chahen (jo ke aksar LSTM se fast hota hai).

## 3. Algorithms (The "Brain")
Hum inmein se kisi aik ya combination ka use kar sakte hain:

### A. LSTM (Long Short-Term Memory)
*   **Kyun?** Yeh aik kism ka Recurrent Neural Network (RNN) hai jo purane data ke patterns ko yaad rakhta hai. Time-series data ke liye yeh industry standard hai.
*   **Use Case**: Agar traffic mein complex patterns hain jo ghanton pehle shuru hote hain.

### B. XGBoost / LightGBM
*   **Kyun?** Yeh decision-tree based models hain. Agar hum "Lag Features" (maslan: pichle 5 minute ka traffic) sahi se banayen, to yeh models LSTM se zyada accurate aur fast ho sakte hain.
*   **Use Case**: Real-time inference ke liye jahan speed bohat zaroori ho.

### C. Prophet
*   **Kyun?** Yeh handle karta hai "Seasonality". Maslan, agar har Friday raat ko traffic barhta hai, to Prophet isay asani se seekh lega.

## 4. ML Pipeline Steps (The Workflow)

1.  **Data Collection**: 
    *   Input: `[Timestamp, Request_Count, Avg_Latency, User_Type]`
    *   Hum har 1 minute ka data aggregate karenge.

2.  **Feature Engineering**:
    *   `Hour_of_Day`: (0-23)
    *   `Day_of_Week`: (0-6)
    *   `Rolling_Averages`: Pichle 5, 15, aur 60 minutes ka average traffic.
    *   `Lag_Features`: Pichle 1 minute aur 5 minute ka actual traffic.

3.  **Training**:
    *   Model ko pichle 7-30 din ka data dikhaya jayega.
    *   Model seekhega ke jab rolling average barhta hai, to agle 5 minute mein kya hota hai.

4.  **Inference (Real-time)**:
    *   Har 1 minute baad, current data model ko diya jayega.
    *   Model output dega: `Predicted_Traffic_Next_5m`.
    *   Logic: `Surge_Multiplier = Max(1.0, Predicted_Traffic / Normal_Capacity)`.

## 5. Implementation Strategy
Hum pehle **XGBoost** se shuru karenge kyunke yeh lightweight hai aur real-time APIs mein asani se deploy ho jata hai. Agar patterns zyada complex huye, to hum **LSTM** par shift honge.
