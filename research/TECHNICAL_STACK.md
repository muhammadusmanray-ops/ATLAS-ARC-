# Technical Stack & Architecture

Atlas Arc ka technical structure niche diye gaye components par mushtamil hai:

## 1. Frontend (The Command Center)
*   **Framework**: React 18 with Vite.
*   **Styling**: Tailwind CSS v4 (Robotic/HUD design).
*   **Animations**: Motion (for smooth transitions and glitch effects).
*   **Charts**: Recharts (for real-time ML data visualization).
*   **Icons**: Lucide-React.

## 2. Backend (The Orchestrator)
*   **Runtime**: Node.js with Express.
*   **API Layer**: RESTful endpoints for agents to query prices and data.
*   **Database**: Firebase Firestore (for storing logs, user profiles, and model metadata).

## 3. Machine Learning (The Brain)
*   **Language**: Python (FastAPI for serving the model).
*   **Core Libraries**: Pandas, NumPy, Scikit-learn, XGBoost/TensorFlow.
*   **Inference Engine**: Aik lightweight API jo har request par surge multiplier calculate karti hai.

## 4. Blockchain & Payments (The Economy)
*   **Network**: Arc L1 (High TPS, Low Latency).
*   **Asset**: Circle USDC (Stablecoin for nanopayments).
*   **Settlement**: Circle SDK/API for triggering sub-cent transactions.

## 5. Deployment
*   **Containerization**: Docker.
*   **Hosting**: Google Cloud Run (for scalability).
*   **CI/CD**: Automatic builds on code changes.
