# Phase 2: Implementation Roadmap (The Living System)

Research mukammal hone ke baad, ab hum system ko functional banayen ge. Niche diye gaye steps follow kiye jayen ge:

## Step 1: Full-Stack Conversion
*   **Action**: `package.json` ko update karna aur `server.ts` create karna.
*   **Goal**: Vite ko Express ke sath integrate karna taake hum `/api` routes bana saken.

## Step 2: Demand Simulator (The Data Source)
*   **Action**: Backend par aik background task chalana jo har 5-10 seconds baad traffic data generate kare.
*   **Logic**: Sine wave function ka istemal karna taake traffic mein natural "Ups and Downs" nazar aayen.

## Step 3: Pricing Engine (ML Inference)
*   **Action**: Simulator ke data par "Rolling Average" algorithm apply karna.
*   **Formula**: 
    1. Calculate `avg_demand_last_5_mins`.
    2. If `current_demand > avg_demand * 1.2`, then `Surge = Active`.
    3. Calculate `Multiplier = 1 + (demand_spike_ratio)`.

## Step 4: Dashboard Connectivity
*   **Action**: `App.tsx` mein `useEffect` ko update karna taake woh mock data ki bajaye `/api/stats` se real-time data fetch kare.

## Step 5: Firebase Setup
*   **Action**: `set_up_firebase` tool ka istemal kar ke database connect karna.
*   **Goal**: Har surge event aur transaction ko permanent store karna.
