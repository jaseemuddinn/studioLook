import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, ProjectShare } from "@/lib/db"

export async function GET(request, { params }) {
    try {
        const session = await auth()

        if (!session?.user || session.user.role !== "CLIENT") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        await connectToDatabase()

        const { token } = await params

        // Find the project share by token and check if user has access
        const projectShare = await ProjectShare.findOne({ token })

        if (!projectShare) {
            return NextResponse.json({ message: "Gallery not found" }, { status: 404 })
        }

        // Check if the share has expired
        if (projectShare.expiresAt && new Date() > projectShare.expiresAt) {
            return NextResponse.json({ message: "Gallery access has expired" }, { status: 403 })
        }

        // Check if user has access to this gallery (either by email or userId)
        const userShare = await ProjectShare.findOne({
            token,
            $or: [
                { userId: session.user.id },
                { email: session.user.email }
            ]
        })

        const hasJoined = !!userShare

        // console.log(`Status check for user ${session.user.id} on token ${token}:`, {
        //     userShareFound: !!userShare,
        //     userShareId: userShare?._id,
        //     hasJoined
        // })

        return NextResponse.json({
            hasJoined,
            canJoin: !hasJoined
        })

        return NextResponse.json({
            hasJoined,
            canJoin: !hasJoined
        })

    } catch (error) {
        console.error("Error checking gallery join status:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}