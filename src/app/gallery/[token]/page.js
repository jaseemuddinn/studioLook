"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, use } from "react"
import GalleryView from "@/components/GalleryView"
import Link from "next/link"

export default function SharedGallery({ params }) {
    const resolvedParams = use(params)
    const { data: session, status } = useSession()
    const router = useRouter()
    const [project, setProject] = useState(null)
    const [files, setFiles] = useState([])
    const [selections, setSelections] = useState({})
    const [permissions, setPermissions] = useState({})
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")
    const [joinStatus, setJoinStatus] = useState({ hasJoined: false, canJoin: true })
    const [isJoining, setIsJoining] = useState(false)

    useEffect(() => {
        // Only fetch data if user is authenticated
        if (status === "authenticated" && resolvedParams.token) {
            fetchSharedProject()
        } else if (status === "unauthenticated") {
            setIsLoading(false) // Stop loading to show login prompt
        }
    }, [status, resolvedParams.token])

    useEffect(() => {
        if (session?.user && project) {
            fetchUserSelections()
            if (session.user.role === "CLIENT") {
                fetchJoinStatus()
            }
        }
    }, [session, project])

    const fetchSharedProject = async () => {
        try {
            const response = await fetch(`/api/gallery/${resolvedParams.token}`)
            if (response.ok) {
                const data = await response.json()
                setProject(data.project)
                setFiles(data.files)
                setPermissions(data.permissions)
            } else {
                setError("Gallery not found or access denied")
            }
        } catch (error) {
            console.error("Error fetching shared project:", error)
            setError("Failed to load gallery")
        } finally {
            setIsLoading(false)
        }
    }

    const fetchUserSelections = async () => {
        if (!session?.user) return

        try {
            const response = await fetch(`/api/gallery/${resolvedParams.token}/selections`)
            if (response.ok) {
                const userSelections = await response.json()
                const selectionsMap = {}
                userSelections.forEach(selection => {
                    selectionsMap[selection.fileId] = selection
                })
                setSelections(selectionsMap)
            }
        } catch (error) {
            console.error("Error fetching selections:", error)
        }
    }

    const fetchJoinStatus = async () => {
        try {
            const response = await fetch(`/api/gallery/${resolvedParams.token}/status`)
            if (response.ok) {
                const status = await response.json()
                setJoinStatus(status)
            } else {
                console.error("Join status error:", response.status)
            }
        } catch (error) {
            console.error("Error fetching join status:", error)
        }
    }

    const handleJoinGallery = async () => {
        setIsJoining(true)
        try {
            const response = await fetch(`/api/gallery/${resolvedParams.token}/join`, {
                method: "POST"
            })

            if (response.ok) {
                setJoinStatus({ hasJoined: true, canJoin: false })
                // Optional: Show success message
            } else {
                const errorData = await response.json()
                setError(errorData.message || "Failed to join gallery")
            }
        } catch (error) {
            console.error("Error joining gallery:", error)
            setError("Failed to join gallery")
        } finally {
            setIsJoining(false)
        }
    }

    const handleSelectionChange = async (fileId, newStatus) => {
        if (!session?.user || !permissions.canSelect) return

        try {
            const response = await fetch(`/api/gallery/${resolvedParams.token}/selections`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    fileId,
                    status: newStatus
                })
            })

            if (response.ok) {
                const updatedSelection = await response.json()
                setSelections(prev => ({
                    ...prev,
                    [fileId]: updatedSelection
                }))
            }
        } catch (error) {
            console.error("Error updating selection:", error)
        }
    }

    const handleComment = async (fileId, content) => {
        if (!session?.user || !permissions.canComment) return

        try {
            const response = await fetch(`/api/gallery/${resolvedParams.token}/comments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    fileId,
                    content
                })
            })

            if (response.ok) {
                // Refresh comments or update state
                console.log("Comment added successfully")
            }
        } catch (error) {
            console.error("Error adding comment:", error)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    // Require authentication for shared galleries
    if (status === "unauthenticated" || !session?.user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-lg shadow-md">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
                        <p className="text-gray-600 mb-6">
                            You need to sign in to view this shared gallery for security purposes.
                        </p>
                        <div className="space-y-3">
                            <Link
                                href="/auth/signin"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Sign In
                            </Link>
                            <p className="text-sm text-gray-500">
                                Don't have an account?{" "}
                                <Link href="/auth/signup" className="text-blue-600 hover:text-blue-500">
                                    Sign up here
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{error}</h3>
                    <Link href="/" className="text-blue-600 hover:text-blue-500">
                        Go to homepage
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
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
                            {project.description && (
                                <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                by {project.owner.name || project.owner.email}
                            </p>
                        </div>
                        <div className="flex items-center space-x-4">
                            {session?.user ? (
                                <div className="flex items-center space-x-4">
                                    <span className="text-sm text-gray-700">
                                        {session.user.name || session.user.email}
                                    </span>
                                    {session.user.role === "CLIENT" && (
                                        <>
                                            {!joinStatus.hasJoined && joinStatus.canJoin && (
                                                <button
                                                    onClick={handleJoinGallery}
                                                    disabled={isJoining}
                                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
                                                >
                                                    {isJoining ? (
                                                        <>
                                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            <span>Joining...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                            </svg>
                                                            <span>Join Gallery</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                            {joinStatus.hasJoined && (
                                                <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-1 rounded-full">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    <span className="text-sm font-medium">Joined</span>
                                                </div>
                                            )}
                                            <Link
                                                href="/client"
                                                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                                            >
                                                My Galleries
                                            </Link>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="flex space-x-4">
                                    <Link
                                        href="/auth/signin"
                                        className="text-gray-700 hover:text-gray-900 text-sm font-medium"
                                    >
                                        Sign In
                                    </Link>
                                    {permissions.canSelect && (
                                        <Link
                                            href="/auth/signup"
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                        >
                                            Sign Up to Select
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Gallery */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {session?.user?.role === "CLIENT" && !joinStatus.hasJoined && joinStatus.canJoin && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                        <div className="flex items-start">
                            <svg className="h-6 w-6 text-blue-400 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1">
                                <h3 className="text-lg font-medium text-blue-900 mb-2">Join this Gallery</h3>
                                <p className="text-blue-800 text-sm mb-4">
                                    This gallery has been shared with you! Click "Join Gallery" above to add it to your client dashboard and start selecting photos.
                                </p>
                                <button
                                    onClick={handleJoinGallery}
                                    disabled={isJoining}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
                                >
                                    {isJoining ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Joining...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            <span>Join Gallery</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {!session?.user && permissions.canSelect && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center">
                            <svg className="h-5 w-5 text-blue-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-blue-800 text-sm">
                                <Link href="/auth/signin" className="font-medium underline">Sign in</Link>
                                {" or "}
                                <Link href="/auth/signup" className="font-medium underline">create an account</Link>
                                {" to select your favorite photos and leave comments."}
                            </p>
                        </div>
                    </div>
                )}

                <GalleryView
                    files={files}
                    selections={selections}
                    onSelectionChange={handleSelectionChange}
                    onComment={handleComment}
                    isClient={true}
                    permissions={permissions}
                    shareToken={resolvedParams.token}
                />
            </main>
        </div>
    )
}