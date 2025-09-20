import connectToDatabase from '@/lib/mongodb'
import * as models from '@/lib/models'

// Export database connection and models
export { connectToDatabase }
export const {
    User,
    Project,
    Folder,
    File,
    Selection,
    Comment,
    ProjectShare,
    Notification,
    Activity,
    Account,
    Session,
    VerificationToken
} = models