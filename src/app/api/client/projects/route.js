import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, ProjectShare, Project, User } from "@/lib/db"

export async function GET() {
    try {
        const session = await auth()

        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        await connectToDatabase()

        // Get shared projects for this client (either by email or userId)
        const sharedProjects = await ProjectShare.find({
            $or: [
                { email: session.user.email },
                { userId: session.user.id }
            ]
        }).sort({ createdAt: -1 }).lean()

        console.log(`Found ${sharedProjects.length} shares for user ${session.user.email}:`,
            sharedProjects.map(s => ({
                _id: s._id,
                projectId: s.projectId,
                token: s.token,
                joinedAt: s.joinedAt
            }))
        )

        // Get project details with owners
        const projectsWithDetails = await Promise.all(
            sharedProjects.map(async (share) => {
                try {
                    const project = await Project.findById(share.projectId).lean()

                    // Skip if project doesn't exist (may have been deleted)
                    if (!project) {
                        console.warn(`Project ${share.projectId} referenced in share ${share._id} not found`)
                        return null
                    }

                    const owner = await User.findById(project.ownerId).select('_id name email').lean()

                    // Skip if owner doesn't exist
                    if (!owner) {
                        console.warn(`Owner ${project.ownerId} for project ${project._id} not found`)
                        return null
                    }

                    return {
                        ...project,
                        id: project._id.toString(), // Add id field for frontend compatibility
                        owner,
                        token: share.token,
                        joinedAt: share.joinedAt,
                        permissions: {
                            canSelect: share.canSelect,
                            canComment: share.canComment,
                            canDownload: share.canDownload
                        }
                    }
                } catch (error) {
                    console.error(`Error processing share ${share._id}:`, error)
                    return null
                }
            })
        )

        // Filter out null entries (deleted projects/owners)
        const validProjects = projectsWithDetails.filter(project => project !== null)

        console.log(`Fetched ${validProjects.length} valid shared projects for user ${session.user.email}`)

        return NextResponse.json(validProjects)
    } catch (error) {
        console.error("Error fetching shared projects:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}