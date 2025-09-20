import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, ProjectShare, Project } from "@/lib/db"

export async function DELETE(request, { params }) {
    try {
        const session = await auth()

        if (!session?.user || session.user.role !== "PHOTOGRAPHER") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const resolvedParams = await params
        await connectToDatabase()

        // Find the share and verify ownership
        const share = await ProjectShare.findById(resolvedParams.shareId).lean()

        if (!share) {
            return NextResponse.json({ message: "Share not found" }, { status: 404 })
        }

        const project = await Project.findById(share.projectId).lean()
        if (!project || project.ownerId.toString() !== session.user.id) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        // Delete the share
        await ProjectShare.findByIdAndDelete(resolvedParams.shareId)

        return NextResponse.json({ message: "Share deleted successfully" })
    } catch (error) {
        console.error("Error deleting share:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}