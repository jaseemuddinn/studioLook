"use client"

import React, { createContext, useContext, useState } from 'react'
import * as Toast from '@radix-ui/react-toast'

const ToastContext = createContext({})

export const useToast = () => {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within ToastProvider')
    }
    return context
}

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([])

    const addToast = ({ title, description, type = 'info', duration = 5000 }) => {
        const id = Math.random().toString(36).substr(2, 9)
        const newToast = {
            id,
            title,
            description,
            type,
            duration,
            open: true
        }
        setToasts(prev => [...prev, newToast])
        
        // Auto-dismiss after duration
        if (duration && duration > 0) {
            setTimeout(() => {
                removeToast(id)
            }, duration)
        }
        
        return id
    }

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
    }

    const toast = {
        success: (title, description, duration = 4000) => addToast({ title, description, type: 'success', duration }),
        error: (title, description, duration = 6000) => addToast({ title, description, type: 'error', duration }),
        warning: (title, description, duration = 5000) => addToast({ title, description, type: 'warning', duration }),
        info: (title, description, duration = 5000) => addToast({ title, description, type: 'info', duration })
    }

    return (
        <ToastContext.Provider value={{ toast, removeToast }}>
            <Toast.Provider swipeDirection="right">
                {children}
                {toasts.map((toastItem) => (
                    <Toast.Root
                        key={toastItem.id}
                        open={toastItem.open}
                        onOpenChange={(open) => {
                            if (!open) {
                                removeToast(toastItem.id)
                            }
                        }}
                        duration={toastItem.duration}
                        className={`
                            fixed top-4 right-4 z-50 w-96 p-4 rounded-lg shadow-lg border
                            ${toastItem.type === 'success'
                                ? 'bg-green-50 border-green-200 text-green-800'
                                : toastItem.type === 'error'
                                    ? 'bg-red-50 border-red-200 text-red-800'
                                    : toastItem.type === 'warning'
                                        ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                                        : 'bg-blue-50 border-blue-200 text-blue-800'
                            }
                            data-[state=open]:animate-slideIn
                            data-[state=closed]:animate-slideOut
                            data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]
                            data-[swipe=cancel]:translate-x-0
                            data-[swipe=cancel]:transition-[transform_200ms_ease-out]
                            data-[swipe=end]:animate-swipeOut
                        `}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                {toastItem.title && (
                                    <Toast.Title className="font-semibold text-sm mb-1">
                                        {toastItem.title}
                                    </Toast.Title>
                                )}
                                {toastItem.description && (
                                    <Toast.Description className="text-sm opacity-90">
                                        {toastItem.description}
                                    </Toast.Description>
                                )}
                            </div>
                            <Toast.Close
                                className="ml-4 flex-shrink-0 p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
                                aria-label="Close"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </Toast.Close>
                        </div>
                    </Toast.Root>
                ))}
                <Toast.Viewport className="fixed top-0 right-0 flex flex-col p-4 gap-2 w-96 max-w-[100vw] m-0 list-none z-50 outline-none" />
            </Toast.Provider>
        </ToastContext.Provider>
    )
}