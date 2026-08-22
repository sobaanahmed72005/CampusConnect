/**
 * Disaster Recovery Database Restoration CLI Utility
 * Usage: node scripts/restoreBackup.js <backup_filename> --confirm
 */

const { verifyBackup, restoreBackup, listBackups } = require('../services/backupService')

async function runCliRestore() {
  const args = process.argv.slice(2)
  const filename = args[0]
  const confirmed = args.includes('--confirm')

  console.log('==================================================')
  console.log('CAMPUSCONNECT DISASTER RECOVERY RESTORE UTILITY')
  console.log('==================================================')

  if (!filename) {
    console.log('\nAvailable Backups:')
    const backups = await listBackups()
    if (backups.length === 0) {
      console.log('  No backup files found in backup directory.')
    } else {
      backups.forEach(b => {
        console.log(`  - ${b.filename} (${(b.sizeBytes / 1024).toFixed(1)} KB, created: ${b.createdAt})`)
      })
    }
    console.log('\nUsage: node scripts/restoreBackup.js <filename> --confirm\n')
    process.exit(0)
  }

  console.log(`\nVerifying backup file integrity: ${filename}...`)
  const verification = await verifyBackup(filename)

  if (!verification.verified) {
    console.error(`❌ Verification Failed: ${verification.reason}`)
    process.exit(1)
  }

  console.log('✅ Backup File Integrity Verified:')
  console.log(`   - Total Tables: ${verification.totalTables}`)
  console.log(`   - Total Records: ${verification.totalRecords}`)
  console.log(`   - Checksum: ${verification.checksum.slice(0, 16)}...`)

  if (!confirmed) {
    console.warn('\n⚠️ CAUTION: Restoring will overwrite existing records in target database!')
    console.warn('   To execute restoration, re-run command with --confirm flag:')
    console.warn(`   node scripts/restoreBackup.js ${filename} --confirm\n`)
    process.exit(0)
  }

  console.log('\nStarting database restoration transaction...')
  try {
    const result = await restoreBackup(filename)
    console.log(`✅ RESTORATION SUCCESSFUL: Restored ${result.restoredTables} tables.`)
    process.exit(0)
  } catch (err) {
    console.error(`❌ RESTORATION FAILED: ${err.message}`)
    process.exit(1)
  }
}

if (require.main === module) {
  runCliRestore()
}
