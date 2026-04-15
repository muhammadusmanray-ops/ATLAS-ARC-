import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';
import crypto from 'crypto';

config();

async function testDirectAPI() {
    console.log("Starting Direct API Test...");

    const apiKey = process.env.CIRCLE_API_KEY || '';
    const walletId = process.env.CIRCLE_WALLET_ID || '';
    const tokenId = process.env.CIRCLE_TOKEN_ID || '15dc2b5d-0994-58b0-bf8c-3a0501148ee8';
    const entitySecret = process.env.CIRCLE_ENTITY_SECRET || '';

    try {
        // Step 1: Get Entity Public Key
        console.log("Fetching Entity Public Key...");
        const pubKeyRes = await axios.get('https://api.circle.com/v1/w3s/config/entity/publicKey', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        const publicKey = pubKeyRes.data.data.publicKey;
        console.log("Public Key retrieved.");

        // Step 2: Encrypt Entity Secret
        // Circle requires RSA-OAEP encryption for the entity secret
        const buffer = Buffer.from(entitySecret, 'hex');
        const encrypted = crypto.publicEncrypt({
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
        }, buffer);
        
        const ciphertext = encrypted.toString('base64');
        console.log("Ciphertext generated successfully.");

        // Step 3: Create Transfer
        console.log("Initiating Real Transfer via REST API...");
        const transferRes = await axios.post('https://api.circle.com/v1/w3s/developer/transactions/transfer', {
            idempotencyKey: uuidv4(),
            entitySecretCiphertext: ciphertext,
            walletId: walletId,
            tokenId: tokenId,
            amounts: ["0.0001"],
            destinationAddress: "0x45d4391526b865c1a6fa435bfec57a6810f0981f",
            feeLevel: "LOW"
        }, {
            headers: { 
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("SUCCESS! Transaction ID:", transferRes.data.data.id);
        console.log("Full Result:", JSON.stringify(transferRes.data.data, null, 2));

    } catch (e: any) {
        console.error("API TEST FAILED!");
        if (e.response) {
            console.error("Status:", e.response.status);
            console.error("Data:", JSON.stringify(e.response.data, null, 2));
        } else {
            console.error("Error:", e.message);
        }
    }
}

testDirectAPI();
