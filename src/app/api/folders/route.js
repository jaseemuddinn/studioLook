import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, Project, Folder } from "@/lib/db"

export async function POST(request) {
    try {
        const session = await auth()

        if (!session?.user || session.user.role !== "PHOTOGRAPHER") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const { name, description, projectId } = await request.json()

        if (!name || name.trim().length === 0) {
            return NextResponse.json(
                { message: "Folder name is required" },
                { status: 400 }
            )
        }

        if (!projectId) {
            return NextResponse.json(
                { message: "Project ID is required" },
                { status: 400 }
            )
        }

        await connectToDatabase()

        // Verify project ownership
        const project = await Project.findById(projectId)

        if (!project || project.ownerId.toString() !== session.user.id) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        // Get the next position
        const lastFolder = await Folder.findOne({ projectId }).sort({ position: -1 })

        const folder = await Folder.create({
            name: name.trim(),
            description: description?.trim() || null,
            projectId,
            position: (lastFolder?.position || 0) + 1
        })

        return NextResponse.json({
            ...folder.toObject(),
            id: folder._id.toString(), // Add id field for frontend compatibility
            _count: {
                files: 0
            }
        }, { status: 201 })
    } catch (error) {
        console.error("Error creating folder:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}