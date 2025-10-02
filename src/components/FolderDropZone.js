"use client"

import { useState, useCallback } from "react"
import { useToast } from "./Toast"

/**
 * FolderDropZone Component
 * 
 * This component enables drag & drop functionality for multiple folders.
 * When folders are dragged to the component, it will:
 * 1. Create project folders with the same names
 * 2. Upload all valid files to their respective folders
 * 3. Show progress and results to the user
 * 
 * Usage:
 * <FolderDropZone 
 *   projectId={projectId} 
 *   onFoldersCreated={handleFoldersCreated}
 *   isEnabled={true}
 * >
 *   {your sidebar content}
 * </FolderDropZone>
 * 
 * Props:
 * - projectId: The ID of the project to create folders in
 * - onFoldersCreated: Callback function called when folders are successfully created
 * - isEnabled: Whether the drop zone is active (default: true)
 * - children: The content to wrap (typically the sidebar)
 */
export default function FolderDropZone({
    projectId,
    onFoldersCreated,
    isEnabled = true,
    children
}) {
    const [isDragOver, setIsDragOver] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const { toast } = useToast()

    // Utility functions
    const isValidFileType = (file) => {
        const validTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
            'video/mp4', 'video/mov', 'video/avi'
        ]
        return validTypes.includes(file.type) ||
            ['.jpeg', '.jpg', '.png', '.gif', '.mp4', '.mov', '.avi']
                .some(ext => file.name.toLowerCase().endsWith(ext))
    }

    const isValidFileSize = (file) => {
        return file.size <= 5 * 1024 * 1024 // 5MB
    }

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    // Process dropped items and organize by folder structure
    const processDroppedItems = async (items) => {
        const folderStructure = new Map()
        const errors = []

        const processEntry = async (entry, folderPath = '') => {
            if (entry.isFile) {
                return new Promise((resolve) => {
                    entry.file((file) => {
                        const currentPath = folderPath || 'root'

                        if (!folderStructure.has(currentPath)) {
                            folderStructure.set(currentPath, {
                                name: currentPath,
                                validFiles: [],
                                invalidFiles: [],
                                oversizedFiles: []
                            })
                        }

                        const folder = folderStructure.get(currentPath)

                        if (!isValidFileType(file)) {
                            folder.invalidFiles.push({
                                file,
                                reason: `Unsupported format (${file.type || 'unknown'})`,
                                suggestion: 'Supported: JPG, PNG, GIF, MP4, MOV, AVI'
                            })
                        } else if (!isValidFileSize(file)) {
                            folder.oversizedFiles.push({
                                file,
                                reason: `File too large (${formatFileSize(file.size)})`,
                                suggestion: 'Maximum size: 5MB'
                            })
                        } else {
                            folder.validFiles.push(file)
                        }

                        resolve()
                    })
                })
            } else if (entry.isDirectory) {
                const newFolderPath = folderPath ? `${folderPath}/${entry.name}` : entry.name

                return new Promise((resolve) => {
                    const reader = entry.createReader()
                    const readEntries = async () => {
                        reader.readEntries(async (entries) => {
                            if (entries.length === 0) {
                                resolve()
                                return
                            }

                            await Promise.all(
                                entries.map(subEntry => processEntry(subEntry, newFolderPath))
                            )

                            // Continue reading if there are more entries
                            await readEntries()
                        })
                    }
                    readEntries()
                })
            }
        }

        // Process all dropped items
        await Promise.all(
            Array.from(items).map(item => {
                const entry = item.webkitGetAsEntry()
                if (entry) {
                    return processEntry(entry)
                }
                return Promise.resolve()
            })
        )

        return { folderStructure, errors }
    }

    // Create folders and upload files
    const createFoldersAndUpload = async (folderStructure) => {
        const results = {
            created: [],
            failed: [],
            uploaded: 0,
            errors: 0
        }

        for (const [folderPath, folderData] of folderStructure) {
            if (folderPath === 'root') continue // Skip root level files

            try {
                // Extract the folder name (last part of the path)
                const folderName = folderPath.split('/').pop()

                // Create the folder
                const createResponse = await fetch('/api/folders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: folderName,
                        description: `Auto-created from folder: ${folderPath}`,
                        projectId
                    })
                })

                if (!createResponse.ok) {
                    throw new Error(`Failed to create folder: ${folderName}`)
                }

                const newFolder = await createResponse.json()
                results.created.push(newFolder)

                // Upload valid files to this folder
                if (folderData.validFiles.length > 0) {
                    const uploadPromises = folderData.validFiles.map(async (file) => {
                        const formData = new FormData()
                        formData.append("files", file)
                        formData.append("folderId", newFolder.id)

                        try {
                            const uploadResponse = await fetch('/api/upload', {
                                method: 'POST',
                                body: formData
                            })

                            if (uploadResponse.ok) {
                                results.uploaded++
                                return await uploadResponse.json()
                            } else {
                                throw new Error(`Failed to upload ${file.name}`)
                            }
                        } catch (error) {
                            results.errors++
                            console.error(`Upload error for ${file.name}:`, error)
                            return null
                        }
                    })

                    await Promise.all(uploadPromises)
                }

            } catch (error) {
                console.error(`Error creating folder ${folderPath}:`, error)
                results.failed.push({
                    folderPath,
                    error: error.message,
                    folderData
                })
            }
        }

        return results
    }

    const handleDragOver = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()

        if (!isEnabled || isProcessing) return

        setIsDragOver(true)
    }, [isEnabled, isProcessing])

    const handleDragLeave = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()

        // Only hide drag state if we're leaving the drop zone entirely
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsDragOver(false)
        }
    }, [])

    const handleDrop = useCallback(async (e) => {
        e.preventDefault()
        e.stopPropagation()

        if (!isEnabled || isProcessing) return

        setIsDragOver(false)
        setIsProcessing(true)

        try {
            const items = e.dataTransfer.items

            if (!items || items.length === 0) {
                toast.warning("No Files", "No folders or files were detected")
                return
            }

            // Check if any of the items are directories
            const hasDirectories = Array.from(items).some(item => {
                const entry = item.webkitGetAsEntry()
                return entry && entry.isDirectory
            })

            if (!hasDirectories) {
                toast.warning("No Folders", "Please drag folders to auto-create project folders")
                return
            }

            toast.info("Processing", "Analyzing dropped folders and files...")

            // Process the dropped items
            const { folderStructure, errors } = await processDroppedItems(items)

            if (folderStructure.size === 0) {
                toast.warning("No Valid Folders", "No valid folders with supported files were found")
                return
            }

            // Create folders and upload files
            const results = await createFoldersAndUpload(folderStructure)

            // Show results
            if (results.created.length > 0) {
                const message = `Created ${results.created.length} folders and uploaded ${results.uploaded} files`
                if (results.errors > 0) {
                    toast.warning("Partial Success", `${message}. ${results.errors} files failed to upload.`)
                } else {
                    toast.success("Folders Created", message)
                }

                // Notify parent component about the new folders
                onFoldersCreated?.(results.created)
            }

            if (results.failed.length > 0) {
                toast.error("Some Folders Failed", `Failed to create ${results.failed.length} folders`)
            }

        } catch (error) {
            console.error('Error processing folder drop:', error)
            toast.error("Processing Failed", "Failed to process dropped folders")
        } finally {
            setIsProcessing(false)
        }
    }, [isEnabled, isProcessing, projectId, onFoldersCreated, toast])

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative ${isDragOver ? 'ring-2 ring-blue-500 ring-offset-2' : ''} ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
        >
            {children}

            {/* Drag overlay */}
            {isDragOver && (
                <div className="absolute inset-0 bg-blue-500 bg-opacity-10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-10">
                    <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-blue-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                        <p className="text-blue-700 font-medium">Drop folders here to create project folders</p>
                        <p className="text-blue-600 text-sm">Each folder will become a project folder with its files</p>
                    </div>
                </div>
            )}

            {/* Processing overlay */}
            {isProcessing && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-20 rounded-lg">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-gray-700 font-medium">Creating folders and uploading files...</p>
                    </div>
                </div>
            )}
        </div>
    )
}