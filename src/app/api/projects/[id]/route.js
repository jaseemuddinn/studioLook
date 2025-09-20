import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, Project, Folder, File } from "@/lib/db"
import { unlink } from "fs/promises"
import path from "path"

export async function GET(request, { params }) {
    try {
        const resolvedParams = await params
        const session = await auth()

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        await connectToDatabase()

        const project = await Project.findById(resolvedParams.id).lean()

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 })
        }

        // Check if user owns the project
        if (project.ownerId.toString() !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Get folders and files for this project
        const folders = await Folder.find({ projectId: resolvedParams.id }).sort({ position: 1 }).lean()
        const files = await File.find({ projectId: resolvedParams.id }).sort({ position: 1 }).lean()

        // Add id field and file count to folders for frontend compatibility
        const foldersWithId = folders.map(folder => {
            const folderFiles = files.filter(file => file.folderId?.toString() === folder._id.toString())
            return {
                ...folder,
                id: folder._id.toString(),
                _count: {
                    files: folderFiles.length
                }
            }
        })

        const filesWithId = files.map(file => ({
            ...file,
            id: file._id.toString()
        }))

        return NextResponse.json({
            ...project,
            id: project._id.toString(), // Add id field for frontend compatibility
            folders: foldersWithId,
            files: filesWithId
        })
    } catch (error) {
        console.error("Error fetching project:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await auth()

        if (!session?.user || session.user.role !== "PHOTOGRAPHER") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const resolvedParams = await params
        await connectToDatabase()

        // Get the project and verify ownership
        const project = await Project.findById(resolvedParams.id).lean()

        if (!project) {
            return NextResponse.json({ message: "Project not found" }, { status: 404 })
        }

        if (project.ownerId.toString() !== session.user.id) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        // Get all folders in this project
        const folders = await Folder.find({ projectId: resolvedParams.id }).lean()

        // Get all files in all folders of this project
        const files = await File.find({ projectId: resolvedParams.id }).lean()

        // Delete physical files from disk
        const uploadDir = path.join(process.cwd(), "public", "uploads")
        let deletedFilesCount = 0

        for (const file of files) {
            try {
                // Delete main file
                if (file.filename) {
                    await unlink(path.join(uploadDir, file.filename))
                }
                // Delete thumbnail if exists
                if (file.thumbnailUrl) {
                    const thumbnailFilename = file.thumbnailUrl.replace('/uploads/', '')
                    await unlink(path.join(uploadDir, thumbnailFilename))
                }
                deletedFilesCount++
            } catch (error) {
                console.error(`Error deleting file ${file.filename}:`, error)
                // Continue with deletion even if file removal fails
            }
        }

        // Delete all files in the project from database
        await File.deleteMany({ projectId: resolvedParams.id })

        // Delete all folders in the project
        await Folder.deleteMany({ projectId: resolvedParams.id })

        // Delete the project itself
        await Project.findByIdAndDelete(resolvedParams.id)

        return NextResponse.json({
            message: "Project and all contents deleted successfully",
            deletedFiles: deletedFilesCount,
            deletedFolders: folders.length
        })
    } catch (error) {
        console.error("Error deleting project:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}