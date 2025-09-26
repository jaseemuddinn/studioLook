"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"

export default function GalleryView({
    files,
    folders = [],
    selections = {},
    onSelectionChange,
    onComment,
    isClient = false,
    permissions = {},
    shareToken = null
}) {
    const [selectedFile, setSelectedFile] = useState(null)
    const [showImageModal, setShowImageModal] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [filterStatus, setFilterStatus] = useState("all")
    const [sortBy, setSortBy] = useState("date")
    const [expandedFolders, setExpandedFolders] = useState({})
    const [selectedFileFolder, setSelectedFileFolder] = useState(null) // Track which folder the selected file belongs to

    // Initialize expanded folders (all expanded by default)
    useEffect(() => {
        if (folders.length > 0) {
            const initialExpanded = {}
            folders.forEach(folder => {
                initialExpanded[folder.id] = true
            })
            setExpandedFolders(initialExpanded)
        }
    }, [folders])

    const toggleFolder = (folderId) => {
        setExpandedFolders(prev => ({
            ...prev,
            [folderId]: !prev[folderId]
        }))
    }

    // Get all files for search and filtering (flatten from folders)
    const allFiles = folders.length > 0
        ? folders.reduce((acc, folder) => [...acc, ...folder.files], [])
        : files // Fallback to direct files array

    const filteredFiles = allFiles.filter(file => {
        const matchesSearch = file.originalName.toLowerCase().includes(searchTerm.toLowerCase())

        if (filterStatus === "all") return matchesSearch

        const selection = selections[file.id]
        const status = selection?.status || "PENDING"

        return matchesSearch && status.toLowerCase() === filterStatus.toLowerCase()
    })

    const sortedFiles = [...filteredFiles].sort((a, b) => {
        switch (sortBy) {
            case "name":
                return a.originalName.localeCompare(b.originalName)
            case "size":
                return b.size - a.size
            case "date":
            default:
                return new Date(b.createdAt) - new Date(a.createdAt)
        }
    })

    const handleSelectionToggle = (fileId, newStatus) => {
        if (!isClient || !permissions.canSelect) return
        onSelectionChange?.(fileId, newStatus)
    }

    const handleImageClick = (file, folderContext = null) => {
        console.log('Image clicked:', file.originalName, 'Folder context:', folderContext?.name || 'none')
        setSelectedFile(file)
        setSelectedFileFolder(folderContext)
        setShowImageModal(true)
    }

    const handleNavigateImage = (direction) => {
        console.log('Navigating:', direction, 'Selected folder:', selectedFileFolder?.name || 'none')
        // Determine which files to navigate within
        let currentFiles
        if (selectedFileFolder) {
            // Navigate within the specific folder
            currentFiles = selectedFileFolder.files.filter(file => {
                const matchesSearch = file.originalName.toLowerCase().includes(searchTerm.toLowerCase())

                if (filterStatus === "all") return matchesSearch

                const selection = selections[file.id]
                const status = selection?.status || "PENDING"

                return matchesSearch && status.toLowerCase() === filterStatus.toLowerCase()
            })

            // Sort the folder files
            currentFiles = [...currentFiles].sort((a, b) => {
                switch (sortBy) {
                    case "name":
                        return a.originalName.localeCompare(b.originalName)
                    case "size":
                        return b.size - a.size
                    case "date":
                    default:
                        return new Date(b.createdAt) - new Date(a.createdAt)
                }
            })
            console.log('Navigating within folder files:', currentFiles.length)
        } else {
            // Fall back to all sorted files (for non-folder view)
            currentFiles = sortedFiles
            console.log('Navigating within all files:', currentFiles.length)
        }

        const currentIndex = currentFiles.findIndex(f => f.id === selectedFile?.id)

        if (currentIndex === -1) return

        let newIndex
        if (direction === 'next') {
            newIndex = currentIndex + 1 >= currentFiles.length ? 0 : currentIndex + 1
        } else {
            newIndex = currentIndex - 1 < 0 ? currentFiles.length - 1 : currentIndex - 1
        }

        setSelectedFile(currentFiles[newIndex])
    }

    const getCurrentFileIndex = () => {
        // Determine which files to count within
        let currentFiles
        if (selectedFileFolder) {
            // Count within the specific folder
            currentFiles = selectedFileFolder.files.filter(file => {
                const matchesSearch = file.originalName.toLowerCase().includes(searchTerm.toLowerCase())

                if (filterStatus === "all") return matchesSearch

                const selection = selections[file.id]
                const status = selection?.status || "PENDING"

                return matchesSearch && status.toLowerCase() === filterStatus.toLowerCase()
            })

            // Sort the folder files
            currentFiles = [...currentFiles].sort((a, b) => {
                switch (sortBy) {
                    case "name":
                        return a.originalName.localeCompare(b.originalName)
                    case "size":
                        return b.size - a.size
                    case "date":
                    default:
                        return new Date(b.createdAt) - new Date(a.createdAt)
                }
            })
        } else {
            // Fall back to all sorted files (for non-folder view)
            currentFiles = sortedFiles
        }

        const currentIndex = currentFiles.findIndex(f => f.id === selectedFile?.id)
        return {
            current: currentIndex + 1,
            total: currentFiles.length
        }
    }

    const getSelectionStatus = (fileId) => {
        return selections[fileId]?.status || "PENDING"
    }

    const getStatusColor = (status) => {
        switch (status) {
            case "SELECTED":
                return "bg-green-100 text-green-800 border-green-200"
            case "REJECTED":
                return "bg-red-100 text-red-800 border-red-200"
            default:
                return "bg-gray-100 text-gray-800 border-gray-200"
        }
    }

    return (
        <div className="space-y-6">
            {/* Filters and Search */}
            <div className="bg-white rounded-lg shadow p-6 text-gray-900">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <svg
                                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        {isClient && (
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="selected">Selected</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        )}

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="date">Sort by Date</option>
                            <option value="name">Sort by Name</option>
                            <option value="size">Sort by Size</option>
                        </select>
                    </div>
                </div>

                {isClient && (
                    <div className="mt-4 flex gap-4 text-sm">
                        <span className="text-gray-600">
                            Total: {allFiles.length} files
                        </span>
                        <span className="text-green-600">
                            Selected: {Object.values(selections).filter(s => s.status === "SELECTED").length}
                        </span>
                        <span className="text-red-600">
                            Rejected: {Object.values(selections).filter(s => s.status === "REJECTED").length}
                        </span>
                        <span className="text-gray-600">
                            Pending: {Object.values(selections).filter(s => s.status === "PENDING").length +
                                (allFiles.length - Object.keys(selections).length)}
                        </span>
                    </div>
                )}
            </div>

            {/* Gallery Grid - Folder-wise or regular */}
            <div className="space-y-6">
                {folders.length > 0 ? (
                    // Folder-wise view
                    folders.map((folder) => {
                        const folderFiles = folder.files.filter(file => {
                            const matchesSearch = file.originalName.toLowerCase().includes(searchTerm.toLowerCase())

                            if (filterStatus === "all") return matchesSearch

                            const selection = selections[file.id]
                            const status = selection?.status || "PENDING"

                            return matchesSearch && status.toLowerCase() === filterStatus.toLowerCase()
                        })

                        // Sort folder files
                        const sortedFolderFiles = [...folderFiles].sort((a, b) => {
                            switch (sortBy) {
                                case "name":
                                    return a.originalName.localeCompare(b.originalName)
                                case "size":
                                    return b.size - a.size
                                case "date":
                                default:
                                    return new Date(b.createdAt) - new Date(a.createdAt)
                            }
                        })

                        // Don't render folder if no files match filters
                        if (sortedFolderFiles.length === 0 && (searchTerm || filterStatus !== "all")) {
                            return null
                        }

                        return (
                            <div key={folder.id} className="bg-white rounded-lg shadow">
                                {/* Folder Header */}
                                <div
                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-200"
                                    onClick={() => toggleFolder(folder.id)}
                                >
                                    <div className="flex items-center space-x-3">
                                        <svg
                                            className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${expandedFolders[folder.id] ? 'rotate-90' : ''
                                                }`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                        <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                                        </svg>
                                        <h3 className="text-lg font-semibold text-gray-900">{folder.name}</h3>
                                    </div>
                                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                                        <span>{sortedFolderFiles.length} files</span>
                                        {isClient && (
                                            <>
                                                <span className="text-green-600">
                                                    {sortedFolderFiles.filter(f => selections[f.id]?.status === "SELECTED").length} selected
                                                </span>
                                                <span className="text-red-600">
                                                    {sortedFolderFiles.filter(f => selections[f.id]?.status === "REJECTED").length} rejected
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Folder Content */}
                                {expandedFolders[folder.id] && (
                                    <div className="p-6">
                                        {sortedFolderFiles.length === 0 ? (
                                            <div className="text-center py-8">
                                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <h3 className="mt-2 text-sm font-medium text-gray-900">No files in this folder</h3>
                                            </div>
                                        ) : (
                                            <MasonryGallery
                                                files={sortedFolderFiles}
                                                onImageClick={(file) => handleImageClick(file, folder)}
                                                onSelectionToggle={handleSelectionToggle}
                                                getSelectionStatus={getSelectionStatus}
                                                getStatusColor={getStatusColor}
                                                isClient={isClient}
                                                permissions={permissions}
                                                shareToken={shareToken}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })
                ) : (
                    // Fallback to regular view if no folders
                    <div className="bg-white rounded-lg shadow p-6">
                        {sortedFiles.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No files found</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    {searchTerm ? "Try adjusting your search terms" : "No files match the current filters"}
                                </p>
                            </div>
                        ) : (
                            <MasonryGallery
                                files={sortedFiles}
                                onImageClick={(file) => handleImageClick(file, null)}
                                onSelectionToggle={handleSelectionToggle}
                                getSelectionStatus={getSelectionStatus}
                                getStatusColor={getStatusColor}
                                isClient={isClient}
                                permissions={permissions}
                                shareToken={shareToken}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Image Modal */}
            {showImageModal && selectedFile && (
                <ImageModal
                    file={selectedFile}
                    onClose={() => {
                        setShowImageModal(false)
                        setSelectedFileFolder(null)
                    }}
                    onSelectionToggle={handleSelectionToggle}
                    onComment={onComment}
                    selectionStatus={getSelectionStatus(selectedFile.id)}
                    isClient={isClient}
                    permissions={permissions}
                    shareToken={shareToken}
                    onNavigate={handleNavigateImage}
                    fileIndex={getCurrentFileIndex()}
                    hasMultipleFiles={(() => {
                        if (selectedFileFolder) {
                            const folderFiles = selectedFileFolder.files.filter(file => {
                                const matchesSearch = file.originalName.toLowerCase().includes(searchTerm.toLowerCase())
                                if (filterStatus === "all") return matchesSearch
                                const selection = selections[file.id]
                                const status = selection?.status || "PENDING"
                                return matchesSearch && status.toLowerCase() === filterStatus.toLowerCase()
                            })
                            return folderFiles.length > 1
                        }
                        return sortedFiles.length > 1
                    })()}
                />
            )}
        </div>
    )
}

function MasonryGallery({
    files,
    onImageClick,
    onSelectionToggle,
    getSelectionStatus,
    getStatusColor,
    isClient,
    permissions,
    shareToken = null
}) {
    return (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
            {files.map((file) => (
                <FileCard
                    key={file.id}
                    file={file}
                    onClick={() => onImageClick(file)}
                    onSelectionToggle={onSelectionToggle}
                    selectionStatus={getSelectionStatus(file.id)}
                    getStatusColor={getStatusColor}
                    isClient={isClient}
                    permissions={permissions}
                    shareToken={shareToken}
                />
            ))}
        </div>
    )
}

function FileCard({
    file,
    onClick,
    onSelectionToggle,
    selectionStatus,
    getStatusColor,
    isClient,
    permissions,
    shareToken = null
}) {
    const isVideo = file.mimeType.startsWith('video/')

    return (
        <div className="break-inside-avoid mb-4 group relative">
            <div className="relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow">
                {isVideo ? (
                    <video
                        src={file.url}
                        className="w-full h-auto object-cover"
                        muted
                        onClick={onClick}
                    />
                ) : (
                    <img
                        src={file.thumbnailUrl || file.url}
                        alt={file.originalName}
                        className="w-full h-auto object-cover"
                        onClick={onClick}
                        onError={(e) => {
                            console.error('Image failed to load:', file.thumbnailUrl || file.url, file)
                            e.target.style.backgroundColor = '#f3f4f6'
                            e.target.style.display = 'flex'
                            e.target.style.alignItems = 'center'
                            e.target.style.justifyContent = 'center'
                            e.target.innerHTML = '<span style="color: #6b7280; font-size: 12px;">Image not found</span>'
                        }}
                        onLoad={() => console.log('Image loaded successfully:', file.thumbnailUrl || file.url)}
                    />
                )}

                {/* Overlay with selection controls */}
                {isClient && permissions.canSelect && (
                    <div className="absolute inset-0 pointer-events-none transition-all duration-200 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2 pointer-events-auto">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onSelectionToggle(file.id, selectionStatus === "SELECTED" ? "PENDING" : "SELECTED")
                                }}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shadow-lg ${selectionStatus === "SELECTED"
                                    ? "bg-green-600 text-white"
                                    : "bg-white text-gray-700 hover:bg-green-50"
                                    }`}
                            >
                                {selectionStatus === "SELECTED" ? "✓ Selected" : "Select"}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onSelectionToggle(file.id, selectionStatus === "REJECTED" ? "PENDING" : "REJECTED")
                                }}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shadow-lg ${selectionStatus === "REJECTED"
                                    ? "bg-red-600 text-white"
                                    : "bg-white text-gray-700 hover:bg-red-50"
                                    }`}
                            >
                                {selectionStatus === "REJECTED" ? "✗ Rejected" : "Reject"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Download button overlay (always visible on hover if download is allowed) */}
                {permissions.canDownload && (
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <a
                            href={`/api/download/${file.id}${shareToken ? `?token=${shareToken}` : ''}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center px-2 py-1 bg-blue-600 text-white rounded-full text-xs font-medium hover:bg-blue-700 transition-colors shadow-lg"
                            title="Download file"
                        >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download
                        </a>
                    </div>
                )}

                {/* Status indicator */}
                {isClient && selectionStatus !== "PENDING" && (
                    <div className="absolute top-2 right-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectionStatus)}`}>
                            {selectionStatus === "SELECTED" ? "✓" : "✗"}
                        </span>
                    </div>
                )}

                {/* File type indicator for videos */}
                {isVideo && (
                    <div className="absolute top-2 left-2">
                        <svg className="h-6 w-6 text-white bg-black bg-opacity-50 rounded-full p-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
            </div>

            {/* File info */}
            <div className="mt-2 px-1">
                <p className="text-xs text-gray-900 truncate font-medium" title={file.originalName}>
                    {file.originalName}
                </p>
                <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                    </p>
                    {file.width && file.height && (
                        <p className="text-xs text-gray-500">
                            {file.width} × {file.height}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

function ImageModal({
    file,
    onClose,
    onSelectionToggle,
    onComment,
    selectionStatus,
    isClient,
    permissions,
    shareToken = null,
    onNavigate,
    fileIndex,
    hasMultipleFiles = false
}) {
    const [showCommentForm, setShowCommentForm] = useState(false)
    const [comment, setComment] = useState("")
    const [isSubmittingComment, setIsSubmittingComment] = useState(false)
    const [comments, setComments] = useState([])
    const [isLoadingComments, setIsLoadingComments] = useState(false)

    // Fetch comments when modal opens
    useEffect(() => {
        if (permissions.canComment) {
            fetchComments()
        }
    }, [file.id, permissions.canComment, shareToken])

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose()
            } else if (hasMultipleFiles && onNavigate) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault()
                    onNavigate('prev')
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault()
                    onNavigate('next')
                }
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [onClose, onNavigate, hasMultipleFiles])

    const fetchComments = async () => {
        setIsLoadingComments(true)
        try {
            let response
            if (shareToken) {
                // For shared gallery
                response = await fetch(`/api/gallery/${shareToken}/comments?fileId=${file.id}`)
            } else {
                // For project owner - we need a different endpoint
                response = await fetch(`/api/files/${file.id}/comments`)
            }

            if (response.ok) {
                const commentsData = await response.json()
                setComments(commentsData)
            } else {
                console.error('Failed to fetch comments:', response.statusText)
            }
        } catch (error) {
            console.error('Error fetching comments:', error)
        } finally {
            setIsLoadingComments(false)
        }
    }

    const handleCommentSubmit = async (e) => {
        e.preventDefault()
        if (!comment.trim() || !permissions.canComment) return

        setIsSubmittingComment(true)
        try {
            let response
            if (shareToken) {
                // For shared gallery
                response = await fetch(`/api/gallery/${shareToken}/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fileId: file.id,
                        content: comment.trim()
                    })
                })
            } else {
                // For project owner - use existing onComment callback
                await onComment?.(file.id, comment.trim())
                // Refresh comments after adding
                await fetchComments()
                setComment("")
                setShowCommentForm(false)
                setIsSubmittingComment(false)
                return
            }

            if (response.ok) {
                const newComment = await response.json()
                setComments([newComment, ...comments]) // Add new comment to the top
                setComment("")
                setShowCommentForm(false)
            } else {
                console.error('Failed to submit comment:', response.statusText)
            }
        } catch (error) {
            console.error("Error submitting comment:", error)
        } finally {
            setIsSubmittingComment(false)
        }
    }

    const isVideo = file.mimeType.startsWith('video/')

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-lg w-full max-w-7xl h-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col lg:flex-row">

                {/* Left Side - Image */}
                <div className="flex-1 flex items-center justify-center bg-gray-50 relative min-h-0">
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 text-gray-600 hover:text-gray-800 bg-white bg-opacity-90 rounded-full p-1.5 sm:p-2 shadow-lg"
                    >
                        <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Navigation buttons */}
                    {hasMultipleFiles && onNavigate && (
                        <>
                            <button
                                onClick={() => onNavigate('prev')}
                                className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:text-gray-200 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-2 shadow-lg transition-all"
                                title="Previous photo (←)"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={() => onNavigate('next')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:text-gray-200 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-2 shadow-lg transition-all"
                                title="Next photo (→)"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </>
                    )}

                    {/* Photo counter */}
                    {hasMultipleFiles && fileIndex && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm font-medium">
                            {fileIndex.current} of {fileIndex.total}
                        </div>
                    )}

                    {/* Image/Video container */}
                    <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
                        {isVideo ? (
                            <video
                                src={file.url}
                                controls
                                className="max-w-full max-h-full object-contain shadow-lg"
                            />
                        ) : (
                            <img
                                src={file.url}
                                alt={file.originalName}
                                className="max-w-full max-h-full object-contain shadow-lg"
                                onError={(e) => {
                                    console.error('Image failed to load:', file.url)
                                    e.target.src = file.thumbnailUrl || '/placeholder-image.png'
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Right Side - Controls & Comments */}
                <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l bg-white flex flex-col max-h-80 lg:max-h-none">
                    {/* Header */}
                    <div className="p-3 sm:p-4 border-b bg-gray-50">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate mb-2">
                            {file.originalName}
                        </h3>
                        <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                            <p><strong>Size:</strong> {formatFileSize(file.size)}</p>
                            {file.width && file.height && (
                                <p><strong>Dimensions:</strong> {file.width} × {file.height}</p>
                            )}
                        </div>
                    </div>

                    {/* Scrollable content area */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">

                            {/* Selection controls */}
                            {isClient && permissions.canSelect && (
                                <div className="space-y-2 sm:space-y-3">
                                    <h4 className="font-medium text-gray-900 text-sm sm:text-base">Selection</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => onSelectionToggle(file.id, selectionStatus === "SELECTED" ? "PENDING" : "SELECTED")}
                                            className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${selectionStatus === "SELECTED"
                                                ? "bg-green-600 text-white"
                                                : "bg-green-100 text-green-700 hover:bg-green-200"
                                                }`}
                                        >
                                            {selectionStatus === "SELECTED" ? "✓ Selected" : "Select"}
                                        </button>
                                        <button
                                            onClick={() => onSelectionToggle(file.id, selectionStatus === "REJECTED" ? "PENDING" : "REJECTED")}
                                            className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${selectionStatus === "REJECTED"
                                                ? "bg-red-600 text-white"
                                                : "bg-red-100 text-red-700 hover:bg-red-200"
                                                }`}
                                        >
                                            {selectionStatus === "REJECTED" ? "✗ Reject" : "Reject"}
                                        </button>
                                    </div>
                                    {selectionStatus !== "PENDING" && (
                                        <button
                                            onClick={() => onSelectionToggle(file.id, "PENDING")}
                                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs sm:text-sm font-medium"
                                        >
                                            Reset Selection
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Download controls */}
                            {permissions.canDownload && (
                                <div className="space-y-2 sm:space-y-3">
                                    <h4 className="font-medium text-gray-900 text-sm sm:text-base">Download</h4>
                                    <a
                                        href={`/api/download/${file.id}${shareToken ? `?token=${shareToken}` : ''}`}
                                        className="w-full inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-xs sm:text-sm"
                                    >
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Download Original
                                    </a>
                                </div>
                            )}

                            {/* Comments section */}
                            {isClient && permissions.canComment && (
                                <div className="space-y-2 sm:space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-gray-900 text-sm sm:text-base">Comments</h4>
                                        {!showCommentForm && (
                                            <button
                                                onClick={() => setShowCommentForm(true)}
                                                className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium"
                                            >
                                                Add Comment
                                            </button>
                                        )}
                                    </div>

                                    {/* Comment form */}
                                    {showCommentForm && (
                                        <form onSubmit={handleCommentSubmit} className="space-y-2 sm:space-y-3">
                                            <textarea
                                                value={comment}
                                                onChange={(e) => setComment(e.target.value)}
                                                placeholder="Add your comment..."
                                                rows={3}
                                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border placeholder:text-gray-400 text-gray-900 border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                                disabled={isSubmittingComment}
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    type="submit"
                                                    disabled={isSubmittingComment || !comment.trim()}
                                                    className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isSubmittingComment ? "Saving..." : "Save Comment"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowCommentForm(false)
                                                        setComment("")
                                                    }}
                                                    disabled={isSubmittingComment}
                                                    className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {/* Comments display status */}
                                    {isLoadingComments ? (
                                        <div className="text-xs sm:text-sm text-gray-500 italic bg-gray-50 p-2 sm:p-3 rounded-lg">
                                            Loading comments...
                                        </div>
                                    ) : comments.length > 0 ? (
                                        <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-64 overflow-y-auto">
                                            {comments.map((comment) => (
                                                <div key={comment._id} className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                                                    <div className="flex items-start justify-between mb-1 sm:mb-2">
                                                        <div className="font-medium text-xs sm:text-sm text-gray-900">
                                                            {comment.userId?.name || comment.userId?.email || 'User'}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                    <div className="text-xs sm:text-sm text-gray-700">
                                                        {comment.content}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-xs sm:text-sm text-gray-500 italic bg-gray-50 p-2 sm:p-3 rounded-lg">
                                            No comments yet. Be the first to comment!
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}