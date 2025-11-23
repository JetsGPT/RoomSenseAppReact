const https = require('https');

const agent = new https.Agent({
    rejectUnauthorized: false
});

const get = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, { agent }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
};

async function run() {
    try {
        console.log('Fetching boxes...');
        const boxes = await get('https://localhost:8081/api/sensors/boxes');
        console.log('Boxes:', boxes);

        if (boxes.length > 0) {
            const box = boxes[0];
            console.log(`Fetching limit=1 for box ${box}...`);
            const data = await get(`https://localhost:8081/api/sensors/data/box/${box}?limit=1&sort=desc`);
            console.log('Data:', JSON.stringify(data, null, 2));

            console.log(`Fetching limit=5 for box ${box}...`);
            const data5 = await get(`https://localhost:8081/api/sensors/data/box/${box}?limit=5&sort=desc`);
            console.log('Data (limit 5):', JSON.stringify(data5, null, 2));
        }
    } catch (e) {
        console.error(e);
    }
}

run();
