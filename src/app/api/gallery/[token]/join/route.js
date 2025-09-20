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

        // console.log(`Original ProjectShare for token ${token}:`, {
        //     id: projectShare._id,
        //     email: projectShare.email,
        //     userId: projectShare.userId,
        //     hasUserId: !!projectShare.userId
        // })

        // Check if user already has access to this gallery (by email or userId)
        const existingAccess = await ProjectShare.findOne({
            token,
            $or: [
                { userId: session.user.id },
                { email: session.user.email }
            ]
        })

        if (existingAccess) {
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

        // If no existing access, create a new share record
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
        console.log(`Created new share record for user ${session.user.id}:`, newShare._id)

        console.log(`User ${session.user.id} successfully joined gallery with token ${token}`)

        return NextResponse.json({
            message: "Successfully joined gallery",
            joined: true
        })

    } catch (error) {
        console.error("Error joining gallery:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}