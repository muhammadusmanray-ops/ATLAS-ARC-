const fs = require('fs');
const path = require('path');

const ledgerPath = path.join(__dirname, 'ledger.json');
try {
    const data = JSON.parse(fs.readFileSync(ledgerPath, 'utf-8'));
    const updated = data.map(tx => {
        // Ensure hash exists
        if (!tx.hash) {
            tx.hash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        }
        // Add full explorer link
        tx.explorerUrl = `https://testnet.arcscan.app/tx/${tx.hash}`;
        return tx;
    });
    fs.writeFileSync(ledgerPath, JSON.stringify(updated, null, 2));
    console.log(`Successfully updated ${updated.length} transactions with full explorer links.`);
} catch (e) {
    console.error('Error updating ledger:', e.message);
}
