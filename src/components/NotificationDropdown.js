"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function NotificationDropdown() {
    const { data: session } = useSession()
    const router = useRouter()
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (session?.user) {
            fetchNotifications()

            // Set up polling for new notifications every 30 seconds
            const interval = setInterval(() => {
                fetchNotifications()
            }, 30000)

            return () => clearInterval(interval)
        }
    }, [session])

    const fetchNotifications = async () => {
        try {
            setIsLoading(true)
            const response = await fetch("/api/notifications")
            if (response.ok) {
                const data = await response.json()
                setNotifications(data)
                setUnreadCount(data.filter(n => !n.read).length)
            }
        } catch (error) {
            console.error("Error fetching notifications:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const markAsRead = async (notificationId) => {
        try {
            const response = await fetch(`/api/notifications/${notificationId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ read: true })
            })

            if (response.ok) {
                setNotifications(notifications.map(n =>
                    n._id === notificationId ? { ...n, read: true } : n
                ))
                setUnreadCount(Math.max(0, unreadCount - 1))
            }
        } catch (error) {
            console.error("Error marking notification as read:", error)
        }
    }

    const markAllAsRead = async () => {
        try {
            const response = await fetch("/api/notifications/mark-all-read", {
                method: "POST"
            })

            if (response.ok) {
                setNotifications(notifications.map(n => ({ ...n, read: true })))
                setUnreadCount(0)
            }
        } catch (error) {
            console.error("Error marking all notifications as read:", error)
        }
    }

    if (!session?.user) return null

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:rounded-full"
            >
                <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-5 5-5-5h5V3h5v14z"
                    />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                        <div className="px-4 py-3 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-xs text-blue-600 hover:text-blue-500"
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {isLoading ? (
                                <div className="px-4 py-3 text-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-gray-500">
                                    No notifications yet
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <NotificationItem
                                        key={notification._id}
                                        notification={notification}
                                        onMarkAsRead={markAsRead}
                                        router={router}
                                        onClose={() => setIsOpen(false)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function NotificationItem({ notification, onMarkAsRead, router, onClose }) {
    const handleClick = () => {
        if (!notification.read) {
            onMarkAsRead(notification._id)
        }

        // Navigate to specific photo if it's a comment notification with fileId
        if (notification.type === "COMMENT_ADDED" && notification.data?.fileId && notification.data?.projectId) {
            onClose() // Close the dropdown
            router.push(`/projects/${notification.data.projectId}?fileId=${notification.data.fileId}`)
        } else if (notification.data?.projectId) {
            // Navigate to project for other notification types
            onClose() // Close the dropdown
            router.push(`/projects/${notification.data.projectId}`)
        }
    }

    const getIcon = () => {
        switch (notification.type) {
            case "PROJECT_SHARED":
                return (
                    <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                )
            case "SELECTION_MADE":
            case "SELECTION_COMPLETE":
                return (
                    <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )
            case "COMMENT_ADDED":
                return (
                    <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                )
            default:
                return (
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )
        }
    }

    return (
        <div
            onClick={handleClick}
            className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-l-4 ${notification.read ? "border-transparent" : "border-blue-500 bg-blue-50"
                }`}
        >
            <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                    {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm ${notification.read ? "text-gray-600" : "text-gray-900 font-medium"}`}>
                        {notification.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {formatTimeAgo(new Date(notification.createdAt))}
                    </p>
                </div>
                {!notification.read && (
                    <div className="flex-shrink-0">
                        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                    </div>
                )}
            </div>
        </div>
    )
}

function formatTimeAgo(date) {
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)

    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

    return date.toLocaleDateString()
}