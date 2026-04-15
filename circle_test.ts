import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';
config();

async function test() {
    const client = initiateDeveloperControlledWalletsClient({
        apiKey: process.env.CIRCLE_API_KEY || '',
        entitySecret: process.env.CIRCLE_ENTITY_SECRET || ''
    });

    try {
        console.log("Fetching wallet info...");
        const wallet = await client.getWallet({ id: process.env.CIRCLE_WALLET_ID || '' });
        console.log("Wallet Info:", JSON.stringify(wallet.data, null, 2));

        console.log("Attempting a small transfer...");
        const tx = await client.createTransaction({
            idempotencyKey: uuidv4(),
            walletId: process.env.CIRCLE_WALLET_ID || '',
            tokenId: process.env.CIRCLE_TOKEN_ID || "15dc2b5d-0994-58b0-bf8c-3a0501148ee8",
            amounts: ["0.0001"],
            destinationAddress: "0x45d4391526b865c1a6fa435bfec57a6810f0981f",
            feeLevel: "LOW"
        });
        console.log("Transaction Result:", JSON.stringify(tx.data, null, 2));
    } catch (e: any) {
        console.error("TEST FAILED:", e.message);
        if (e.response) console.error("Response Data:", e.response.data);
    }
}

test();
