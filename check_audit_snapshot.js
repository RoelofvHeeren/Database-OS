const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAuditSnapshot() {
    try {
        console.log('Fetching most recent AuditResult...');
        const lastRun = await prisma.auditRun.findFirst({
            orderBy: { createdAt: 'desc' },
            include: { auditResult: true }
        });

        if (!lastRun || !lastRun.auditResult) {
            console.log('No audit results found.');
            return;
        }

        console.log(`Audit Run ID: ${lastRun.id}`);
        const snapshot = lastRun.auditResult.snapshotJson;

        console.log('\n--- ALL TABLES IN SNAPSHOT ---');
        // Sort and print all tables
        const tableNames = snapshot.tables.map(t => t.name).sort();
        tableNames.forEach(name => console.log(`- ${name}`));

        console.log(`\nTotal Tables: ${tableNames.length}`);

        // Check for 'agent', 'agents', 'user', 'users' specifically
        const candidates = ['agent', 'agents', 'user', 'users', 'auth_user', 'profiles'];
        console.log('\n--- Checking for Agent/User Candidates ---');
        candidates.forEach(c => {
            const found = tableNames.includes(c);
            console.log(`${c}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

checkAuditSnapshot();
