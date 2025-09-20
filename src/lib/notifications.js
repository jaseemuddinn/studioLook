import { connectToDatabase, Notification } from "@/lib/db"

export async function createNotification({
    userId,
    type,
    title,
    message,
    projectId = null,
    data = null
}) {
    try {
        await connectToDatabase()
        const notification = await Notification.create({
            userId,
            type,
            title,
            message,
            data: data || (projectId ? { projectId } : null)
        })
        console.log('Notification created:', notification)
        return notification
    } catch (error) {
        console.error("Error creating notification:", error)
        throw error
    }
}

export async function notifyProjectShared({
    projectOwnerId,
    projectTitle,
    clientEmail,
    projectId
}) {
    await createNotification({
        userId: projectOwnerId,
        type: "PROJECT_SHARED",
        title: "Project Shared",
        message: `You shared "${projectTitle}" with ${clientEmail}`,
        projectId
    })
}

export async function notifySelectionMade({
    projectOwnerId,
    clientName,
    projectTitle,
    selectionStatus,
    projectId
}) {
    await createNotification({
        userId: projectOwnerId,
        type: "SELECTION_MADE",
        title: "New Selection",
        message: `${clientName} ${selectionStatus.toLowerCase()} a photo in "${projectTitle}"`,
        projectId
    })
}

export async function notifyCommentAdded({
    projectOwnerId,
    clientName,
    projectTitle,
    projectId,
    fileId
}) {
    await createNotification({
        userId: projectOwnerId,
        type: "COMMENT_ADDED",
        title: "New Comment",
        message: `${clientName} commented on a photo in "${projectTitle}"`,
        data: { projectId, fileId }
    })
}