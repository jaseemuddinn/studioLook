import { User, File } from './models.js'
import mongoose from 'mongoose'

/**
 * Storage utility functions for managing user storage limits
 */

// Format bytes to human readable format
export function formatBytes(bytes, decimals = 2) {
    // Handle null, undefined, or invalid values
    if (bytes == null || isNaN(bytes) || bytes < 0) {
        return '0 Bytes'
    }

    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// Check if user has enough storage space
export async function checkStorageLimit(userId, additionalSize) {
    try {
        const user = await User.findById(userId)
        if (!user) {
            throw new Error('User not found')
        }

        // Ensure storage fields exist and are valid numbers
        const currentUsage = user.storageUsed || 0
        const storageLimit = user.storageLimit || (2 * 1024 * 1024 * 1024) // Default 2GB
        const safeAdditionalSize = additionalSize || 0

        // Initialize storage fields if they don't exist
        if (user.storageUsed == null || user.storageLimit == null) {
            await User.findByIdAndUpdate(userId, {
                storageUsed: currentUsage,
                storageLimit: storageLimit
            })
        }

        const wouldExceedLimit = (currentUsage + safeAdditionalSize) > storageLimit

        return {
            hasSpace: !wouldExceedLimit,
            currentUsage: currentUsage,
            limit: storageLimit,
            remaining: Math.max(0, storageLimit - currentUsage),
            wouldUse: currentUsage + safeAdditionalSize,
            additionalSize: safeAdditionalSize
        }
    } catch (error) {
        console.error('Error checking storage limit:', error)
        throw error
    }
}

// Update user storage usage when files are added
export async function addToStorageUsage(userId, fileSize) {
    try {
        // Ensure userId is an ObjectId
        const userObjectId = typeof userId === 'string'
            ? new mongoose.Types.ObjectId(userId)
            : userId

        const safeFileSize = fileSize || 0

        // Get current user to check if storage fields exist
        const user = await User.findById(userObjectId)
        if (!user) {
            throw new Error('User not found')
        }

        // Initialize storage fields if they don't exist
        if (user.storageUsed == null) {
            await User.findByIdAndUpdate(userObjectId, {
                storageUsed: safeFileSize,
                storageLimit: user.storageLimit || (2 * 1024 * 1024 * 1024)
            })
        } else {
            await User.findByIdAndUpdate(userObjectId, {
                $inc: { storageUsed: safeFileSize }
            })
        }

        console.log(`Added ${formatBytes(safeFileSize)} to user ${userId} storage usage`)
    } catch (error) {
        console.error('Error updating storage usage:', error)
        throw error
    }
}

// Update user storage usage when files are deleted
export async function removeFromStorageUsage(userId, fileSize) {
    try {
        const safeFileSize = fileSize || 0

        // Get current user to check storage fields
        const user = await User.findById(userId)
        if (!user) {
            throw new Error('User not found')
        }

        // Only decrement if storageUsed exists and is greater than 0
        if (user.storageUsed != null && user.storageUsed > 0) {
            await User.findByIdAndUpdate(userId, {
                $inc: { storageUsed: -safeFileSize }
            })
        } else {
            // Initialize storage fields if they don't exist
            await User.findByIdAndUpdate(userId, {
                storageUsed: 0,
                storageLimit: user.storageLimit || (2 * 1024 * 1024 * 1024)
            })
        }

        console.log(`Removed ${formatBytes(safeFileSize)} from user ${userId} storage usage`)
    } catch (error) {
        console.error('Error updating storage usage:', error)
        throw error
    }
}

// Get user storage statistics
export async function getUserStorageStats(userId) {
    try {
        const user = await User.findById(userId)
        if (!user) {
            throw new Error('User not found')
        }

        // Ensure storage fields exist and are valid numbers
        const storageUsed = user.storageUsed || 0
        const storageLimit = user.storageLimit || (2 * 1024 * 1024 * 1024) // Default 2GB

        // If user doesn't have storage fields, initialize them
        if (user.storageUsed == null || user.storageLimit == null) {
            await User.findByIdAndUpdate(userId, {
                storageUsed: storageUsed,
                storageLimit: storageLimit
            })
        }

        const usedPercentage = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0
        const remaining = Math.max(0, storageLimit - storageUsed)

        return {
            used: storageUsed,
            limit: storageLimit,
            remaining: remaining,
            usedPercentage: Math.round(usedPercentage * 100) / 100,
            usedFormatted: formatBytes(storageUsed),
            limitFormatted: formatBytes(storageLimit),
            remainingFormatted: formatBytes(remaining)
        }
    } catch (error) {
        console.error('Error getting storage stats:', error)
        throw error
    }
}

// Recalculate user storage usage (for data consistency)
export async function recalculateStorageUsage(userId) {
    try {
        // Convert userId to ObjectId if it's a string
        const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId

        const totalSize = await File.aggregate([
            { $match: { userId: userObjectId } },
            { $group: { _id: null, totalSize: { $sum: '$size' } } }
        ])

        const actualUsage = totalSize.length > 0 ? totalSize[0].totalSize : 0

        await User.findByIdAndUpdate(userId, {
            storageUsed: actualUsage
        })

        console.log(`Recalculated storage usage for user ${userId}: ${formatBytes(actualUsage)}`)
        return actualUsage
    } catch (error) {
        console.error('Error recalculating storage usage:', error)
        throw error
    }
}

// Batch check storage for multiple files
export async function checkBatchStorageLimit(userId, fileSizes) {
    try {
        const totalAdditionalSize = fileSizes.reduce((sum, size) => sum + size, 0)
        return await checkStorageLimit(userId, totalAdditionalSize)
    } catch (error) {
        console.error('Error checking batch storage limit:', error)
        throw error
    }
}

// Get storage limit error message
export function getStorageLimitMessage(storageCheck) {
    const { remaining, additionalSize, currentUsage, limit } = storageCheck

    return {
        title: "Storage Limit Exceeded",
        message: `You need ${formatBytes(additionalSize)} but only have ${formatBytes(remaining)} remaining. ` +
            `Current usage: ${formatBytes(currentUsage)} of ${formatBytes(limit)} (${Math.round((currentUsage / limit) * 100)}%)`,
        suggestion: "Delete some files to free up space, or contact us at contact@onnoff.in if you need more than 2GB storage."
    }
}

// Constants
export const STORAGE_LIMITS = {
    DEFAULT: 2 * 1024 * 1024 * 1024, // 2GB
    PREMIUM: 10 * 1024 * 1024 * 1024, // 10GB
    ENTERPRISE: 50 * 1024 * 1024 * 1024 // 50GB
}