import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { config } from 'dotenv';
config();

async function findArcTokenId() {
    const { CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET, CIRCLE_WALLET_ID } = process.env;

    const client: any = initiateDeveloperControlledWalletsClient({
        apiKey: CIRCLE_API_KEY,
        entitySecret: CIRCLE_ENTITY_SECRET
    });

    try {
        console.log("⏳ Fetching Transactions for Arc Wallet:", CIRCLE_WALLET_ID);
        // listTransactions should show the faucet incoming funds
        const txs = await client.listTransactions({
            walletIds: [CIRCLE_WALLET_ID]
        });

        console.log("\n📦 Found Transactions:");
        txs.data?.transactions?.forEach((tx: any) => {
            console.log(`- Type: ${tx.transactionType}, Amount: ${tx.amounts}, TokenID: ${tx.tokenId}, Status: ${tx.state}`);
        });

        const latestTx = txs.data?.transactions?.[0];
        if (latestTx && latestTx.tokenId) {
            console.log("\n🎯 ARC USDC Token ID Detected:", latestTx.tokenId);
        }

    } catch (err: any) {
        console.error("❌ Error:", err.response?.data || err.message);
    }
}

findArcTokenId();
