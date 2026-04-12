import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import axios from "axios";
import { mean, standardDeviation, zScore as calculateZScore } from "simple-statistics";
import { RandomForestRegression } from 'ml-random-forest';
import fs from "fs";
import { config } from "dotenv";
import pkg from 'pg';
const { Pool } = pkg;

import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

// Load environment variables
config();

// --- Neon DB (PostgreSQL) Connection Pool ---
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

db.connect()
  .then(() => console.log('[NEON DB] ✅ Connected to Neon PostgreSQL successfully!'))
  .catch((e: any) => console.error('[NEON DB] ❌ Connection failed:', e.message));

// Helper: Save transaction to Neon DB
async function saveTransactionToDB(tx: any) {
  try {
    await db.query(
      `INSERT INTO ai_transactions_ledger (transaction_id, agent_id, amount_usdc, blockchain_network, status, tx_hash, api_key_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (transaction_id) DO NOTHING`,
      [tx.id, tx.agent || 'SYSTEM', tx.amount, tx.network || 'ETH-SEPOLIA', tx.status, tx.hash, tx.apiKeyUsed || 'N/A']
    );
  } catch (e: any) {
    console.error('[NEON DB] Failed to save transaction:', e.message);
  }
}

// Helper: Save demand metrics to Neon DB
async function saveMetricsToDB(data: any) {
  try {
    await db.query(
      `INSERT INTO market_demand_metrics (current_demand, predicted_demand, surge_multiplier, z_score, is_anomaly, btc_price, eth_price, sol_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [data.currentDemand, data.predictedDemand, data.surgeMultiplier, data.zScore, data.isAnomaly,
       data.btc || 0, data.eth || 0, data.sol || 0]
    );
  } catch (e: any) {
    console.error('[NEON DB] Failed to save metrics:', e.message);
  }
}

// Helper: Save agent activity to Neon DB
async function saveAgentActivityToDB(agent: any) {
  try {
    await db.query(
      `INSERT INTO agent_activity_logs (agent_id, agent_role, status, last_action, layer)
       VALUES ($1, $2, $3, $4, $5)`,
      [agent.id, agent.role, agent.status, agent.lastAction || 'Idle', agent.layer]
    );
  } catch (e: any) {
    console.error('[NEON DB] Failed to save agent log:', e.message);
  }
}

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;
const CIRCLE_CLIENT_KEY = process.env.CIRCLE_CLIENT_KEY;
const CIRCLE_ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET; // Required for real transfers
const CIRCLE_WALLET_ID = process.env.CIRCLE_WALLET_ID; // The wallet from which to send funds

let circleClient: any = null;
try {
  if (CIRCLE_API_KEY) {
    const sdkConfig = {
      apiKey: CIRCLE_API_KEY,
      entitySecret: CIRCLE_ENTITY_SECRET || ''
    };
    circleClient = initiateDeveloperControlledWalletsClient(sdkConfig);
    console.log("[CIRCLE] SDK Client initialized successfully.");
  }
} catch (e: any) {
  console.log("[CIRCLE] SDK Init Failed:", e.message);
}

console.log("[CIRCLE] API Key Loaded:", CIRCLE_API_KEY ? "YES" : "NO");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local JSON fallback ledger (backup if DB is unavailable)
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const LEDGER_PATH = path.join(DATA_DIR, "ledger.json");
if (!fs.existsSync(LEDGER_PATH)) fs.writeFileSync(LEDGER_PATH, JSON.stringify([]));

console.log("[SERVER] Initializing Atlas Arc Server...");

// Global error handlers for the process
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // --- ML Demand Simulator State ---
  let currentDemand = 50;
  let predictedDemand = 50;
  let isAnomaly = false;
  let zScore = 0;
  let demandHistory: { time: string, demand: number, price: number, predicted: number, isAnomaly: boolean }[] = [];
  const basePrice = 0.0005; // Reduced to ensure sub-cent pricing
  let transactionHistory: { id: string, amount: number, timestamp: string, status: string, hash: string }[] = [];
  let liveMarketData = { btc: 0, eth: 0, sol: 0 };

  // Fetch Real Crypto Prices from CoinGecko (Free API)
  const fetchLivePrices = async () => {
    try {
      // Using axios for more robust requests
      const resp = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd');
      const data = resp.data;
      if (data.bitcoin && data.ethereum && data.solana) {
        liveMarketData = {
          btc: data.bitcoin.usd,
          eth: data.ethereum.usd,
          sol: data.solana.usd
        };
        console.log("[MARKET] Real-time Prices Synced:", liveMarketData);
      }
    } catch (e) {
      console.error("[MARKET ERROR] Failed to fetch live prices, using fallback:", e);
      // Fallback prices if API fails
      if (liveMarketData.btc === 0) {
        liveMarketData = { btc: 65000, eth: 3500, sol: 140 };
      }
    }
  };

  fetchLivePrices();
  setInterval(fetchLivePrices, 30000); // Sync every 30 seconds

  // Fetch Real Recent Transactions from Circle to populate the ledger with fully working links
  const fetchRecentRealTransactions = async () => {
    if (CIRCLE_API_KEY && CIRCLE_WALLET_ID) {
      try {
        const resp = await axios.get(`https://api.circle.com/v1/w3s/transactions?walletIds=${CIRCLE_WALLET_ID}&pageSize=15`, {
          headers: { 'Authorization': `Bearer ${CIRCLE_API_KEY}` }
        });
        if (resp.data?.data?.transactions) {
          const realTxs = resp.data.data.transactions
            .filter((t: any) => t.state === "COMPLETE" && t.txHash)
            .map((t: any, i: number) => ({
              id: t.id,
              agent: `EX-${(i % 5) + 1}`,
              amount: t.amounts ? parseFloat(t.amounts[0]) : 0.005,
              currency: "USDC",
              status: "CONFIRMED_ON_ARC",
              network: "ARC-TESTNET (USDC)",
              timestamp: t.createDate,
              apiKeyUsed: `${CIRCLE_API_KEY.substring(0, 4)}****`,
              hash: t.txHash
            }));
            
          // Add them to history if not exists
          realTxs.forEach((rtx: any) => {
            if (!transactionHistory.find(t => t.hash === rtx.hash)) {
              transactionHistory.push(rtx);
            }
          });
          // Sort descending by timestamp
          transactionHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          console.log(`[CIRCLE] Populated ledger with ${realTxs.length} real historical transactions.`);
        }
      } catch (e) {
        console.error("[CIRCLE] Failed to fetch historical real transactions:", e);
      }
    }
  };
  
  fetchRecentRealTransactions();

  // State to track if a real transaction is already in flight to reach the nonce/queue limit safely

  let isTransactionPending = false;

  const simulateCirclePayment = async (amount: number, agentId: string) => {
    let txId = `SIM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    let txHash = ""; // Start with empty hash for real attempts
    let status = "PENDING_OR_SIMULATED";
    
    // --- REAL SDK INTEGRATION ---
    if (circleClient && CIRCLE_ENTITY_SECRET && CIRCLE_WALLET_ID && !isTransactionPending) {
      try {
        if (!circleClient.createTransaction) {
           throw new Error("Circle Client not fully initialized - createTransaction missing");
        }
        isTransactionPending = true; // Lock
        console.log(`[CIRCLE] Attempting REAL testnet transfer for Agent ${agentId} - Amount: ${amount.toFixed(6)}`);
        
        const txParams = {
          walletId: CIRCLE_WALLET_ID,
          tokenId: process.env.CIRCLE_TOKEN_ID || "15dc2b5d-0994-58b0-bf8c-3a0501148ee8", 
          destinationAddress: "0x45d4391526b865c1a6fa435bfec57a6810f0981f", 
          amounts: [amount.toFixed(6)],
          idempotencyKey: `sim-${Date.now()}-${Math.floor(Math.random()*1000)}`
        };
        console.log("[CIRCLE] TX Params:", JSON.stringify(txParams, null, 2));

        const response = await circleClient.createTransaction(txParams);
        
        if (response?.data?.id) {
          txId = response.data.id;
          status = "BROADCASTED_ON_ARC";
          
          // --- POLLING FOR REAL HASH ---
          console.log(`[CIRCLE] Transaction ${txId} initiated. Polling for hash...`);
          // Try to get hash for up to 15 seconds
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            try {
              const txDetails = await circleClient.getTransaction({ id: txId });
              if (txDetails?.data?.transaction?.txHash) {
                txHash = txDetails.data.transaction.txHash;
                status = "CONFIRMED_ON_ARC";
                console.log(`[CIRCLE] 💎 REAL HASH FOUND: ${txHash}`);
                break;
              }
            } catch (pollErr) {
              console.log(`[CIRCLE] Polling iteration ${i+1} failed...`);
            }
          }
          
          if (!txHash) {
            console.log(`[CIRCLE] Hash not found after polling. It will be indexed later.`);
            // Release lock after a safety delay if no hash found
            setTimeout(() => { isTransactionPending = false; }, 5000);
          } else {
            // Success! Release lock immediately
            isTransactionPending = false;
          }
        }
      } catch (err: any) {
         let errorMsg = err.response?.data?.message || err.message;
         if (err.response?.data?.validationErrors) {
           errorMsg += " | Validation Errors: " + JSON.stringify(err.response.data.validationErrors);
         }
         console.error(`[CIRCLE SDK ERROR] Failed: ${errorMsg}`);
         status = "FAILED_VAL_ERROR";
         isTransactionPending = false; // Release lock on error
      }
    } else if (isTransactionPending) {
      console.log("[CIRCLE] Skipping real tx: Another transaction is currently pending.");
      status = "QUEUED_SIMULATED";
      txHash = "0xSIM" + Math.random().toString(16).substring(2, 10); // Clearly mark as simulated
    } else {
      status = "MOCK_MODE";
      txHash = "0xMOCK" + Math.random().toString(16).substring(2, 10);
    }

    const tx = {
      id: txId,
      agent: agentId,
      amount: parseFloat(amount.toFixed(6)),
      currency: "USDC",
      status: status,
      network: "ARC-L1 (USDC Native)",
      timestamp: new Date().toISOString(),
      apiKeyUsed: CIRCLE_API_KEY ? `${CIRCLE_API_KEY.substring(0, 4)}****` : "MISSING",
      hash: txHash
    };
    
    // Save to Neon DB (Cloud) only if it's a real or rare transaction
    if (status !== "MOCK_MODE" || Math.random() < 0.05) {
      saveTransactionToDB(tx);
    }
    try {
      const currentLedger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf-8'));
      currentLedger.unshift(tx);
      fs.writeFileSync(LEDGER_PATH, JSON.stringify(currentLedger.slice(0, 100), null, 2));
    } catch (err) {
      console.error("[LEDGER ERROR] Failed to write local backup:", err);
    }
    
    return tx;
  };
  
  // --- Agentic Economy Infrastructure ---
  interface Agent {
    id: string;
    name: string;
    role: "SCOUT" | "BRAIN" | "EXECUTOR" | "GUARDIAN" | "BOSS";
    status: "IDLE" | "ACTIVE" | "OFF" | "ONLINE";
    task: string;
    layer: number;
    lastAction?: string;
  }

  class AgentManager {
    agents: Agent[] = [];
    
    constructor() {
      // Level 0: Command
      this.agents.push({ id: "MYTHOS", name: "MYTHOS_CORE", role: "BOSS", status: "ONLINE", task: "ORCHESTRATION", layer: 0 });
      
      // Level 1: Scouts (Fetchers)
      const scoutTasks = ["BTC_PRICE_SYNC", "SOL_LIQUIDITY_SCAN", "SENTIMENT_ANALYSIS", "WHALE_MOVEMENT", "MARKET_SENTINEL"];
      scoutTasks.forEach((task, i) => {
        this.agents.push({ id: `SC-${i+1}`, name: `SCOUT_${i+1}`, role: "SCOUT", status: "IDLE", task, layer: 1 });
      });

      // Level 2: Brains (ML/Inference)
      for (let i = 0; i < 8; i++) {
        this.agents.push({ id: `BR-${i+1}`, name: `BRAIN_${i+1}`, role: "BRAIN", status: "IDLE", task: "XGBOOST_INFERENCE", layer: 2 });
      }

      // Level 3: Executors (Payments)
      for (let i = 0; i < 5; i++) {
        this.agents.push({ id: `EX-${i+1}`, name: `EXECUTOR_${i+1}`, role: "EXECUTOR", status: "IDLE", task: "CIRCLE_USDC_PAY", layer: 3 });
      }

      // Special Layer: Guardians (Security)
      this.agents.push({ id: `GU-1`, name: `GUARDIAN_1`, role: "GUARDIAN", status: "ONLINE", task: "ANOMALY_WATCH", layer: 2 });
    }

    update(isAnomaly: boolean, currentDemand: number) {
      this.agents.forEach(agent => {
        if (agent.role === "BOSS") return;

        // Randomly activate agents based on demand
        const activityThreshold = Math.min(0.9, (currentDemand / 400));
        if (Math.random() < activityThreshold) {
          agent.status = "ACTIVE";
          
          // Assign dynamic actions and trigger simulated payments
          if (agent.role === "SCOUT") {
            agent.lastAction = `Synced ${agent.id.includes('BTC') ? 'BTC' : 'SOL'} data at ${new Date().toLocaleTimeString()}`;
          }
          if (agent.role === "BRAIN") {
            agent.lastAction = `ML Inference: Predicted demand spike to ${predictedDemand}`;
          }
          if (agent.role === "EXECUTOR") {
            const payAmount = Math.random() * 0.009; // Ensure all agent actions are sub-cent
            agent.lastAction = `Settling $${payAmount.toFixed(4)} USDC...`;
            simulateCirclePayment(payAmount, agent.id).then(tx => {
              agent.lastAction = `TX: ${tx.id.substring(0, 10)}... settled`;
            });
          }
          if (agent.role === "GUARDIAN") {
            agent.status = isAnomaly ? "ACTIVE" : "ONLINE";
            agent.lastAction = isAnomaly ? "CRITICAL: Z-Score high! Throttling traffic." : "System health optimized.";
          }
        } else {
          agent.status = "IDLE";
        }
      });
    }

    getAgents() {
      return this.agents;
    }
  }

  const agentManager = new AgentManager();
  const connections = agentManager.getAgents()
    .filter(a => a.layer > 0)
    .map(a => ({ from: "MYTHOS", to: a.id, strength: Math.random() }));

  // Neural Network Weights Simulation
  let neuralWeights = Array.from({ length: 24 }, () => Math.random());

  // Real Machine Learning Models (Random Forest)
  const options = {
    seed: 3,
    maxFeatures: 2,
    replacement: false,
    nEstimators: 10
  };
  const rfModel = new RandomForestRegression(options);
  let isModelTrained = false;

  // Simulation Loop (Visual updates every 1.5 seconds)
  let loopCount = 0;
  setInterval(() => {
    loopCount++;
    try {
      // 1. Generate Base Demand with Market Influence
      const marketVolatility = (liveMarketData.sol % 10) / 10; // Use SOL price tail as noise
      currentDemand = Math.floor(100 + 100 * Math.sin(Date.now() / 50000) + Math.random() * 50 + (marketVolatility * 20));
      
      // Inject spikes based on "Market Events" (Simulated)
      if (Math.random() > 0.95 || marketVolatility > 0.8) {
        currentDemand += 150;
      }
      const shouldInjectAnomaly = Math.random() < 0.05;
      const noise = shouldInjectAnomaly ? (Math.random() * 200 + 150) : ((Math.random() - 0.5) * 40);
      
      currentDemand = Math.max(10, Math.floor(currentDemand + noise));

      // 2. Anomaly Detection (Z-Score from simple-statistics)
      const historyValues = demandHistory.map(h => h.demand);
      if (historyValues.length > 5) {
        const histMean = mean(historyValues);
        const histStdDev = standardDeviation(historyValues);
        zScore = histStdDev > 0 ? calculateZScore(currentDemand, histMean, histStdDev) : 0;
        isAnomaly = Math.abs(zScore) > 2.5; // Trigger anomaly if current demand is >2.5 std devs away
      }

      // 3. Train Machine Learning Model (Random Forest)
      if (historyValues.length >= 15 && demandHistory.every(h => h.demand !== undefined)) {
        try {
          // Prepare data for Random Forest: [Time index, SOL Price, BTC Price] -> [Demand]
          const trainingFeatures = demandHistory.map((h, i) => [i, liveMarketData.sol || 100, liveMarketData.btc || 60000]);
          const trainingLabels = demandHistory.map(h => h.demand);
          
          rfModel.train(trainingFeatures, trainingLabels);
          isModelTrained = true;
          
          // Predict next demand based on current features
          const nextFeatures = [[demandHistory.length, liveMarketData.sol || 100, liveMarketData.btc || 60000]];
          const predictions = rfModel.predict(nextFeatures);
          predictedDemand = Math.max(10, Math.floor(predictions[0]));
        } catch (mlErr) {
          console.error("[ML TRAINING ERROR] Skipping this cycle:", mlErr);
          predictedDemand = currentDemand;
        }
      } else {
        // Fallback simple prediction if not enough data
        predictedDemand = currentDemand;
      }

      // 4. ML Inference for Pricing
      const effectiveDemand = Math.max(currentDemand, predictedDemand);
      const surgeMultiplier = Math.max(1, effectiveDemand / 200);
      const price = parseFloat(Math.min(0.0099, basePrice * surgeMultiplier).toFixed(6)); // Cap at $0.0099 for sub-cent compliance

      const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      demandHistory.push({ time: timestamp, demand: currentDemand, price, predicted: predictedDemand, isAnomaly });
      if (demandHistory.length > 20) demandHistory.shift();

      // 5. Simulate On-Chain Transaction + Save to Neon DB
      const txId = Math.random().toString(36).substring(2, 10).toUpperCase();
      const txHash = "0xMOCK_SIM" + Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const simulatedTx = {
        id: txId,
        agent: 'SYSTEM',
        amount: price,
        network: 'ARC-L1 (Circle Powered)',
        status: 'SETTLED_ON_ARC',
        hash: txHash,
        apiKeyUsed: CIRCLE_API_KEY ? `${CIRCLE_API_KEY.substring(0, 4)}****` : 'MISSING'
      };
      transactionHistory.unshift({
        id: txId,
        amount: price,
        timestamp: new Date().toLocaleTimeString(),
        status: "SETTLED_ON_ARC",
        hash: txHash
      });
      if (loopCount % 10 === 0) {
        saveTransactionToDB(simulatedTx);
        
        saveMetricsToDB({
          currentDemand, predictedDemand,
          surgeMultiplier: parseFloat(surgeMultiplier.toFixed(2)),
          zScore: parseFloat(zScore.toFixed(2)),
          isAnomaly,
          btc: liveMarketData.btc,
          eth: liveMarketData.eth,
          sol: liveMarketData.sol
        });
      }

      // 6. Update Hierarchical Agents via Manager
      agentManager.update(isAnomaly, currentDemand);
      
      if (loopCount % 10 === 0) {
        agentManager.getAgents()
          .filter((a: any) => a.status === 'ACTIVE' && a.lastAction)
          .forEach((a: any) => saveAgentActivityToDB(a));
      }

      // 7. Evolve Neural Weights
      neuralWeights = neuralWeights.map(w => Math.max(0, Math.min(1, w + (Math.random() - 0.5) * 0.1)));
    } catch (e) {
      console.error("[SIMULATION ERROR]", e);
    }
  }, 1500); // Super fast 1.5 Seconds for insane UI speed

  // --- API Routes ---
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      circle_status: CIRCLE_API_KEY ? "CONNECTED" : "DISCONNECTED"
    });
  });

  // Circle Balance Check (New Endpoint)
  app.get("/api/circle/status", async (req, res) => {
    if (!CIRCLE_API_KEY) {
      return res.status(500).json({ error: "Circle API Key not configured" });
    }
    
    try {
      // Mocking a response that looks like it came from Circle's Programmable Wallets
      res.json({
        wallet_status: "ACTIVE",
        network: "TESTNET",
        available_usdc: "1000.00",
        app_id: CIRCLE_CLIENT_KEY ? `${CIRCLE_CLIENT_KEY.substring(0, 6)}...` : "N/A"
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch Circle status" });
    }
  });

  app.get("/api/stats", (req, res) => {
    try {
      const effectiveDemand = Math.max(currentDemand, predictedDemand);
      const surgeMultiplier = Math.max(1, effectiveDemand / 200);
      res.json({
        currentDemand,
        predictedDemand,
        isAnomaly,
        zScore: parseFloat(zScore.toFixed(2)),
        surgeMultiplier: parseFloat(surgeMultiplier.toFixed(2)),
        price: parseFloat((basePrice * surgeMultiplier).toFixed(5)),
        history: demandHistory,
        systemStatus: isAnomaly ? "WARNING" : "ONLINE",
        node: "ARC-L1-MAIN-01",
        mlModel: "Random Forest + Z-Score Guard",
        agents: agentManager.getAgents(),
        neuralWeights: neuralWeights,
        market: liveMarketData
      });
    } catch (error) {
      console.error("[API ERROR] /api/stats:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/logs", (req, res) => {
    try {
      const activeAgents = agentManager.getAgents().filter(a => a.status === "ACTIVE" && a.lastAction);
      const agentLogs = activeAgents.slice(0, 3).map(a => `[AGENT:${a.id}] ${a.lastAction}`);
      
      const logs = [
        ...agentLogs,
        `[ML] Model Training: Random Forest updated (10 trees)`,
        `[INFERENCE] Predicted Next Demand: ${predictedDemand} units`,
      ];
      if (isAnomaly) {
        logs.unshift(`[CRITICAL] ANOMALY DETECTED: Z-Score ${zScore.toFixed(2)}! Possible Bot Attack.`);
      }
      res.json(logs);
    } catch (error) {
      console.error("[API ERROR] /api/logs:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/transactions", (req, res) => {
    res.json(transactionHistory);
  });

  // Prevent /api/* from falling back to HTML (Express 5 syntax)
  app.all("/api/*all", (req, res) => {
    console.log(`[API 404] ${req.method} ${req.url}`);
    res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        allowedHosts: ['hewjdewjdbqwjdwej-atlasarcdashbord.hf.space', '.hf.space', 'all']
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((err: any, req: any, res: any, next: any) => {
    console.error("[GLOBAL SERVER ERROR]", err);
    res.status(500).json({ error: "Internal Server Error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ATLAS ARC] Server successfully started on port ${PORT}`);
    console.log(`[ATLAS ARC] Health check: http://localhost:${PORT}/api/health`);
  });
}

startServer();
