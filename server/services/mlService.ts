import { getDb } from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import { MLModel, MLPrediction } from '../types.js';

export class MLService {
    static async getModels(companyId: string): Promise<MLModel[]> {
        const db = getDb();
        return db.all('SELECT * FROM ml_models WHERE companyId = ?', [companyId]);
    }

    static async getPredictions(companyId: string, modelId?: string): Promise<MLPrediction[]> {
        const db = getDb();
        let query = 'SELECT * FROM ml_predictions WHERE companyId = ?';
        const params: any[] = [companyId];

        if (modelId) {
            query += ' AND modelId = ?';
            params.push(modelId);
        }

        query += ' ORDER BY createdAt DESC LIMIT 50';
        return db.all(query, params);
    }

    static async trainModel(companyId: string, modelId: string): Promise<MLModel> {
        const db = getDb();
        const model = await db.get('SELECT * FROM ml_models WHERE id = ? AND companyId = ?', [modelId, companyId]);
        if (!model) throw new Error('Model not found');

        // Simulate training
        const updatedAccuracy = Math.min(99.9, model.accuracy + Math.random() * 2);
        const updatedSamples = model.trainedSamples + Math.floor(Math.random() * 500);
        const updatedVersion = (parseFloat(model.version) + 0.1).toFixed(1);
        const now = new Date();
        const nowIso = now.toISOString();

        await db.run(
            `UPDATE ml_models SET 
                accuracy = ?, 
                trainedSamples = ?, 
                version = ?, 
                lastTrained = ?, 
                status = 'deployed', 
                updatedAt = ? 
             WHERE id = ?`,
            [updatedAccuracy, updatedSamples, updatedVersion, nowIso.split('T')[0], nowIso, modelId]
        );

        return {
            ...model,
            accuracy: updatedAccuracy,
            trainedSamples: updatedSamples,
            version: updatedVersion,
            lastTrained: nowIso.split('T')[0],
            status: 'deployed',
            updatedAt: nowIso
        };
    }

    static async savePrediction(companyId: string, prediction: Omit<MLPrediction, 'id' | 'companyId'>): Promise<MLPrediction> {
        const db = getDb();
        const id = uuidv4();
        await db.run(
            `INSERT INTO ml_predictions (id, companyId, modelId, createdAt, input, output, confidence, actualValue)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, companyId, prediction.modelId, prediction.timestamp || new Date().toISOString(), prediction.input, prediction.output, prediction.confidence, prediction.actualValue]
        );
        return { ...prediction, id, companyId } as MLPrediction;
    }

    static async seedInitialModels(companyId: string) {
        const db = getDb();
        const existing = await db.get('SELECT id FROM ml_models WHERE companyId = ? LIMIT 1', [companyId]);
        if (existing) return;

        const now = new Date().toISOString();
        const models = [
            { id: 'm1', name: 'Budget Forecasting', type: 'regression', accuracy: 92.4, trainedSamples: 1250, lastTrained: '2025-11-18', status: 'deployed', version: '2.3.1' },
            { id: 'm2', name: 'Risk Detection', type: 'classification', accuracy: 88.7, trainedSamples: 856, lastTrained: '2025-11-15', status: 'deployed', version: '1.8.0' },
            { id: 'm3', name: 'Schedule Anomaly', type: 'anomaly', accuracy: 85.3, trainedSamples: 642, lastTrained: '2025-11-10', status: 'idle', version: '1.5.2' },
            { id: 'm4', name: 'Resource Demand', type: 'forecast', accuracy: 91.2, trainedSamples: 1100, lastTrained: '2025-11-17', status: 'deployed', version: '3.1.0' },
        ];

        for (const m of models) {
            await db.run(
                `INSERT INTO ml_models (id, companyId, name, type, accuracy, trainedSamples, lastTrained, status, version, createdAt, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [m.id, companyId, m.name, m.type, m.accuracy, m.trainedSamples, m.lastTrained, m.status, m.version, now, now]
            );
        }
    }
}
