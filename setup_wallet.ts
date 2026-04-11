import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { config } from "dotenv";

config();

const circleClient = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY || '',
  entitySecret: process.env.CIRCLE_ENTITY_SECRET || ''
});

async function main() {
  try {
    console.log("Creating Wallet Set...");
    const walletSetResp = await circleClient.createWalletSet({
      name: "Atlas Arc Wallet Set"
    });
    
    const walletSetId = walletSetResp.data?.walletSet?.id;
    console.log("Wallet Set ID:", walletSetId);

    console.log("Creating Wallet...");
    const walletResp = await circleClient.createWallets({
      blockchains: ["ETH-SEPOLIA"],
      count: 1,
      walletSetId: walletSetId,
      accountType: "EOA"
    });

    console.log("Wallet Created Successfully!");
    console.log(JSON.stringify(walletResp.data, null, 2));
    
  } catch (error: any) {
    console.error("Error creating wallet!");
    if (error?.response?.data) {
        console.error(JSON.stringify(error.response.data, null, 2));
    } else {
        console.error(error);
    }
  }
}

main();
