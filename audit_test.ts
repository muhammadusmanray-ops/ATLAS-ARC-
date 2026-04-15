import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:3001';
const TEST_ITERATIONS = 5;

async function runLiveAudit() {
    console.log("🚀 Starting Live Audit for Agentic Economy...");
    console.log("-------------------------------------------");

    try {
        const health = await axios.get(`${BASE_URL}/api/health`);
        console.log(`📡 Server Connectivity: ${health.data.status === 'ok' ? 'ONLINE' : 'ERROR'}`);
    } catch (e: any) {
        console.log("❌ CRITICAL: Server is unreachable! Check if port 3001 is open.");
        return;
    }

    for (let i = 1; i <= TEST_ITERATIONS; i++) {
        console.log(`\n🔍 Test Run #${i}: Requesting Protected Data...`);
        
        try {
            // Step 1: Request data without payment proof (POST to /api/secure-data)
            await axios.post(`${BASE_URL}/api/secure-data`, {});
            
        } catch (error: any) {
            if (error.response && error.response.status === 402) {
                console.log("✅ PASS: Server returned HTTP 402 (Payment Required).");
                console.log(`💰 Required Amount: ${error.response.data.amount} USDC`);
                
                const invoiceId = error.response.data.invoiceId;
                
                // Step 2: Triggering Automated Payment
                console.log("💸 Agent is executing payment via Circle/Arc...");
                try {
                    const payResponse = await axios.post(`${BASE_URL}/api/pay`, {
                        invoiceId: invoiceId,
                        agentId: "Audit_Agent_007"
                    });
                    
                    if (payResponse.data.success) {
                        console.log("✅ PASS: Payment Successful!");
                        console.log(`🔗 Arc TX Hash: ${payResponse.data.txHash}`);
                    }
                } catch (payError: any) {
                    console.log(`❌ FAIL: Payment execution failed. Reason: ${payError.response?.data?.error || payError.message}`);
                }

            } else {
                console.log(`❌ FAIL: Expected 402 but got ${error.response?.status || error.message}`);
            }
        }
    }

    // Step 3: Check Ledger Integrity
    console.log("\n-------------------------------------------");
    console.log("📊 Checking Ledger Integrity...");
    try {
        const statsRes = await axios.get(`${BASE_URL}/api/stats`);
        const transactionsRes = await axios.get(`${BASE_URL}/api/transactions`);
        const economicRes = await axios.get(`${BASE_URL}/api/economic-summary`);
        
        console.log(`✅ Total Transactions in Ledger: ${transactionsRes.data.length}`);
        console.log(`✅ Total Gas Saved: $${economicRes.data.total_gas_saved_usd}`);
    } catch (e: any) {
        console.log("❌ FAIL: Could not fetch stats from ledger.", e.message);
    }
}

runLiveAudit();
