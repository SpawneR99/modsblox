const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const ADBLUEMEDIA_CONFIG = {
    endpoint: 'https://d1y3y09sav47f5.cloudfront.net/public/offers/feed.php',
    apiKey: 'aae3663b2d691169b7643a13f62685f5',
    userId: '47937'
};

app.use(express.static(__dirname));
app.use(express.json());

app.get('/api/offers', async (req, res) => {
    try {
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                        req.headers['x-real-ip'] ||
                        req.connection?.remoteAddress ||
                        req.socket?.remoteAddress || '';
        
        let cleanIp = clientIp.replace('::ffff:', '').replace('::1', '').replace('127.0.0.1', '');
        const userAgent = req.headers['user-agent'] || '';
        const niche = req.query.niche || 'ModsBlox';
        const maxOffers = req.query.max || '6';
        
        const params = new URLSearchParams({
            user_id: ADBLUEMEDIA_CONFIG.userId,
            api_key: ADBLUEMEDIA_CONFIG.apiKey,
            s1: niche
        });
        
        if (cleanIp) params.append('ip', cleanIp);
        if (userAgent) params.append('user_agent', userAgent);
        
        const apiUrl = `${ADBLUEMEDIA_CONFIG.endpoint}?${params.toString()}`;
        console.log(`Fetching offers for: ${niche} | IP: ${cleanIp || 'auto'}`);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const offers = await response.json();
        
        if (Array.isArray(offers) && offers.length > 0) {
            const limitedOffers = offers.slice(0, parseInt(maxOffers));
            console.log(`Loaded ${limitedOffers.length} offers for ${niche}`);
            res.json({ success: true, offers: limitedOffers });
        } else {
            res.json({ success: false, error: 'No offers available', offers: [] });
        }
    } catch (error) {
        console.error('Offers API Error:', error.message);
        res.json({ success: false, error: error.message, offers: [] });
    }
});

app.get('/favicon.ico', (req, res) => {
    res.redirect('https://i.ibb.co/BHqnZKw4/151c1ec5-4c46-4845-aaff-393daf130f43.png');
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
    console.log(`ModsBlox Server running at http://${HOST}:${PORT}`);
    console.log(`Serving files from: ${__dirname}`);
    console.log(`AdBlueMedia API proxy ready at /api/offers`);
});
