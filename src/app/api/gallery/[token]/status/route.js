import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, ProjectShare } from "@/lib/db"

export async function GET(request, { params }) {
    try {
        const session = await auth()

        if (!session?.user) {
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

        // Debug: Show all shares for this token
        const allShares = await ProjectShare.find({ token })
        console.log(`All shares for token ${token}:`, allShares.map(s => ({
            _id: s._id,
            userId: s.userId,
            email: s.email,
            joinedAt: s.joinedAt
        })))

        // Check if user has access to this gallery (either by email or userId)
        // Also check for user-specific access tokens
        const userShare = await ProjectShare.findOne({
            $or: [
                // Original token with user match
                {
                    token,
                    $or: [
                        { userId: session.user.id },
                        { email: session.user.email }
                    ]
                },
                // User-specific access token
                { token: `${token}_${session.user.id}` },
                // Timestamped user tokens (pattern: originalToken_userId_timestamp)
                {
                    token: { $regex: `^${token}_${session.user.id}_\\d+$` }
                }
            ]
        })

        // User has joined if they have a share record AND it has a joinedAt timestamp
        const hasJoined = !!(userShare && userShare.joinedAt)

        console.log(`Status check for user ${session.user.id} on token ${token}:`, {
            userShareFound: !!userShare,
            userShareId: userShare?._id,
            joinedAt: userShare?.joinedAt,
            hasJoined
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