import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, ProjectShare, Project, User } from "@/lib/db"

export async function GET() {
    try {
        const session = await auth()

        if (!session?.user || session.user.role !== "CLIENT") {
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

        // console.log(`Client dashboard for user ${session.user.id} (${session.user.email}):`, {
        //     foundShares: sharedProjects.length,
        //     shares: sharedProjects.map(s => ({ id: s._id, email: s.email, userId: s.userId }))
        // })

        // Get project details with owners
        const projectsWithDetails = await Promise.all(
            sharedProjects.map(async (share) => {
                const project = await Project.findById(share.projectId).lean()
                const owner = await User.findById(project.ownerId).select('_id name email').lean()

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
            })
        )

        return NextResponse.json(projectsWithDetails)
    } catch (error) {
        console.error("Error fetching shared projects:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}