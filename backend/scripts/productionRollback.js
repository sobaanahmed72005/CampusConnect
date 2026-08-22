/**
 * Automated Production Rollback Utility
 * Usage: node scripts/productionRollback.js [target_backup_filename] --confirm
 */

const { listBackups, verifyBackup, restoreBackup } = require('../services/backupService')
const { query } = require('../config/database')

async function runProductionRollback() {
  const args = process.argv.slice(2)
  const confirmed = args.includes('--confirm')
  let targetFile = args.find(a => !a.startsWith('--'))

  console.log('==================================================')
  console.log('CAMPUSCONNECT PRODUCTION ROLLBACK UTILITY')
  console.log('==================================================')

  if (!targetFile) {
    const backups = await listBackups()
    if (backups.length === 0) {
      console.error('❌ Rollback failed: No backup files available in backup directory.')
      process.exit(1)
    }
    targetFile = backups[0].filename
    console.log(`ℹ️ Automatically selected latest backup: ${targetFile}`)
  }

  console.log(`\nVerifying backup file integrity: ${targetFile}...`)
  const verification = await verifyBackup(targetFile)
  if (!verification.verified) {
    console.error(`❌ Rollback aborted: Target backup is invalid: ${verification.reason}`)
    process.exit(1)
  }

  if (!confirmed) {
    console.warn('\n⚠️ WARNING: Executing rollback will revert database state to target backup snapshot!')
    console.warn('   Re-run command with --confirm flag to execute rollback:')
    console.warn(`   node backend/scripts/productionRollback.js ${targetFile} --confirm\n`)
    process.exit(0)
  }

  console.log('\nExecuting database rollback transaction...')
  try {
    const result = await restoreBackup(targetFile)
    console.log(`✅ DATABASE ROLLBACK COMPLETED: Restored ${result.restoredTables} tables.`)

    // Verify DB connectivity post-rollback
    const dbPing = await query('SELECT 1')
    if (dbPing.rows.length === 0) throw new Error('Post-rollback DB ping failed')
    console.log('✅ Post-rollback database ping OK (SELECT 1).')
    console.log('==================================================')
    console.log('🎉 ROLLBACK SUCCESSFUL')
    console.log('==================================================')
  } catch (err) {
    console.error(`❌ ROLLBACK FAILED: ${err.message}`)
    process.exit(1)
  }
}

if (require.main === module) {
  runProductionRollback()
}

module.exports = { runProductionRollback }
