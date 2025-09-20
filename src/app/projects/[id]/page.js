"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, use } from "react"
import { useDropzone } from "react-dropzone"
import Link from "next/link"

export default function ProjectPage({ params }) {
    const resolvedParams = use(params)
    const { data: session, status } = useSession()
    const router = useRouter()
    const [project, setProject] = useState(null)
    const [folders, setFolders] = useState([])
    const [selectedFolder, setSelectedFolder] = useState(null)
    const [files, setFiles] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [showNewFolderModal, setShowNewFolderModal] = useState(false)
    const [showShareModal, setShowShareModal] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState({ type: null, item: null, isDeleting: false })
    const [deleteProjectConfirm, setDeleteProjectConfirm] = useState({ isDeleting: false, show: false })
    const [shares, setShares] = useState([])
    const [newShareForm, setNewShareForm] = useState({
        canSelect: true,
        canComment: true,
        canDownload: false,
        expiresAt: ''
    })
    const [isCreating, setIsCreating] = useState(false)
    const [selectedFile, setSelectedFile] = useState(null)
    const [showImageModal, setShowImageModal] = useState(false)
    const [selections, setSelections] = useState({})
    const [selectionStats, setSelectionStats] = useState({ selected: 0, rejected: 0, pending: 0, total: 0 })
    const [selectionFilter, setSelectionFilter] = useState('all') // 'all', 'selected', 'rejected', 'pending'

    const handleImageClick = (file) => {
        setSelectedFile(file)
        setShowImageModal(true)
    }

    const handleComment = async (fileId, content) => {
        try {
            const response = await fetch(`/api/files/${fileId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: content.trim()
                })
            })

            if (!response.ok) {
                console.error('Failed to submit comment:', response.statusText)
                throw new Error('Failed to submit comment')
            }

            return await response.json()
        } catch (error) {
            console.error("Error submitting comment:", error)
            throw error
        }
    }

    const fetchSelections = async (folderId = null) => {
        if (!project?.id) return

        try {
            const response = await fetch(`/api/projects/${project.id}/selections`)
            if (response.ok) {
                const data = await response.json()
                setSelections(data.selections)
                
                // Calculate stats based on current folder's files
                if (folderId && files.length > 0) {
                    calculateFolderSelectionStats(data.selections, files)
                } else {
                    setSelectionStats(data.stats)
                }
            } else {
                console.error('Failed to fetch selections:', response.statusText)
            }
        } catch (error) {
            console.error('Error fetching selections:', error)
        }
    }

    useEffect(() => {
        if (status === "authenticated" && resolvedParams.id) {
            fetchProject()
        } else if (status === "unauthenticated") {
            router.push("/auth/signin")
        }
    }, [status, resolvedParams.id])

    useEffect(() => {
        if (project?.id) {
            fetchShares()
            fetchSelections(selectedFolder?.id)
        }
    }, [project?.id, selectedFolder?.id])

    const calculateFolderSelectionStats = (allSelections, currentFiles) => {
        let selected = 0, rejected = 0, pending = 0
        
        currentFiles.forEach(file => {
            const selectionStatus = getFileSelectionStatusFromData(file.id, allSelections)
            switch (selectionStatus.status) {
                case 'SELECTED':
                    selected++
                    break
                case 'REJECTED':
                    rejected++
                    break
                case 'PENDING':
                default:
                    pending++
                    break
            }
        })
        
        setSelectionStats({
            selected,
            rejected,
            pending,
            total: currentFiles.length
        })
    }

    const getFileSelectionStatusFromData = (fileId, allSelections) => {
        const fileSelections = allSelections[fileId]
        if (!fileSelections || fileSelections.length === 0) {
            return { status: 'PENDING', count: 0, users: [] }
        }

        // Get the most recent selection for each user
        const userSelections = {}
        fileSelections.forEach(selection => {
            const userId = selection.user._id
            if (!userSelections[userId] || new Date(selection.updatedAt) > new Date(userSelections[userId].updatedAt)) {
                userSelections[userId] = selection
            }
        })

        const currentSelections = Object.values(userSelections)
        const selectedCount = currentSelections.filter(s => s.status === 'SELECTED').length
        const rejectedCount = currentSelections.filter(s => s.status === 'REJECTED').length

        // Determine overall status
        let overallStatus = 'PENDING'
        if (selectedCount > 0 && rejectedCount === 0) {
            overallStatus = 'SELECTED'
        } else if (rejectedCount > 0 && selectedCount === 0) {
            overallStatus = 'REJECTED'
        } else if (selectedCount > 0 && rejectedCount > 0) {
            overallStatus = 'MIXED' // Some users selected, some rejected
        }

        return {
            status: overallStatus,
            count: currentSelections.length,
            users: currentSelections,
            selectedCount,
            rejectedCount
        }
    }

    const getFileSelectionStatus = (fileId) => {
        const fileSelections = selections[fileId]
        if (!fileSelections || fileSelections.length === 0) {
            return { status: 'PENDING', count: 0, users: [] }
        }

        // Get the most recent selection for each user
        const userSelections = {}
        fileSelections.forEach(selection => {
            const userId = selection.user._id
            if (!userSelections[userId] || new Date(selection.updatedAt) > new Date(userSelections[userId].updatedAt)) {
                userSelections[userId] = selection
            }
        })

        const currentSelections = Object.values(userSelections)
        const selectedCount = currentSelections.filter(s => s.status === 'SELECTED').length
        const rejectedCount = currentSelections.filter(s => s.status === 'REJECTED').length

        // Determine overall status
        let overallStatus = 'PENDING'
        if (selectedCount > 0 && rejectedCount === 0) {
            overallStatus = 'SELECTED'
        } else if (rejectedCount > 0 && selectedCount === 0) {
            overallStatus = 'REJECTED'
        } else if (selectedCount > 0 && rejectedCount > 0) {
            overallStatus = 'MIXED' // Some users selected, some rejected
        }

        return {
            status: overallStatus,
            count: currentSelections.length,
            users: currentSelections,
            selectedCount,
            rejectedCount
        }
    }

    const getFilteredFiles = () => {
        if (selectionFilter === 'all') {
            return files
        }

        return files.filter(file => {
            const selectionStatus = getFileSelectionStatus(file.id)

            switch (selectionFilter) {
                case 'selected':
                    return selectionStatus.status === 'SELECTED'
                case 'rejected':
                    return selectionStatus.status === 'REJECTED'
                case 'pending':
                    return selectionStatus.status === 'PENDING'
                case 'mixed':
                    return selectionStatus.status === 'MIXED'
                default:
                    return true
            }
        })
    }

    const fetchProject = async () => {
        try {
            const response = await fetch(`/api/projects/${resolvedParams.id}`)
            if (response.ok) {
                const data = await response.json()
                setProject(data)
                setFolders(data.folders || [])
                if (data.folders && data.folders.length > 0) {
                    setSelectedFolder(data.folders[0])
                    fetchFiles(data.folders[0].id)
                }
            } else if (response.status === 404) {
                router.push("/dashboard")
            }
        } catch (error) {
            console.error("Error fetching project:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchFiles = async (folderId) => {
        try {
            const response = await fetch(`/api/folders/${folderId}/files`)
            if (response.ok) {
                const data = await response.json()
                setFiles(data)
                // Recalculate selection stats for this folder's files
                if (Object.keys(selections).length > 0) {
                    calculateFolderSelectionStats(selections, data)
                }
            }
        } catch (error) {
            console.error("Error fetching files:", error)
        }
    }

    const onDrop = async (acceptedFiles) => {
        if (!selectedFolder) {
            alert("Please select a folder first")
            return
        }

        setUploading(true)
        const formData = new FormData()

        acceptedFiles.forEach((file) => {
            formData.append("files", file)
        })
        formData.append("folderId", selectedFolder.id)

        try {
            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData
            })

            if (response.ok) {
                const uploadedFiles = await response.json()
                setFiles([...files, ...uploadedFiles])
            } else {
                alert("Upload failed. Please try again.")
            }
        } catch (error) {
            console.error("Upload error:", error)
            alert("Upload failed. Please try again.")
        } finally {
            setUploading(false)
        }
    }

    const deleteFolder = async (folder) => {
        setDeleteConfirm({ ...deleteConfirm, isDeleting: true })

        try {
            const response = await fetch(`/api/folders/${folder.id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                const result = await response.json()

                // Refresh the entire folder list to ensure child folders are also removed
                await fetchProject()

                // If this was the selected folder, clear selection
                if (selectedFolder?.id === folder.id) {
                    setSelectedFolder(null)
                    setFiles([])
                }

                setDeleteConfirm({ type: null, item: null, isDeleting: false })

                // Show success message
                alert(`Folder "${folder.name}" and ${result.deletedFiles} files deleted successfully`)
            } else {
                const error = await response.json()
                alert(`Failed to delete folder: ${error.error}`)
                setDeleteConfirm({ ...deleteConfirm, isDeleting: false })
            }
        } catch (error) {
            console.error('Error deleting folder:', error)
            alert('Failed to delete folder. Please try again.')
            setDeleteConfirm({ ...deleteConfirm, isDeleting: false })
        }
    }

    const deleteFile = async (file) => {
        setDeleteConfirm({ ...deleteConfirm, isDeleting: true })

        try {
            const response = await fetch(`/api/files/${file.id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                // Remove file from state
                setFiles(files.filter(f => f.id !== file.id))
                setDeleteConfirm({ type: null, item: null, isDeleting: false })
            } else {
                const error = await response.json()
                alert(`Failed to delete file: ${error.error}`)
                setDeleteConfirm({ ...deleteConfirm, isDeleting: false })
            }
        } catch (error) {
            console.error('Error deleting file:', error)
            alert('Failed to delete file. Please try again.')
            setDeleteConfirm({ ...deleteConfirm, isDeleting: false })
        }
    }

    const deleteProject = async () => {
        setDeleteProjectConfirm({ ...deleteProjectConfirm, isDeleting: true })

        try {
            const response = await fetch(`/api/projects/${project.id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                const result = await response.json()

                // Redirect to dashboard after successful deletion
                router.push('/dashboard')

                // Note: We can't show an alert after redirect, but the user will see the project is gone
            } else {
                const error = await response.json()
                alert(`Failed to delete project: ${error.message}`)
                setDeleteProjectConfirm({ isDeleting: false, show: true })
            }
        } catch (error) {
            console.error('Error deleting project:', error)
            alert('Failed to delete project. Please try again.')
            setDeleteProjectConfirm({ isDeleting: false, show: true })
        }
    }

    const deleteShare = async (shareId) => {
        if (!shareId) {
            console.error('Share ID is required for deletion')
            return
        }

        if (!confirm('Are you sure you want to delete this share link?')) {
            return
        }

        try {
            const response = await fetch(`/api/projects/${project.id}/shares/${shareId}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                // Remove the deleted share from the shares array
                setShares(shares.filter(share => {
                    const shareIdToCompare = share._id?.toString() || share.id
                    return shareIdToCompare !== shareId
                }))
                alert('Share link deleted successfully')
            } else {
                const error = await response.json()
                alert(`Failed to delete share: ${error.message}`)
            }
        } catch (error) {
            console.error('Error deleting share:', error)
            alert('Failed to delete share. Please try again.')
        }
    }

    const fetchShares = async () => {
        if (!project?.id) return

        try {
            const response = await fetch(`/api/projects/${project.id}/shares`)
            if (response.ok) {
                const sharesData = await response.json()
                setShares(sharesData)
            } else {
                console.error('Failed to fetch shares')
            }
        } catch (error) {
            console.error('Error fetching shares:', error)
        }
    }

    const createShare = async (e) => {
        e.preventDefault()
        setIsCreating(true)

        try {
            const response = await fetch(`/api/projects/${project.id}/shares`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newShareForm)
            })

            if (response.ok) {
                const newShare = await response.json()
                setShares([newShare, ...shares])
                setNewShareForm({
                    canSelect: true,
                    canComment: true,
                    canDownload: false,
                    expiresAt: ''
                })
                alert('Share link created successfully!')
            } else {
                const error = await response.json()
                alert(`Failed to create share: ${error.message}`)
            }
        } catch (error) {
            console.error('Error creating share:', error)
            alert('Failed to create share. Please try again.')
        } finally {
            setIsCreating(false)
        }
    }

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
            'video/*': ['.mp4', '.mov', '.avi']
        },
        multiple: true
    })

    if (status === "loading" || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (!project) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900">Project not found</h3>
                    <Link href="/dashboard" className="text-blue-600 hover:text-blue-500">
                        Return to dashboard
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 mr-4">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
                                {project.description && (
                                    <p className="text-sm text-gray-600">{project.description}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => setShowNewFolderModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center"
                            >
                                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                New Folder
                            </button>
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg flex items-center"
                            >
                                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                </svg>
                                Share Project
                            </button>
                            <button
                                onClick={() => setDeleteProjectConfirm({ isDeleting: false, show: true })}
                                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded-lg flex items-center"
                                title="Delete entire project"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Folders Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Folders</h3>

                            {folders.length === 0 ? (
                                <div className="text-center py-8">
                                    <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                    </svg>
                                    <p className="mt-2 text-sm text-gray-500">No folders yet</p>
                                    <button
                                        onClick={() => setShowNewFolderModal(true)}
                                        className="mt-2 text-blue-600 hover:text-blue-500 text-sm font-medium"
                                    >
                                        Create first folder
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {folders.map((folder) => (
                                        <div key={folder.id} className={`relative group rounded-md transition-colors ${selectedFolder?.id === folder.id
                                            ? "bg-blue-100 text-blue-700"
                                            : "text-gray-700 hover:bg-gray-100"
                                            }`}>
                                            <button
                                                onClick={() => {
                                                    setSelectedFolder(folder)
                                                    fetchFiles(folder.id)
                                                }}
                                                className="w-full text-left px-3 py-2"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center">
                                                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                                        </svg>
                                                        <span className="text-sm font-medium truncate">{folder.name}</span>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500 ml-7 mt-1">
                                                    {folder._count?.files || 0} files
                                                </p>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setDeleteConfirm({ type: 'folder', item: folder, isDeleting: false })
                                                }}
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                                                title="Delete folder and all its contents"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        {selectedFolder ? (
                            <div className="space-y-6">
                                {/* Upload Area */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                                        Upload to "{selectedFolder.name}"
                                    </h3>

                                    <div
                                        {...getRootProps()}
                                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragActive
                                            ? "border-blue-400 bg-blue-50"
                                            : "border-gray-300 hover:border-gray-400"
                                            }`}
                                    >
                                        <input {...getInputProps()} />
                                        <svg
                                            className="mx-auto h-12 w-12 text-gray-400"
                                            stroke="currentColor"
                                            fill="none"
                                            viewBox="0 0 48 48"
                                        >
                                            <path
                                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                                strokeWidth={2}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                        <div className="mt-4">
                                            <p className="text-lg font-medium text-gray-900">
                                                {isDragActive ? "Drop files here" : "Drag & drop files here"}
                                            </p>
                                            <p className="text-sm text-gray-500 mt-1">
                                                or click to browse • JPG, PNG, GIF, MP4, MOV up to 50MB each
                                            </p>
                                        </div>
                                        {uploading && (
                                            <div className="mt-4">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                                <p className="text-sm text-gray-500 mt-2">Uploading...</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Files Grid */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-medium text-gray-900">
                                            Files ({getFilteredFiles().length})
                                        </h3>

                                        {/* Selection Stats */}
                                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                                            <span className="flex items-center">
                                                <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                                                Selected: {selectionStats.selected}
                                            </span>
                                            <span className="flex items-center">
                                                <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                                                Rejected: {selectionStats.rejected}
                                            </span>
                                            <span className="flex items-center">
                                                <div className="w-3 h-3 bg-gray-400 rounded-full mr-1"></div>
                                                Pending: {selectionStats.pending}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Selection Filter */}
                                    <div className="mb-4">
                                        <div className="flex space-x-2">
                                            {[
                                                { key: 'all', label: 'All Files' },
                                                { key: 'selected', label: 'Selected' },
                                                { key: 'rejected', label: 'Rejected' },
                                                { key: 'pending', label: 'Pending' },
                                                { key: 'mixed', label: 'Mixed' }
                                            ].map(filter => (
                                                <button
                                                    key={filter.key}
                                                    onClick={() => setSelectionFilter(filter.key)}
                                                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${selectionFilter === filter.key
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {filter.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {getFilteredFiles().length === 0 ? (
                                        <div className="text-center py-8">
                                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <p className="mt-2 text-sm text-gray-500">
                                                {selectionFilter === 'all' ? 'No files in this folder' : `No ${selectionFilter} files`}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {selectionFilter === 'all' ? 'Upload some files to get started' : 'Try a different filter'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {getFilteredFiles().map((file) => (
                                                <FileCard
                                                    key={file.id}
                                                    file={file}
                                                    selectionStatus={getFileSelectionStatus(file.id)}
                                                    onDelete={(file) => setDeleteConfirm({ type: 'file', item: file, isDeleting: false })}
                                                    onClick={handleImageClick}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow p-8 text-center">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900">Select a folder</h3>
                                <p className="mt-1 text-sm text-gray-500">Choose a folder from the sidebar to view and manage files</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Image Modal */}
            {showImageModal && selectedFile && (
                <ImageModal
                    file={selectedFile}
                    onClose={() => setShowImageModal(false)}
                    onComment={handleComment}
                    permissions={{
                        canComment: true,
                        canDownload: true,
                        canSelect: false
                    }}
                    isClient={false}
                    shareToken={null}
                />
            )}

            {/* Share Project Modal */}
            {showShareModal && (
                <ShareProjectModal
                    project={project}
                    onClose={() => setShowShareModal(false)}
                />
            )}

            {/* New Folder Modal */}
            {showNewFolderModal && (
                <NewFolderModal
                    projectId={project.id}
                    onClose={() => setShowNewFolderModal(false)}
                    onFolderCreated={(newFolder) => {
                        setFolders([...folders, newFolder])
                        setShowNewFolderModal(false)
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm.type && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Delete {deleteConfirm.type === 'folder' ? 'Folder' : 'File'}
                                </h3>
                                <button
                                    onClick={() => setDeleteConfirm({ type: null, item: null, isDeleting: false })}
                                    className="text-gray-400 hover:text-gray-600"
                                    disabled={deleteConfirm.isDeleting}
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="mb-4">
                                <p className="text-sm text-gray-700">
                                    Are you sure you want to delete{" "}
                                    <span className="font-medium">
                                        {deleteConfirm.type === 'folder' ? deleteConfirm.item?.name : deleteConfirm.item?.originalName}
                                    </span>
                                    ?
                                </p>
                                {deleteConfirm.type === 'folder' && (
                                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                                        <p className="text-sm text-red-800 font-medium mb-1">
                                            ⚠️ This will permanently delete:
                                        </p>
                                        <ul className="text-sm text-red-700 ml-4 list-disc">
                                            <li>The folder "{deleteConfirm.item?.name}"</li>
                                            <li>All {deleteConfirm.item?._count?.files || 0} files in this folder</li>
                                            <li>Any subfolders and their contents</li>
                                        </ul>
                                        <p className="text-sm text-red-800 font-medium mt-2">
                                            This action cannot be undone!
                                        </p>
                                    </div>
                                )}
                                {deleteConfirm.type === 'file' && (
                                    <p className="text-sm text-red-600 mt-2">
                                        This action cannot be undone.
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setDeleteConfirm({ type: null, item: null, isDeleting: false })}
                                    disabled={deleteConfirm.isDeleting}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (deleteConfirm.type === 'folder') {
                                            deleteFolder(deleteConfirm.item)
                                        } else {
                                            deleteFile(deleteConfirm.item)
                                        }
                                    }}
                                    disabled={deleteConfirm.isDeleting}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                                >
                                    {deleteConfirm.isDeleting ? "Deleting..." : "Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Project Confirmation Modal */}
            {deleteProjectConfirm.show && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Delete Entire Project
                                </h3>
                                <button
                                    onClick={() => setDeleteProjectConfirm({ isDeleting: false, show: false })}
                                    className="text-gray-400 hover:text-gray-600"
                                    disabled={deleteProjectConfirm.isDeleting}
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="mb-4">
                                <p className="text-sm text-gray-700">
                                    Are you sure you want to delete the entire project{" "}
                                    <span className="font-medium">"{project?.title}"</span>
                                    ?
                                </p>
                                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                                    <p className="text-sm text-red-800 font-medium mb-1">
                                        ⚠️ This will permanently delete:
                                    </p>
                                    <ul className="text-sm text-red-700 ml-4 list-disc">
                                        <li>The entire project "{project?.title}"</li>
                                        <li>All {folders?.length || 0} folders</li>
                                        <li>All files in all folders</li>
                                        <li>All project shares and settings</li>
                                    </ul>
                                    <p className="text-sm text-red-800 font-medium mt-2">
                                        This action cannot be undone!
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setDeleteProjectConfirm({ isDeleting: false, show: false })}
                                    disabled={deleteProjectConfirm.isDeleting}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={deleteProject}
                                    disabled={deleteProjectConfirm.isDeleting}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                                >
                                    {deleteProjectConfirm.isDeleting ? "Deleting..." : "Delete Project"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function ImageModal({
    file,
    onClose,
    onComment,
    permissions,
    isClient,
    shareToken = null
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

    const fetchComments = async () => {
        setIsLoadingComments(true)
        try {
            let response
            if (shareToken) {
                // For shared gallery
                response = await fetch(`/api/gallery/${shareToken}/comments?fileId=${file.id}`)
            } else {
                // For project owner
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
            if (shareToken) {
                // For shared gallery
                const response = await fetch(`/api/gallery/${shareToken}/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fileId: file.id,
                        content: comment.trim()
                    })
                })

                if (response.ok) {
                    const newComment = await response.json()
                    setComments([newComment, ...comments])
                    setComment("")
                    setShowCommentForm(false)
                } else {
                    console.error('Failed to submit comment:', response.statusText)
                }
            } else {
                // For project owner - use onComment callback
                await onComment?.(file.id, comment.trim())
                // Refresh comments after adding
                await fetchComments()
                setComment("")
                setShowCommentForm(false)
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
                            {permissions.canComment && (
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

                                    {/* Comments display */}
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



function NewFolderModal({ projectId, onClose, onFolderCreated }) {
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError("")

        try {
            const response = await fetch("/api/folders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || null,
                    projectId
                })
            })

            if (response.ok) {
                const newFolder = await response.json()
                onFolderCreated(newFolder)
            } else {
                const errorData = await response.json()
                setError(errorData.message || "Failed to create folder")
            }
        } catch (error) {
            setError("An error occurred. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Create New Folder</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 ">
                                Folder Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                                placeholder="e.g., Raw Shots, Edited, Final"
                            />
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                Description (Optional)
                            </label>
                            <textarea
                                id="description"
                                rows={2}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                                placeholder="Folder description"
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                            >
                                {isSubmitting ? "Creating..." : "Create Folder"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

function FileCard({ file, onDelete, onClick, selectionStatus }) {
    const isVideo = file.mimeType.startsWith('video/')

    const getStatusColor = (status) => {
        switch (status) {
            case 'SELECTED':
                return 'border-green-500 bg-green-50'
            case 'REJECTED':
                return 'border-red-500 bg-red-50'
            case 'MIXED':
                return 'border-yellow-500 bg-yellow-50'
            case 'PENDING':
            default:
                return 'border-gray-200 bg-gray-50'
        }
    }

    const getStatusBadge = (selectionStatus) => {
        if (!selectionStatus || selectionStatus.status === 'PENDING') {
            return null
        }

        return (
            <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${selectionStatus.status === 'SELECTED'
                ? 'bg-green-500 text-white'
                : selectionStatus.status === 'REJECTED'
                    ? 'bg-red-500 text-white'
                    : selectionStatus.status === 'MIXED'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-500 text-white'
                }`}>
                {selectionStatus.status === 'SELECTED' && `✓ ${selectionStatus.selectedCount}`}
                {selectionStatus.status === 'REJECTED' && `✗ ${selectionStatus.rejectedCount}`}
                {selectionStatus.status === 'MIXED' && `✓${selectionStatus.selectedCount} ✗${selectionStatus.rejectedCount}`}
            </div>
        )
    }

    return (
        <div className="relative group">
            <div
                className={`aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${selectionStatus ? getStatusColor(selectionStatus.status) : 'border-gray-200 bg-gray-50'
                    }`}
                onClick={() => onClick?.(file)}
            >
                {isVideo ? (
                    <video
                        src={file.url}
                        className="w-full h-full object-cover"
                        muted
                        onMouseEnter={(e) => e.target.play()}
                        onMouseLeave={(e) => e.target.pause()}
                    />
                ) : (
                    <img
                        src={file.thumbnailUrl || file.url}
                        alt={file.originalName}
                        className="w-full h-full object-cover"
                    />
                )}

                {/* Selection Status Badge */}
                {getStatusBadge(selectionStatus)}

                {/* Action buttons container */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity space-y-1">
                    {/* Download button */}
                    <a
                        href={`/api/download/${file.id}`}
                        className="block bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1"
                        title="Download file"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </a>

                    {/* Delete button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete(file)
                        }}
                        className="block bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                        title="Delete file"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
            <div className="mt-2">
                <p className="text-xs text-gray-900 truncate" title={file.originalName}>
                    {file.originalName}
                </p>
                <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                    </p>
                    {selectionStatus && selectionStatus.count > 0 && (
                        <p className="text-xs text-gray-500">
                            {selectionStatus.count} user{selectionStatus.count !== 1 ? 's' : ''}
                        </p>
                    )}
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

function ShareProjectModal({ project, onClose }) {
    const [shares, setShares] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [showEmailForm, setShowEmailForm] = useState(false)
    const [emailForm, setEmailForm] = useState({
        email: "",
        message: "",
        shareToken: ""
    })
    const [isSendingEmail, setIsSendingEmail] = useState(false)
    const [newShareForm, setNewShareForm] = useState({
        email: "",
        canSelect: true,
        canComment: true,
        canDownload: false,
        expiresAt: ""
    })

    useEffect(() => {
        fetchShares()
    }, [])

    const fetchShares = async () => {
        try {
            const response = await fetch(`/api/projects/${project.id}/shares`)
            if (response.ok) {
                const data = await response.json()
                setShares(data)
            }
        } catch (error) {
            console.error("Error fetching shares:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const createShare = async (e) => {
        e.preventDefault()
        setIsCreating(true)

        try {
            const response = await fetch(`/api/projects/${project.id}/shares`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: newShareForm.email || null,
                    canSelect: newShareForm.canSelect,
                    canComment: newShareForm.canComment,
                    canDownload: newShareForm.canDownload,
                    expiresAt: newShareForm.expiresAt || null
                })
            })

            if (response.ok) {
                const newShare = await response.json()
                setShares([newShare, ...shares])
                setNewShareForm({
                    email: "",
                    canSelect: true,
                    canComment: true,
                    canDownload: false,
                    expiresAt: ""
                })
            }
        } catch (error) {
            console.error("Error creating share:", error)
        } finally {
            setIsCreating(false)
        }
    }

    const copyToClipboard = (url) => {
        navigator.clipboard.writeText(url)
        alert("Link copied to clipboard!")
    }

    const sendEmailInvitation = async (e) => {
        e.preventDefault()
        setIsSendingEmail(true)

        try {
            const response = await fetch(`/api/projects/${project.id}/invite`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(emailForm)
            })

            if (response.ok) {
                const result = await response.json()
                alert(result.message)
                setShowEmailForm(false)
                setEmailForm({ email: "", message: "", shareToken: "" })
            }
        } catch (error) {
            console.error("Error sending invitation:", error)
            alert("Failed to send invitation")
        } finally {
            setIsSendingEmail(false)
        }
    }

    const deleteShare = async (shareId) => {
        if (!confirm("Are you sure you want to delete this share link?")) return

        try {
            const response = await fetch(`/api/projects/${project.id}/shares/${shareId}`, {
                method: "DELETE"
            })

            if (response.ok) {
                setShares(shares.filter(share => share.id !== shareId))
            }
        } catch (error) {
            console.error("Error deleting share:", error)
        }
    }

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-medium text-gray-900">Share "{project.title}"</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Create New Share */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-4">Create New Share Link</h4>
                        <form onSubmit={createShare} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address (Optional)
                                </label>
                                <input
                                    type="email"
                                    value={newShareForm.email}
                                    onChange={(e) => setNewShareForm({ ...newShareForm, email: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="client@example.com (leave empty for public link)"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Leave empty to create a public shareable link, or enter an email to restrict access to that specific client.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={newShareForm.canSelect}
                                        onChange={(e) => setNewShareForm({ ...newShareForm, canSelect: e.target.checked })}
                                        className="mr-2"
                                    />
                                    <span className="text-sm text-gray-900">Can Select</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={newShareForm.canComment}
                                        onChange={(e) => setNewShareForm({ ...newShareForm, canComment: e.target.checked })}
                                        className="mr-2"
                                    />
                                    <span className="text-sm text-gray-900">Can Comment</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={newShareForm.canDownload}
                                        onChange={(e) => setNewShareForm({ ...newShareForm, canDownload: e.target.checked })}
                                        className="mr-2"
                                    />
                                    <span className="text-sm text-gray-900">Can Download</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium  text-gray-700 mb-1">
                                    Expires At (Optional)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={newShareForm.expiresAt}
                                    onChange={(e) => setNewShareForm({ ...newShareForm, expiresAt: e.target.value })}
                                    className="w-full border border-gray-300 placeholder:text-gray-900 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isCreating}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
                            >
                                {isCreating ? "Creating..." : "Create Share Link"}
                            </button>
                        </form>
                    </div>

                    {/* Existing Shares */}
                    <div>
                        <h4 className="font-medium text-gray-900 mb-4">Existing Share Links</h4>
                        {isLoading ? (
                            <div className="text-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                            </div>
                        ) : shares.length === 0 ? (
                            <p className="text-gray-500 text-sm">No share links created yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {shares.map((share) => (
                                    <div key={share._id?.toString() || share.id} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <span className="text-xs font-medium text-gray-500 truncate">
                                                        {window.location.origin}/gallery/{share.token}
                                                    </span>
                                                    <button
                                                        onClick={() => copyToClipboard(`${window.location.origin}/gallery/${share.token}`)}
                                                        className="text-blue-600 hover:text-blue-500 text-xs flex-shrink-0"
                                                    >
                                                        Copy
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                                                    <span>Select: {share.canSelect ? "✓" : "✗"}</span>
                                                    <span>Comment: {share.canComment ? "✓" : "✗"}</span>
                                                    <span>Download: {share.canDownload ? "✓" : "✗"}</span>
                                                    {share.expiresAt && (
                                                        <span>Expires: {new Date(share.expiresAt).toLocaleDateString()}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex space-x-2 flex-shrink-0">
                                                <button
                                                    onClick={() => {
                                                        setEmailForm({ ...emailForm, shareToken: share.token })
                                                        setShowEmailForm(true)
                                                    }}
                                                    className="text-blue-600 hover:text-blue-500 text-sm px-2 py-1"
                                                >
                                                    Email
                                                </button>
                                                <button
                                                    onClick={() => deleteShare(share._id?.toString() || share.id)}
                                                    className="text-red-600 hover:text-red-500 text-sm px-2 py-1"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Email Invitation Modal */}
                    {showEmailForm && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                            <div className="bg-white rounded-lg p-6 w-96">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-medium text-gray-900">Send Email Invitation</h4>
                                    <button
                                        onClick={() => setShowEmailForm(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <form onSubmit={sendEmailInvitation} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={emailForm.email}
                                            onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="client@example.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Personal Message (Optional)
                                        </label>
                                        <textarea
                                            value={emailForm.message}
                                            onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                                            rows={3}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Hi! I'm sharing this gallery with you..."
                                        />
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button
                                            type="submit"
                                            disabled={isSendingEmail}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
                                        >
                                            {isSendingEmail ? "Sending..." : "Send Invitation"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowEmailForm(false)}
                                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}


