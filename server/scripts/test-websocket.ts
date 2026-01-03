
import WebSocket from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const PORT = process.env.PORT || 8080;
const WS_URL = `ws://localhost:${PORT}/api/live`;

async function testWebSocket() {
    console.log(`Connecting to WebSocket at ${WS_URL}...`);

    // Note: We need a valid JWT token with companyId for testing broadcasting.
    // For this test, we'll try to connect without a token first to see if it establishes.
    const ws = new WebSocket(WS_URL);

    ws.on('open', () => {
        console.log('✅ Connected to WebSocket');

        // Join a project
        const joinPayload = {
            type: 'join_project',
            projectId: 'p1',
            userId: 'u1'
        };
        console.log('Sending join_project:', joinPayload);
        ws.send(JSON.stringify(joinPayload));

        // Send a ping
        setTimeout(() => {
            console.log('Sending presence_ping...');
            ws.send(JSON.stringify({ type: 'presence_ping' }));
        }, 1000);

        // Close after 5 seconds
        setTimeout(() => {
            console.log('Closing connection...');
            ws.close();
            process.exit(0);
        }, 5000);
    });

    ws.on('message', (data) => {
        console.log('📩 Received message:', data.toString());
    });

    ws.on('error', (err) => {
        console.error('❌ WebSocket error:', err.message);
        process.exit(1);
    });

    ws.on('close', () => {
        console.log('Disconnected from WebSocket');
    });
}

testWebSocket();
