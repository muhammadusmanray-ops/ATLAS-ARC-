import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { config } from 'dotenv';

config();

async function createArcWallet() {
    const { CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET } = process.env;

    if (!CIRCLE_API_KEY || !CIRCLE_ENTITY_SECRET) {
        console.error("❌ ERROR: Missing API Key or Entity Secret in .env");
        return;
    }

    const client = initiateDeveloperControlledWalletsClient({
        apiKey: CIRCLE_API_KEY,
        entitySecret: CIRCLE_ENTITY_SECRET
    });

    try {
        console.log("⏳ Fetching Wallet Sets...");
        // Correct method name is listWalletSets
        const walletSets = await client.listWalletSets({});
        let walletSetId = "";
        
        if (walletSets.data?.walletSets && walletSets.data.walletSets.length > 0) {
            walletSetId = walletSets.data.walletSets[0].id;
            console.log(`✅ Using existing Wallet Set: ${walletSetId}`);
        } else {
            console.log("⏳ Creating new Wallet Set...");
            const newSet = await client.createWalletSet({
                name: "Atlas Arc Final Set"
            });
            walletSetId = newSet.data?.walletSet?.id || "";
            console.log(`✅ Created Wallet Set: ${walletSetId}`);
        }

        console.log("\n⏳ Creating ARC Testnet Wallet...");
        // The blockchain identifier for Arc in Circle SDK
        const newWallet = await client.createWallets({
            accountType: "SCA", 
            blockchains: ["ARC-TESTNET"], 
            count: 1,
            walletSetId: walletSetId
        });
        
        console.log("\n🎉 SUCCESS! ARC Wallet Created:");
        console.log("Wallet ID:", newWallet.data?.wallets?.[0]?.id);
        console.log("Address:", newWallet.data?.wallets?.[0]?.address);
        console.log("\nCopy these and paste them in your .env file!");

    } catch (err: any) {
        const errorMsg = err.response?.data?.message || err.message;
        console.error("\n❌ FAILED to create ARC wallet:");
        console.error("Error Detail:", errorMsg);
        console.log("\nTip: If 'EVM-ARC-TESTNET' is not recognized, check Circle's supported networks page.");
    }
}

createArcWallet();
