"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"

export default function ClientDashboard() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [sharedProjects, setSharedProjects] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/signin")
        } else if (status === "authenticated" && session?.user?.role === "PHOTOGRAPHER") {
            router.push("/dashboard")
        }
    }, [status, session, router])

    useEffect(() => {
        if (session?.user?.role === "CLIENT") {
            fetchSharedProjects()
        }
    }, [session])

    const fetchSharedProjects = async () => {
        try {
            const response = await fetch("/api/client/projects")
            if (response.ok) {
                const data = await response.json()
                setSharedProjects(data)
            }
        } catch (error) {
            console.error("Error fetching shared projects:", error)
        } finally {
            setIsLoading(false)
        }
    }

    if (status === "loading" || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (!session || session.user.role !== "CLIENT") {
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
                            <span className="ml-4 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                Client
                            </span>
                        </div>
                        <div className="flex items-center space-x-4">
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
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">My Galleries</h2>
                    <p className="mt-1 text-sm text-gray-600">
                        Review and select photos from projects shared with you
                    </p>
                </div>

                {/* Shared Projects */}
                {sharedProjects.length === 0 ? (
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
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No galleries available</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            When photographers share galleries with you, they'll appear here.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {sharedProjects.map((project) => (
                            <ProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}

function ProjectCard({ project }) {
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        })
    }

    return (
        <Link href={`/gallery/${project.token}`}>
            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer">
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
                </div>
            </div>
        </Link>
    )
}