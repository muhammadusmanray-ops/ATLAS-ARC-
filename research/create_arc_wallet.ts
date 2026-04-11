import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

config();

async function createArcWallet() {
    const { CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET } = process.env;

    if (!CIRCLE_API_KEY || !CIRCLE_ENTITY_SECRET) {
        console.error("❌ ERROR: Missing API Key or Entity Secret.");
        return;
    }

    const client = initiateDeveloperControlledWalletsClient({
        apiKey: CIRCLE_API_KEY,
        entitySecret: CIRCLE_ENTITY_SECRET
    });

    try {
        console.log("⏳ Fetching Wallet Sets...");
        // 1. Get or create a Wallet Set
        const walletSets = await client.getWalletSets({});
        let walletSetId = "";
        
        if (walletSets.data?.walletSets && walletSets.data.walletSets.length > 0) {
            walletSetId = walletSets.data.walletSets[0].id;
            console.log(`✅ Found existing Wallet Set: ${walletSetId}`);
        } else {
            console.log("⏳ Creating new Wallet Set...");
            const newSet = await client.createWalletSet({
                name: "Atlas Arc Agents Set"
            });
            walletSetId = newSet.data?.walletSet?.id || "";
            console.log(`✅ Created Wallet Set: ${walletSetId}`);
        }

        console.log("\n⏳ Creating ARC Testnet Wallet...");
        // 2. Create Wallet on ARC (Try 'ARC-TESTNET' or 'ARC' or 'EVM-ARC-TESTNET', Circle docs may vary. We'll list supported blockchains first if it fails)
        try {
            const newWallet = await client.createWallets({
                accountType: "SCA", // Smart Contract Account
                blockchains: ["EVM_ARC_TESTNET"], // Guessing standard naming, if it fails we check the error
                count: 1,
                walletSetId: walletSetId
            });
            console.log("✅ Wallet Created Successfully!");
            console.log(newWallet.data);
        } catch (walletErr: any) {
            console.error("❌ Failed to create ARC wallet. Trying to fetch supported blockchains...");
            // Let's print out what blockchains are actually available
            const errorMsg = walletErr.response?.data?.message || walletErr.message;
            console.error("API Response:", errorMsg);
        }

    } catch (err: any) {
        console.error("❌ Script Error:", err.response?.data || err.message);
    }
}

createArcWallet();
