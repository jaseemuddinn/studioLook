import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, Notification } from "@/lib/db"

export async function POST() {
    try {
        const session = await auth()

        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        await connectToDatabase()

        await Notification.updateMany(
            {
                userId: session.user.id,
                read: false
            },
            {
                read: true,
                readAt: new Date()
            }
        )

        return NextResponse.json({ message: "All notifications marked as read" })
    } catch (error) {
        console.error("Error marking all notifications as read:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}