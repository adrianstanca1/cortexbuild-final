
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';
import { analyzeProjectDocument } from '../services/aiService.js';
import { logger } from '../utils/logger.js';
import { getDb } from '../database.js';
import { requireModule } from '../middleware/moduleMiddleware.js';
import { CompanyModule } from '../types/modules.js';

const router = express.Router();

// Apply AI_TOOLS module check to all AI routes
router.use(requireModule(CompanyModule.AI_TOOLS));

// Configure Multer for memory storage (file buffer)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

const apiKey = process.env.GEMINI_API_KEY;

router.post('/chat', async (req: any, res: any) => {
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
    }

    try {
        const { history, newMessage, imageData, mimeType, config, projectId, contextType } = req.body;
        const genAI = new GoogleGenerativeAI(apiKey);

        // --- Context Injection ---
        let injectedContext = "";
        if (projectId) {
            try {
                const db = getDb();
                const project = await db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
                if (project) {
                    injectedContext += `Current Project Context: ${project.name} (${project.code}). Location: ${project.location}. Description: ${project.description}. Status: ${project.status}. Progress: ${project.progress}%. \n`;

                    if (contextType === 'safety') {
                        const incidents = await db.all('SELECT * FROM safety_incidents WHERE projectId = ? ORDER BY date DESC LIMIT 5', [projectId]);
                        injectedContext += `Recent Safety Incidents: ${JSON.stringify(incidents)}\n`;
                    } else if (contextType === 'finance') {
                        injectedContext += `Budget: $${project.budget}. Spent: $${project.spent}.\n`;
                    } else if (contextType === 'rfis') {
                        const rfis = await db.all('SELECT * FROM rfis WHERE projectId = ? ORDER BY createdAt DESC LIMIT 5', [projectId]);
                        injectedContext += `Recent RFIs: ${JSON.stringify(rfis)}\n`;
                    }
                }
            } catch (err) {
                logger.error('Failed to inject AI context:', err);
            }
        }

        // Default model
        const modelName = config?.model || "gemini-2.0-flash-exp";

        // System instruction
        const baseInstruction = config?.systemInstruction || "You are a helpful assistant for the BuildPro construction platform.";
        const finalSystemInstruction = injectedContext
            ? `${baseInstruction}\n\nREAL-TIME PROJECT CONTEXT:\n${injectedContext}\n\nUse this data to answer accurately.`
            : baseInstruction;

        const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: finalSystemInstruction
        });

        const chat = model.startChat({
            history: (history || []).map((h: any) => ({
                role: h.role === 'user' ? 'user' : 'model',
                parts: [{ text: h.content || h.parts?.[0]?.text || '' }]
            })),
        });

        const parts: any[] = [];
        if (newMessage && newMessage.trim()) {
            parts.push({ text: newMessage });
        }
        if (imageData) {
            parts.push({ inlineData: { mimeType: mimeType || 'image/jpeg', data: imageData } });
        }

        const result = await chat.sendMessageStream(parts);

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
                res.write(chunkText);
            }
        }
        res.end();

    } catch (error: any) {
        console.error('AI Chat Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || 'Internal AI Error' });
        } else {
            res.end();
        }
    }
});

router.post('/image', async (req: any, res: any) => {
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

    try {
        const { prompt, aspectRatio, config } = req.body;
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const response = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{ text: prompt }],
            }]
        });

        // Extract image (Gemini 1.5/2.0 returns text by default unless multimodal)
        // Adjusting expectation for image generation if supported via specific parts
        let imageUri = null;
        if (response) {
            const parts = response.response.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
                if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                    imageUri = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }

        res.json({ imageUri });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// New Endpoint for Phase Analysis
router.post('/analyze-phase', upload.single('file'), async (req: any, res: any) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { name, type } = req.body;
        const projectContext = { name, type };

        const result = await analyzeProjectDocument(
            req.file.buffer,
            req.file.mimetype,
            projectContext
        );

        res.json(result);
    } catch (error: any) {
        logger.error("Analyze Phase Error:", error);
        res.status(500).json({ error: error.message || "Failed to analyze document" });
    }
});

import * as aiController from '../controllers/aiController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { contextMiddleware } from '../middleware/contextMiddleware.js';

// ... existing endpoints ...

// --- Persistence Endpoints ---
router.get('/assets', authenticateToken, contextMiddleware, aiController.getAIAssets);
router.post('/assets', authenticateToken, contextMiddleware, aiController.saveAIAsset);
router.delete('/assets/:id', authenticateToken, contextMiddleware, aiController.deleteAIAsset);

export default router;

