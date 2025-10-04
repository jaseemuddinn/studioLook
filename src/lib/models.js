import mongoose from 'mongoose'

// User Schema
const userSchema = new mongoose.Schema({
    name: String,
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['PHOTOGRAPHER', 'CLIENT', 'ALL_FEATURES'],
        default: 'CLIENT'
    },
    emailVerified: Date,
    image: String,
    // Storage tracking
    storageUsed: {
        type: Number,
        default: 0
    },
    storageLimit: {
        type: Number,
        default: 2 * 1024 * 1024 * 1024 // 2GB in bytes
    }
}, {
    timestamps: true
})

// Project Schema
const projectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    status: {
        type: String,
        enum: ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'],
        default: 'DRAFT'
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    coverImageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File'
    }
}, {
    timestamps: true
})

// Folder Schema
const folderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder'
    },
    position: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
})

// File Schema
const fileSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: false  // Made optional since we're using S3 URLs now
    },
    url: {
        type: String,
        required: true   // S3 URL is now required
    },
    thumbnailUrl: String,
    mimeType: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    width: Number,
    height: Number,
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    folderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    position: {
        type: Number,
        default: 0
    },
    metadata: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
})

// Selection Schema
const selectionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File',
        required: true
    },
    status: {
        type: String,
        enum: ['SELECTED', 'REJECTED', 'PENDING'],
        default: 'PENDING'
    }
}, {
    timestamps: true
})

// Add compound unique index for user and file
selectionSchema.index({ userId: 1, fileId: 1 }, { unique: true })

// Comment Schema
const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true
    },
    fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
})

// ProjectShare Schema
const projectShareSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    email: String,
    name: String,
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    joinedAt: Date,
    canSelect: {
        type: Boolean,
        default: true
    },
    canComment: {
        type: Boolean,
        default: true
    },
    canDownload: {
        type: Boolean,
        default: false
    },
    expiresAt: Date,
    password: String
}, {
    timestamps: true
})

// Notification Schema
const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['SELECTION_MADE', 'COMMENT_ADDED', 'PROJECT_SHARED', 'PROJECT_COMPLETED'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    data: mongoose.Schema.Types.Mixed,
    read: {
        type: Boolean,
        default: false
    },
    readAt: Date
}, {
    timestamps: true
})

// Activity Schema
const activitySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    type: {
        type: String,
        enum: ['PROJECT_CREATED', 'FILE_UPLOADED', 'SELECTION_MADE', 'COMMENT_ADDED', 'PROJECT_SHARED'],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    metadata: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
})

// NextAuth schemas for MongoDB adapter
const accountSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true
    },
    provider: {
        type: String,
        required: true
    },
    providerAccountId: {
        type: String,
        required: true
    },
    refresh_token: String,
    access_token: String,
    expires_at: Number,
    token_type: String,
    scope: String,
    id_token: String,
    session_state: String
}, {
    timestamps: true
})

const sessionSchema = new mongoose.Schema({
    sessionToken: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    expires: {
        type: Date,
        required: true
    }
}, {
    timestamps: true
})

const verificationTokenSchema = new mongoose.Schema({
    identifier: {
        type: String,
        required: true
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    expires: {
        type: Date,
        required: true
    }
}, {
    timestamps: true
})

// Create indexes
accountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true })
verificationTokenSchema.index({ identifier: 1, token: 1 }, { unique: true })

// Export models
export const User = mongoose.models.User || mongoose.model('User', userSchema)
export const Project = mongoose.models.Project || mongoose.model('Project', projectSchema)
export const Folder = mongoose.models.Folder || mongoose.model('Folder', folderSchema)
export const File = mongoose.models.File || mongoose.model('File', fileSchema)
export const Selection = mongoose.models.Selection || mongoose.model('Selection', selectionSchema)
export const Comment = mongoose.models.Comment || mongoose.model('Comment', commentSchema)
export const ProjectShare = mongoose.models.ProjectShare || mongoose.model('ProjectShare', projectShareSchema)
export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema)
export const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema)
export const Account = mongoose.models.Account || mongoose.model('Account', accountSchema)
export const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema)
export const VerificationToken = mongoose.models.VerificationToken || mongoose.model('VerificationToken', verificationTokenSchema)