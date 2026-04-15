const https = require('https');
const fs = require('fs');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Removed hardcoded token for security
const REPO = 'muhammadusmanray-ops/ATLAS-ARC-';
const BRANCH = 'main';

const filesToUpload = [
    { path: 'src/App.tsx', content: fs.readFileSync('src/App.tsx', 'utf8') },
    { path: 'server.ts', content: fs.readFileSync('server.ts', 'utf8') },
];

async function fetchGithub(method, endpoint, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${REPO}${endpoint}`,
            method: method,
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'User-Agent': 'NodeJS',
                'Accept': 'application/vnd.github.v3+json',
            }
        };
        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    resolve(data);
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function uploadToGithub() {
    console.log('[1/5] Getting latest commit...');
    const ref = await fetchGithub('GET', `/git/refs/heads/${BRANCH}`);
    if (ref.message) throw new Error(ref.message);
    const commitSha = ref.object.sha;

    console.log('[2/5] Getting base tree...');
    const commit = await fetchGithub('GET', `/git/commits/${commitSha}`);
    const treeSha = commit.tree.sha;

    console.log('[3/5] Creating new tree with updated files...');
    const tree = filesToUpload.map(f => ({
        path: f.path,
        mode: '100644',
        type: 'blob',
        content: f.content
    }));
    
    const newTree = await fetchGithub('POST', '/git/trees', { base_tree: treeSha, tree });
    
    console.log('[4/5] Creating commit...');
    const newCommit = await fetchGithub('POST', '/git/commits', {
        message: 'Fix scout agent strings and remove mock pending payment msg',
        tree: newTree.sha,
        parents: [commitSha]
    });

    console.log('[5/5] Updating branch reference...');
    await fetchGithub('PATCH', `/git/refs/heads/${BRANCH}`, { sha: newCommit.sha });
    
    console.log('✅ Changes successfully pushed to GitHub!');
}

uploadToGithub().catch(console.error);
