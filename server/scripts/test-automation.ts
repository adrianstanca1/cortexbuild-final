
import 'dotenv/config';
import { getDb, ensureDbInitialized } from '../database.js';
import { WorkflowService } from '../services/workflowService.js';
import { v4 as uuidv4 } from 'uuid';

async function testAutomation() {
    console.log('--- Starting Automation Verification ---');
    await ensureDbInitialized();
    const db = getDb();
    const companyId = 'c1';
    const taskId = 't1';

    // 1. Create a test automation
    console.log('1. Creating test automation rule...');
    const automationData = {
        name: 'Test Task Completed Notification',
        triggerType: 'task_completed',
        actionType: 'send_notification',
        configuration: {
            title: 'Task Completed Automation',
            message: 'The task has been successfully completed and triggered this notification.',
            type: 'success'
        },
        enabled: 1
    };

    const automation = await WorkflowService.createAutomation(companyId, automationData);
    console.log(`✅ Created automation: ${automation.id}`);

    // 2. Clear existing notifications for this test to be sure
    await db.run('DELETE FROM notifications WHERE companyId = ? AND title = ?', [companyId, 'Task Completed Automation']);

    // 3. Trigger completion
    console.log(`2. Updating task ${taskId} to 'completed'...`);
    await db.run(
        'UPDATE tasks SET status = ?, updatedAt = ? WHERE id = ? AND companyId = ?',
        ['completed', new Date().toISOString(), taskId, companyId]
    );

    // 4. Manually trigger WorkflowService (mimicking taskController.ts logic)
    // In a real environment, the controller would call this.
    // Since we are running as a script, we call it directly.
    const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ? AND companyId = ?', [taskId, companyId]);
    await WorkflowService.trigger(companyId, 'task_completed', { taskId, task: updatedTask });

    // 5. Verify notification
    console.log('3. Verifying resulting notification...');
    const notification = await db.get(
        'SELECT * FROM notifications WHERE companyId = ? AND title = ? ORDER BY createdAt DESC LIMIT 1',
        [companyId, 'Task Completed Automation']
    );

    if (notification) {
        console.log('✅ Success! Notification found:');
        console.log(`   ID: ${notification.id}`);
        console.log(`   Message: ${notification.message}`);
    } else {
        console.error('❌ Failed! No notification generated for automation.');
    }

    // 6. Cleanup (optional, but good for repeatability)
    await WorkflowService.deleteAutomation(companyId, automation.id);
    console.log('--- Verification Finished ---');
    process.exit(notification ? 0 : 1);
}

testAutomation().catch(err => {
    console.error('❌ Error during test:', err);
    process.exit(1);
});
