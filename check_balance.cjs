require('dotenv').config();
const { initiateDeveloperControlledWalletsClient } = require('@circle-fin/developer-controlled-wallets');

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET
});

async function run() {
  try {
    const result = await client.getWalletTokenBalance({ id: process.env.CIRCLE_WALLET_ID });
    console.log(JSON.stringify(result.data, null, 2));
  } catch (e) {
    console.error(e.response?.data || e);
  }
}
run();
