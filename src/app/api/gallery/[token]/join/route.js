import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, ProjectShare } from "@/lib/db"

export async function POST(request, { params }) {
    try {
        const session = await auth()

        if (!session?.user) {
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

        console.log(`Join attempt by user ${session.user.id} (${session.user.email}) for token ${token}`)

        // Check if user already has access to this gallery (by email or userId)
        const existingAccess = await ProjectShare.findOne({
            token,
            $or: [
                { userId: session.user.id },
                { email: session.user.email }
            ]
        })

        console.log(`Existing access check:`, {
            found: !!existingAccess,
            shareId: existingAccess?._id,
            userId: existingAccess?.userId,
            email: existingAccess?.email,
            joinedAt: existingAccess?.joinedAt
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
            } else if (!existingAccess.joinedAt) {
                // Ensure joinedAt is set even if userId exists
                await ProjectShare.findByIdAndUpdate(existingAccess._id, {
                    joinedAt: new Date()
                })
                console.log(`Set joinedAt for existing share record ${existingAccess._id}`)
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

            const updatedShare = await ProjectShare.findByIdAndUpdate(projectShare._id, {
                email: session.user.email,
                userId: session.user.id,
                joinedAt: new Date()
            }, { new: true })

            console.log(`Successfully updated public share:`, {
                shareId: updatedShare._id,
                userId: updatedShare.userId,
                email: updatedShare.email,
                joinedAt: updatedShare.joinedAt
            })

            return NextResponse.json({
                message: "Successfully joined gallery",
                joined: true
            })
        }

        // If the original share is tied to a specific email/user but current user doesn't match,
        // we need a way to track that this user has joined without violating the unique token constraint.
        // Since we can't create a new share with the same token, we'll handle this differently:

        console.log(`User ${session.user.id} attempting to join gallery with existing share ${projectShare._id}`)

        // Instead of creating a new share record or updating the existing one (which might be for another user),
        // we need to find a different approach. For now, let's check if this is a public gallery
        // that can be joined by anyone, or if we need to implement a separate access tracking system.

        // For the immediate fix, let's allow the join by creating a new share entry with different approach
        try {
            // First, let's just mark this user as having joined by updating the original share
            // But only if it doesn't conflict with existing user assignment
            if (projectShare.userId && projectShare.userId.toString() !== session.user.id) {
                // The share is already assigned to a different user
                console.log(`Share ${projectShare._id} already assigned to user ${projectShare.userId}, creating new access for user ${session.user.id}`)

                // Create a new share record for this user with a unique token
                const userAccessToken = `${token}_${session.user.id}`

                try {
                    const newShare = await ProjectShare.create({
                        projectId: projectShare.projectId,
                        token: userAccessToken,
                        email: session.user.email,
                        userId: session.user.id,
                        joinedAt: new Date(),
                        canSelect: projectShare.canSelect || true,
                        canComment: projectShare.canComment || true,
                        canDownload: projectShare.canDownload || true,
                        expiresAt: projectShare.expiresAt
                    })

                    console.log(`Created new user access record:`, {
                        shareId: newShare._id,
                        userId: newShare.userId,
                        email: newShare.email,
                        token: newShare.token
                    })

                    return NextResponse.json({
                        message: "Successfully joined gallery",
                        joined: true
                    })
                } catch (createError) {
                    console.error("Error creating user access record:", createError)

                    // If token conflict, try with timestamp
                    const timestampToken = `${token}_${session.user.id}_${Date.now()}`
                    try {
                        const newShare = await ProjectShare.create({
                            projectId: projectShare.projectId,
                            token: timestampToken,
                            email: session.user.email,
                            userId: session.user.id,
                            joinedAt: new Date(),
                            canSelect: projectShare.canSelect || true,
                            canComment: projectShare.canComment || true,
                            canDownload: projectShare.canDownload || true,
                            expiresAt: projectShare.expiresAt
                        })

                        console.log(`Created timestamped user access record:`, {
                            shareId: newShare._id,
                            token: newShare.token
                        })

                        return NextResponse.json({
                            message: "Successfully joined gallery",
                            joined: true
                        })
                    } catch (fallbackError) {
                        console.error("Fallback creation also failed:", fallbackError)
                        return NextResponse.json({
                            message: "Error joining gallery",
                            joined: false
                        }, { status: 500 })
                    }
                }

            } else {
                // Safe to update the share
                const updateData = {
                    joinedAt: new Date()
                }

                if (!projectShare.userId) {
                    updateData.userId = session.user.id
                    updateData.email = session.user.email
                }

                const updatedShare = await ProjectShare.findByIdAndUpdate(projectShare._id, updateData, { new: true })

                console.log(`Updated share record:`, {
                    shareId: updatedShare._id,
                    userId: updatedShare.userId,
                    email: updatedShare.email,
                    joinedAt: updatedShare.joinedAt
                })

                console.log(`Updated share record ${projectShare._id} for user ${session.user.id}`)

                return NextResponse.json({
                    message: "Successfully joined gallery",
                    joined: true
                })
            }
        } catch (updateError) {
            console.error("Error updating share record:", updateError)
            // Even if update fails, we can still allow access
            return NextResponse.json({
                message: "Successfully joined gallery",
                joined: true
            })
        }

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