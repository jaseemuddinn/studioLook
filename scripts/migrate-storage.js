import { connectToDatabase, User, File } from '@/lib/db.js'

/**
 * Migration script to add storage tracking to existing users
 * Run this once to initialize storage tracking for existing users
 */

async function migrateUserStorage() {
    console.log('Starting storage migration...')

    try {
        await connectToDatabase()

        // Get all users
        const users = await User.find({})
        console.log(`Found ${users.length} users to migrate`)

        for (const user of users) {
            console.log(`Processing user: ${user.email}`)

            // Calculate total storage used by this user
            const userFiles = await File.find({ userId: user._id })
            const totalStorage = userFiles.reduce((total, file) => total + (file.size || 0), 0)

            // Update user with storage information
            await User.findByIdAndUpdate(user._id, {
                storageUsed: totalStorage,
                storageLimit: 2 * 1024 * 1024 * 1024 // 2GB default
            })

            console.log(`  - Updated ${user.email}: ${formatBytes(totalStorage)} used`)
        }

        console.log('Migration completed successfully!')

    } catch (error) {
        console.error('Migration failed:', error)
        throw error
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    migrateUserStorage()
        .then(() => {
            console.log('✅ Migration complete')
            process.exit(0)
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error)
            process.exit(1)
        })
}

export { migrateUserStorage }