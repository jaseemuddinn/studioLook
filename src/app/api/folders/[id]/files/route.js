import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, Folder, File, Project } from "@/lib/db"

export async function GET(request, { params }) {
    try {
        const session = await auth()

        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const resolvedParams = await params
        await connectToDatabase()

        // Get the folder and verify ownership
        const folder = await Folder.findById(resolvedParams.id).lean()

        if (!folder) {
            return NextResponse.json({ message: "Folder not found" }, { status: 404 })
        }

        // Verify project ownership
        const project = await Project.findById(folder.projectId).lean()

        if (!project || project.ownerId.toString() !== session.user.id) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        // Get files in this folder
        const files = await File.find({ folderId: resolvedParams.id }).sort({ position: 1 }).lean()

        // Add id field for frontend compatibility
        const filesWithId = files.map(file => ({
            ...file,
            id: file._id.toString()
        }))

        return NextResponse.json(filesWithId)
    } catch (error) {
        console.error("Error fetching folder files:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}