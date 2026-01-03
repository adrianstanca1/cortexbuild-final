import { getDb } from '../database.js';

/**
 * AnalyticsBucket - Tenant-scoped analytics and metrics
 * Time-series data partitioned by tenant and time
 */

export interface MetricData {
    tenantId: string;
    metricName: string;
    value: number;
    timestamp: string;
    dimensions?: Record<string, string>;
}

export interface AggregationOptions {
    startDate: string;
    endDate: string;
    groupBy?: 'hour' | 'day' | 'week' | 'month';
    dimensions?: string[];
}

export class AnalyticsBucket {
    private metricsTable: string = 'metrics';

    /**
     * Record a metric
     */
    async recordMetric(
        tenantId: string,
        metricName: string,
        value: number,
        dimensions?: Record<string, string>
    ): Promise<void> {
        const db = getDb();

        const metric: MetricData = {
            tenantId,
            metricName,
            value,
            timestamp: new Date().toISOString(),
            dimensions,
        };

        // In production, this would write to a time-series database
        // For now, we'll use a simple table structure
        await db.run(
            `INSERT INTO ${this.metricsTable} (tenant_id, metric_name, value, timestamp, dimensions)
       VALUES (?, ?, ?, ?, ?)`,
            [
                metric.tenantId,
                metric.metricName,
                metric.value,
                metric.timestamp,
                JSON.stringify(metric.dimensions || {}),
            ]
        );
    }

    /**
     * Query metrics for tenant
     */
    async queryMetrics(
        tenantId: string,
        metricName: string,
        options: AggregationOptions
    ): Promise<any[]> {
        const db = getDb();

        let groupByClause = '';
        let selectClause = 'timestamp, value';

        if (options.groupBy) {
            switch (options.groupBy) {
                case 'hour':
                    groupByClause = "GROUP BY strftime('%Y-%m-%d %H:00:00', timestamp)";
                    selectClause = "strftime('%Y-%m-%d %H:00:00', timestamp) as period, AVG(value) as value";
                    break;
                case 'day':
                    groupByClause = "GROUP BY strftime('%Y-%m-%d', timestamp)";
                    selectClause = "strftime('%Y-%m-%d', timestamp) as period, AVG(value) as value";
                    break;
                case 'week':
                    groupByClause = "GROUP BY strftime('%Y-%W', timestamp)";
                    selectClause = "strftime('%Y-%W', timestamp) as period, AVG(value) as value";
                    break;
                case 'month':
                    groupByClause = "GROUP BY strftime('%Y-%m', timestamp)";
                    selectClause = "strftime('%Y-%m', timestamp) as period, AVG(value) as value";
                    break;
            }
        }

        const query = `
      SELECT ${selectClause}
      FROM ${this.metricsTable}
      WHERE tenant_id = ?
        AND metric_name = ?
        AND timestamp >= ?
        AND timestamp <= ?
      ${groupByClause}
      ORDER BY timestamp ASC
    `;

        return db.all(query, [
            tenantId,
            metricName,
            options.startDate,
            options.endDate,
        ]);
    }

    /**
     * Get aggregated metrics
     */
    async getAggregatedMetrics(
        tenantId: string,
        metricNames: string[],
        options: AggregationOptions
    ): Promise<Record<string, any>> {
        const results: Record<string, any> = {};

        for (const metricName of metricNames) {
            results[metricName] = await this.queryMetrics(tenantId, metricName, options);
        }

        return results;
    }

    /**
     * Get current metric value
     */
    async getCurrentValue(
        tenantId: string,
        metricName: string
    ): Promise<number | null> {
        const db = getDb();

        const result = await db.get<{ value: number }>(
            `SELECT value
       FROM ${this.metricsTable}
       WHERE tenant_id = ? AND metric_name = ?
       ORDER BY timestamp DESC
       LIMIT 1`,
            [tenantId, metricName]
        );

        return result?.value || null;
    }

    /**
     * Calculate metric statistics
     */
    async getStatistics(
        tenantId: string,
        metricName: string,
        options: AggregationOptions
    ): Promise<{
        min: number;
        max: number;
        avg: number;
        sum: number;
        count: number;
    }> {
        const db = getDb();

        const result = await db.get<any>(
            `SELECT
         MIN(value) as min,
         MAX(value) as max,
         AVG(value) as avg,
         SUM(value) as sum,
         COUNT(*) as count
       FROM ${this.metricsTable}
       WHERE tenant_id = ?
         AND metric_name = ?
         AND timestamp >= ?
         AND timestamp <= ?`,
            [tenantId, metricName, options.startDate, options.endDate]
        );

        return {
            min: result?.min || 0,
            max: result?.max || 0,
            avg: result?.avg || 0,
            sum: result?.sum || 0,
            count: result?.count || 0,
        };
    }

    /**
     * Delete old metrics (data retention)
     */
    async deleteOldMetrics(
        tenantId: string,
        olderThan: string
    ): Promise<number> {
        const db = getDb();

        const result = await db.run(
            `DELETE FROM ${this.metricsTable}
       WHERE tenant_id = ? AND timestamp < ?`,
            [tenantId, olderThan]
        );

        return result.changes || 0;
    }

    /**
     * Common metrics helpers
     */
    async recordUserActivity(tenantId: string, userId: string): Promise<void> {
        await this.recordMetric(tenantId, 'user_activity', 1, { userId });
    }

    async recordProjectCreation(tenantId: string, projectId: string): Promise<void> {
        await this.recordMetric(tenantId, 'project_created', 1, { projectId });
    }

    async recordTaskCompletion(tenantId: string, taskId: string): Promise<void> {
        await this.recordMetric(tenantId, 'task_completed', 1, { taskId });
    }

    async recordFileUpload(tenantId: string, fileSize: number): Promise<void> {
        await this.recordMetric(tenantId, 'file_uploaded', fileSize);
    }

    async recordApiCall(tenantId: string, endpoint: string): Promise<void> {
        await this.recordMetric(tenantId, 'api_call', 1, { endpoint });
    }
}

// Singleton instance
export const analyticsBucket = new AnalyticsBucket();
