import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, Notification } from "@/lib/db"

export async function PATCH(request, { params }) {
    try {
        const session = await auth()

        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const resolvedParams = await params
        const { read } = await request.json()

        await connectToDatabase()

        const notification = await Notification.findById(resolvedParams.id).lean()

        if (!notification || notification.userId.toString() !== session.user.id) {
            return NextResponse.json({ message: "Notification not found" }, { status: 404 })
        }

        const updatedNotification = await Notification.findByIdAndUpdate(
            resolvedParams.id,
            { read, readAt: read ? new Date() : null },
            { new: true }
        ).lean()

        return NextResponse.json(updatedNotification)
    } catch (error) {
        console.error("Error updating notification:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}