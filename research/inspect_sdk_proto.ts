import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { config } from 'dotenv';
config();

async function inspectClient() {
    const client: any = initiateDeveloperControlledWalletsClient({
        apiKey: process.env.CIRCLE_API_KEY || "",
        entitySecret: process.env.CIRCLE_ENTITY_SECRET || ""
    });

    console.log("--- 🕵️ Inspecting SDK Client Prototype ---");
    let proto = Object.getPrototypeOf(client);
    console.log(Object.getOwnPropertyNames(proto).filter(k => k !== 'constructor' && !k.startsWith('_')));
}

inspectClient();
