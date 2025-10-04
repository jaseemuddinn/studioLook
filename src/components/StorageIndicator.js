"use client"

import { useState, useEffect } from 'react'

// Top bar mini storage indicator
export function TopBarStorage() {
    const [storageStats, setStorageStats] = useState(null)

    useEffect(() => {
        fetchStorageStats()
    }, [])

    const fetchStorageStats = async () => {
        try {
            const response = await fetch('/api/storage/stats')
            if (response.ok) {
                const stats = await response.json()
                setStorageStats(stats)
            }
        } catch (error) {
            console.error('Error fetching storage stats:', error)
        }
    }

    if (!storageStats) return null

    const safeUsedPercentage = isNaN(storageStats.usedPercentage) ? 0 : Math.max(0, Math.min(100, storageStats.usedPercentage))
    const safeUsedFormatted = storageStats.usedFormatted || '0 Bytes'
    const safeLimitFormatted = storageStats.limitFormatted || '2 GB'

    const getStorageColor = (percentage) => {
        if (percentage >= 90) return 'bg-red-500'
        if (percentage >= 75) return 'bg-yellow-500'
        return 'bg-green-500'
    }

    return (
        <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-600">📊</span>
            <span className="text-gray-700 font-medium">
                {safeUsedFormatted} / {safeLimitFormatted}
            </span>
            <div className="w-12 bg-gray-200 rounded-full h-1.5">
                <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${getStorageColor(safeUsedPercentage)}`}
                    style={{ width: `${safeUsedPercentage}%` }}
                ></div>
            </div>
        </div>
    )
}

// Main storage indicator - only shows when needed
export default function StorageIndicator({ compact = false, showAlways = false }) {
    const [storageStats, setStorageStats] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showDetails, setShowDetails] = useState(false)

    useEffect(() => {
        fetchStorageStats()
    }, [])

    const fetchStorageStats = async () => {
        try {
            const response = await fetch('/api/storage/stats')
            if (response.ok) {
                const stats = await response.json()
                setStorageStats(stats)
            }
        } catch (error) {
            console.error('Error fetching storage stats:', error)
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) {
        return null // Don't show loading state for cleaner UI
    }

    if (!storageStats) {
        return null
    }

    // Safety checks for storage values
    const safeUsedPercentage = isNaN(storageStats.usedPercentage) ? 0 : Math.max(0, Math.min(100, storageStats.usedPercentage))
    const safeUsedFormatted = storageStats.usedFormatted || '0 Bytes'
    const safeLimitFormatted = storageStats.limitFormatted || '2 GB'
    const safeRemainingFormatted = storageStats.remainingFormatted || safeLimitFormatted

    // Option 6: Only show when needed
    if (!showAlways && safeUsedPercentage < 50) {
        return null // Hide completely when usage < 50%
    }

    const getStorageColor = (percentage) => {
        if (percentage >= 90) return 'bg-red-500'
        if (percentage >= 75) return 'bg-yellow-500'
        return 'bg-green-500'
    }

    const getStorageWarning = (percentage) => {
        const safePercentage = isNaN(percentage) ? 0 : percentage
        if (safePercentage >= 95) {
            return {
                level: 'critical',
                message: 'Storage almost full! Delete files or contact us.',
                icon: '⚠️'
            }
        }
        if (safePercentage >= 80) {
            return {
                level: 'warning',
                message: 'Storage getting full. Consider managing your files.',
                icon: '⚡'
            }
        }
        return null
    }

    const warning = getStorageWarning(safeUsedPercentage)

    // Compact version for 50-80% usage
    if (safeUsedPercentage < 80 && !showDetails) {
        return (
            <div
                className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => setShowDetails(true)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <span className="text-blue-600">📊</span>
                        <div>
                            <p className="text-sm font-medium text-blue-900">
                                Storage: {safeUsedFormatted} / {safeLimitFormatted} ({Math.round(safeUsedPercentage)}% used)
                            </p>
                            <p className="text-xs text-blue-600">Click to view details</p>
                        </div>
                    </div>
                    <div className="w-24 bg-blue-200 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full transition-all duration-300 ${getStorageColor(safeUsedPercentage)}`}
                            style={{ width: `${safeUsedPercentage}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        )
    }

    // Full version for 80%+ usage or when details are requested
    return (
        <>
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">Storage Usage</h3>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={fetchStorageStats}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="Refresh storage stats"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                        {safeUsedPercentage < 80 && (
                            <button
                                onClick={() => setShowDetails(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title="Minimize"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Warning Message */}
                {warning && (
                    <div className={`mb-4 p-3 rounded-lg border ${warning.level === 'critical'
                        ? 'bg-red-50 border-red-200 text-red-800'
                        : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                        }`}>
                        <div className="flex items-center">
                            <span className="text-lg mr-2">{warning.icon}</span>
                            <p className="text-sm font-medium">{warning.message}</p>
                        </div>
                    </div>
                )}

                {/* Storage Bar */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Used</span>
                        <span className="text-sm text-gray-800 font-medium">
                            {safeUsedFormatted} of {safeLimitFormatted} ({Math.round(safeUsedPercentage)}%)
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                            className={`h-3 rounded-full transition-all duration-500 ${getStorageColor(safeUsedPercentage)}`}
                            style={{ width: `${safeUsedPercentage}%` }}
                        ></div>
                    </div>
                </div>

                {/* Storage Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-gray-600">Available</p>
                        <p className="font-medium text-gray-900">{safeRemainingFormatted}</p>
                    </div>
                    <div>
                        <p className="text-gray-600">Total Limit</p>
                        <p className="font-medium text-gray-900">{safeLimitFormatted}</p>
                    </div>
                </div>

                {/* Storage Tips */}
                {safeUsedPercentage > 60 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">💡 Storage Tips</h4>
                        <ul className="text-xs text-gray-600 space-y-1">
                            <li>• Delete old or unwanted photos</li>
                            <li>• Compress images before uploading</li>
                            <li>• Archive completed projects</li>
                        </ul>
                    </div>
                )}

                {/* Contact Information */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center">
                        Need more than 2GB storage?
                        <br />
                        <a
                            href="mailto:contact@onnoff.in"
                            className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Contact us at contact@onnoff.in
                        </a>
                    </p>
                </div>
            </div>
        </>
    )
}