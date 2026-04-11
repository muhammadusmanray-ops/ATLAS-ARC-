import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { config } from 'dotenv';
config();

async function findArcTokenId() {
    const { CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET, CIRCLE_WALLET_ID } = process.env;

    const client = initiateDeveloperControlledWalletsClient({
        apiKey: CIRCLE_API_KEY,
        entitySecret: CIRCLE_ENTITY_SECRET
    });

    try {
        console.log("⏳ Fetching Balances for Arc Wallet:", CIRCLE_WALLET_ID);
        // Using the standard method for v10+
        const balances = await client.getWalletTokenBalances({
            walletId: CIRCLE_WALLET_ID
        });

        const tokenList = balances.data?.tokenBalances || [];
        console.log("\n💰 Found Tokens on Arc:");
        tokenList.forEach(t => {
            console.log(`- Symbol: ${t.token?.symbol}, Amount: ${t.amount}, TokenID: ${t.token?.id}`);
        });

    } catch (err: any) {
        console.error("❌ Error:", err.response?.data || err.message);
    }
}

findArcTokenId();
