import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';

config();

async function seedRealTransactions() {
    console.log("🚀 Starting Real Transaction Seeding (Goal: 50)...");

    const apiKey = process.env.CIRCLE_API_KEY || '';
    const walletId = process.env.CIRCLE_WALLET_ID || '';
    const tokenId = process.env.CIRCLE_TOKEN_ID || '15dc2b5d-0994-58b0-bf8c-3a0501148ee8';
    const entitySecret = process.env.CIRCLE_ENTITY_SECRET || '';

    let transactions: any[] = [];

    try {
        // Step 1: Get Entity Public Key (needed once)
        const pubKeyRes = await axios.get('https://api.circle.com/v1/w3s/config/entity/publicKey', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const publicKey = pubKeyRes.data.data.publicKey;

        for (let i = 1; i <= 50; i++) {
            try {
                // Step 2: Encrypt Entity Secret (new ciphertext for each request is safer)
                const buffer = Buffer.from(entitySecret, 'hex');
                const encrypted = crypto.publicEncrypt({
                    key: publicKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                }, buffer);
                const ciphertext = encrypted.toString('base64');

                const amount = (Math.random() * 0.008 + 0.001).toFixed(6);
                const idempKey = uuidv4();

                console.log(`[${i}/50] Sending ${amount} USDC...`);
                
                const res = await axios.post('https://api.circle.com/v1/w3s/developer/transactions/transfer', {
                    idempotencyKey: idempKey,
                    entitySecretCiphertext: ciphertext,
                    walletId: walletId,
                    tokenId: tokenId,
                    amounts: [amount],
                    destinationAddress: "0x45d4391526b865c1a6fa435bfec57a6810f0981f",
                    feeLevel: "LOW"
                }, {
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
                });

                const txData = res.data.data;
                transactions.push({
                    id: txData.id,
                    agent: `EX-${(i % 5) + 1}`,
                    amount: parseFloat(amount),
                    currency: "USDC",
                    status: "SETTLED_ON_ARC",
                    network: "ARC-TESTNET (Circle Powered)",
                    timestamp: new Date().toISOString(),
                    hash: txData.txHash || `0xPENDING_${idempKey.substring(0,8)}`,
                    explorerUrl: `https://testnet.arcscan.app/tx/${txData.txHash || ''}`,
                    isRealCircleTx: true
                });

                // Wait 1 second between requests to be safe with rate limits
                await new Promise(r => setTimeout(r, 1000));

            } catch (err: any) {
                console.error(`❌ Failed transaction ${i}:`, err.response?.data?.message || err.message);
                // If we hit a serious error (like balance), we might want to stop, 
                // but for now, we'll try to get as many as possible.
                if (err.response?.data?.code === 177025) { // Insufficient balance
                    console.log("🛑 Stopping: Insufficient Balance.");
                    break;
                }
            }
        }

        // Save to ledger.json
        fs.writeFileSync('ledger.json', JSON.stringify(transactions, null, 2));
        console.log(`✅ Finished. Seeded ${transactions.length} real transactions into ledger.json`);

    } catch (e: any) {
        console.error("CRITICAL SEEDING ERROR:", e.message);
    }
}

seedRealTransactions();
