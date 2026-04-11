import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { config } from 'dotenv';
config();

async function inspectClient() {
    const client = initiateDeveloperControlledWalletsClient({
        apiKey: process.env.CIRCLE_API_KEY || "",
        entitySecret: process.env.CIRCLE_ENTITY_SECRET || ""
    });

    console.log("--- 🕵️ Inspecting SDK Client ---");
    console.log(Object.keys(client).filter(k => !k.startsWith('_')));
}

inspectClient();
