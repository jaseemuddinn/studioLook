import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, ProjectShare } from "@/lib/db"

export async function POST(request, { params }) {
    try {
        const session = await auth()

        if (!session?.user || session.user.role !== "CLIENT") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        await connectToDatabase()

        const { token } = await params

        // Find the project share by token
        const projectShare = await ProjectShare.findOne({ token })

        if (!projectShare) {
            return NextResponse.json({ message: "Gallery not found" }, { status: 404 })
        }

        // Check if the share has expired
        if (projectShare.expiresAt && new Date() > projectShare.expiresAt) {
            return NextResponse.json({ message: "Gallery access has expired" }, { status: 403 })
        }

        console.log(`Join attempt by user ${session.user.id} for token ${token}`)

        // Check if user already has access to this gallery (by email or userId)
        const existingAccess = await ProjectShare.findOne({
            token,
            $or: [
                { userId: session.user.id },
                { email: session.user.email }
            ]
        })

        if (existingAccess) {
            console.log(`User ${session.user.id} already has access via existing share ${existingAccess._id}`)

            // If they have access by email but no userId, update to add userId
            if (!existingAccess.userId) {
                await ProjectShare.findByIdAndUpdate(existingAccess._id, {
                    userId: session.user.id,
                    joinedAt: new Date()
                })
                console.log(`Updated existing share record ${existingAccess._id} with userId for user ${session.user.id}`)
            }

            return NextResponse.json({
                message: "Successfully joined gallery",
                joined: true
            })
        }

        // For public galleries (where original share has no email), update the original share
        // instead of creating a new one
        if (!projectShare.email && !projectShare.userId) {
            console.log(`Updating public gallery share ${projectShare._id} for user ${session.user.id}`)

            await ProjectShare.findByIdAndUpdate(projectShare._id, {
                email: session.user.email,
                userId: session.user.id,
                joinedAt: new Date()
            })

            return NextResponse.json({
                message: "Successfully joined gallery",
                joined: true
            })
        }

        // If the original share is tied to a specific email/user, create a new share record
        console.log(`Creating new share record for user ${session.user.id}`)

        const newShare = await ProjectShare.create({
            token: projectShare.token,
            projectId: projectShare.projectId,
            email: session.user.email,
            userId: session.user.id,
            joinedAt: new Date(),
            canSelect: projectShare.canSelect,
            canComment: projectShare.canComment,
            canDownload: projectShare.canDownload
        })

        console.log(`Created new share record ${newShare._id} for user ${session.user.id}`)

        return NextResponse.json({
            message: "Successfully joined gallery",
            joined: true
        })

    } catch (error) {
        console.error("Error joining gallery:", error)
        console.error("Error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name
        })
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}