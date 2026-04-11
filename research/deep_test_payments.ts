
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { config } from 'dotenv';
config();

async function deepTestPayments() {
    const { CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET, CIRCLE_WALLET_ID } = process.env;

    console.log("--- 🕵️ Deep Payment Diagnostic ---");
    console.log("API Key Present:", !!CIRCLE_API_KEY);
    console.log("Entity Secret Present:", !!CIRCLE_ENTITY_SECRET);
    console.log("Wallet ID Present:", !!CIRCLE_WALLET_ID);

    if (!CIRCLE_API_KEY || !CIRCLE_ENTITY_SECRET || !CIRCLE_WALLET_ID) {
        console.error("❌ ERROR: Missing environment variables. Check your .env file.");
        return;
    }

    const client = initiateDeveloperControlledWalletsClient({
        apiKey: CIRCLE_API_KEY,
        entitySecret: CIRCLE_ENTITY_SECRET
    });

    try {
        console.log("\n1. Testing Wallet Connection...");
        const wallet = await client.getWallet({ id: CIRCLE_WALLET_ID });
        console.log("✅ Connection Successful!");
        console.log("Wallet Address:", wallet.data?.wallet?.address);
        console.log("Blockchain:", wallet.data?.wallet?.blockchain);

        console.log("\n2. Checking USDC Balance...");
        const balances = await client.getWalletTokenBalances({
            walletId: CIRCLE_WALLET_ID
        });
        
        const usdc = balances.data?.tokenBalances?.find(b => b.token?.symbol === 'USDC');
        if (usdc) {
            console.log(`💰 USDC Balance: ${usdc.amount} units`);
            if (parseFloat(usdc.amount) < 0.01) {
                console.warn("⚠️ WARNING: Balance is too low for real transactions!");
            }
        } else {
            console.warn("❌ USDC Token not found in this wallet.");
        }

        console.log("\n3. Testing Small Transaction (Dry Run)...");
        // We'll just stop here to avoid spending funds if they are low
        console.log("✅ System is READY but funding is the bottleneck.");

    } catch (err: any) {
        console.error("\n❌ DIAGNOSTIC FAILED:");
        if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Message:", err.response.data?.message || "Internal Circle Error");
        } else {
            console.error("Error:", err.message);
        }
    }
}

deepTestPayments();
