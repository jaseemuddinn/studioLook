"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import NotificationDropdown from "@/components/NotificationDropdown"
import StorageIndicator, { TopBarStorage } from "@/components/StorageIndicator"

export default function Dashboard() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [projects, setProjects] = useState([])
    const [sharedProjects, setSharedProjects] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [showNewProjectModal, setShowNewProjectModal] = useState(false)
    const [activeTab, setActiveTab] = useState('my-projects') // 'my-projects' or 'shared-with-me'

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/signin")
        }
        // Remove role-based redirect - let everyone access dashboard
    }, [status, router])

    useEffect(() => {
        if (session?.user) {
            fetchProjects()
            fetchSharedProjects()
        }
    }, [session])

    const fetchProjects = async () => {
        try {
            const response = await fetch("/api/projects")
            if (response.ok) {
                const data = await response.json()
                setProjects(data)
            }
        } catch (error) {
            console.error("Error fetching projects:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchSharedProjects = async () => {
        try {
            const response = await fetch("/api/client/projects")
            if (response.ok) {
                const data = await response.json()
                setSharedProjects(data)
            } else {
                // If client projects API fails (maybe user doesn't have access), just set empty array
                setSharedProjects([])
            }
        } catch (error) {
            console.error("Error fetching shared projects:", error)
            setSharedProjects([])
        }
    }

    if (status === "loading" || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (!session) {
        return null
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-gray-900">StudioLook</h1>
                            <span className="ml-4 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                Dashboard
                            </span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <TopBarStorage />
                            <NotificationDropdown />
                            <span className="text-sm text-gray-700">
                                Welcome, {session.user.name || session.user.email}
                            </span>
                            <button
                                onClick={() => signOut({ callbackUrl: "/" })}
                                className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Dashboard Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
                        <p className="mt-1 text-sm text-gray-600">
                            Manage your projects and view galleries shared with you
                        </p>
                        {session?.user?.email && (
                            <p className="mt-1 text-xs text-gray-500">
                                Welcome back, {session.user.name || session.user.email}
                            </p>
                        )}
                    </div>
                    {activeTab === 'my-projects' && (
                        <button
                            onClick={() => setShowNewProjectModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center"
                        >
                            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Project
                        </button>
                    )}
                </div>

                {/* Tab Navigation */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('my-projects')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'my-projects'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            My Projects ({projects.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('shared-with-me')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'shared-with-me'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Shared with Me ({sharedProjects.length})
                        </button>
                    </nav>
                </div>

                {/* Storage Indicator - Only shows when needed (50%+ usage) */}
                <StorageIndicator />

                {/* Content Area */}
                {activeTab === 'my-projects' ? (
                    /* My Projects Tab */
                    projects.length === 0 ? (
                        <div className="text-center py-12">
                            <svg
                                className="mx-auto h-12 w-12 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    vectorEffect="non-scaling-stroke"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                                />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
                            <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
                            <div className="mt-6">
                                <button
                                    onClick={() => setShowNewProjectModal(true)}
                                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create Project
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {projects.map((project) => (
                                <MyProjectCard
                                    key={project.id}
                                    project={project}
                                    onDelete={(project) => setDeleteConfirm({ project, isDeleting: false })}
                                />
                            ))}
                        </div>
                    )
                ) : (
                    /* Shared with Me Tab */
                    sharedProjects.length === 0 ? (
                        <div className="text-center py-12">
                            <svg
                                className="mx-auto h-12 w-12 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    vectorEffect="non-scaling-stroke"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No galleries shared with you</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                When photographers share galleries with you, they'll appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {sharedProjects.map((project) => (
                                <SharedProjectCard key={project.id} project={project} />
                            ))}
                        </div>
                    )
                )}
            </main>

            {/* New Project Modal */}
            {showNewProjectModal && (
                <NewProjectModal
                    onClose={() => setShowNewProjectModal(false)}
                    onProjectCreated={(newProject) => {
                        setProjects([newProject, ...projects])
                        setShowNewProjectModal(false)
                    }}
                />
            )}
        </div>
    )
}

function MyProjectCard({ project }) {
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        })
    }

    return (
        <Link href={`/projects/${project.id}`}>
            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                <div className="p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 truncate">
                                {project.title}
                            </h3>
                            {project.description && (
                                <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                                    {project.description}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${project.status === "ACTIVE"
                                ? "bg-green-100 text-green-800"
                                : project.status === "COMPLETED"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}>
                                {project.status.toLowerCase()}
                            </span>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                        <span>{project._count?.folders || 0} folders</span>
                        <span>Created {formatDate(project.createdAt)}</span>
                    </div>
                </div>
            </div>
        </Link>
    )
}

function SharedProjectCard({ project }) {
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        })
    }

    return (
        <Link href={`/gallery/${project.token}`}>
            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer border-l-4 border-blue-500">
                <div className="p-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 truncate">
                            {project.title}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Gallery
                        </span>
                    </div>
                    {project.description && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                            {project.description}
                        </p>
                    )}
                    <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                        <span>by {project.owner.name || project.owner.email}</span>
                        <span>Joined {formatDate(project.joinedAt || project.createdAt)}</span>
                    </div>

                    {/* Permissions indicator */}
                    <div className="mt-3 flex items-center space-x-3 text-xs text-gray-500">
                        {project.permissions?.canSelect && (
                            <span className="flex items-center">
                                <svg className="w-3 h-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Select
                            </span>
                        )}
                        {project.permissions?.canComment && (
                            <span className="flex items-center">
                                <svg className="w-3 h-3 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Comment
                            </span>
                        )}
                        {project.permissions?.canDownload && (
                            <span className="flex items-center">
                                <svg className="w-3 h-3 mr-1 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Download
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    )
}

function NewProjectModal({ onClose, onProjectCreated }) {
    const [formData, setFormData] = useState({
        title: "",
        description: ""
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError("")

        try {
            const response = await fetch("/api/projects", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            })

            if (response.ok) {
                const newProject = await response.json()
                onProjectCreated(newProject)
            } else {
                const errorData = await response.json()
                setError(errorData.message || "Failed to create project")
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
                        <h3 className="text-lg font-medium text-gray-900">Create New Project</h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
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
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                                Project Title
                            </label>
                            <input
                                type="text"
                                id="title"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
                                placeholder="Enter project title"
                            />
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                Description (Optional)
                            </label>
                            <textarea
                                id="description"
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="mt-1 block w-full border text-gray-900 border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
                                placeholder="Project description"
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
                                {isSubmitting ? "Creating..." : "Create Project"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}