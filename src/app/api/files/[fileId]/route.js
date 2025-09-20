import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, File, Folder, Project } from "@/lib/db"
import { deleteFromS3, getS3KeyFromUrl } from "@/lib/s3"

export async function DELETE(request, { params }) {
    try {
        const session = await auth()

        if (!session?.user || session.user.role !== "PHOTOGRAPHER") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const resolvedParams = await params
        await connectToDatabase()

        // Get the file and verify ownership - using fileId instead of id
        const file = await File.findById(resolvedParams.fileId).lean()

        if (!file) {
            return NextResponse.json({ message: "File not found" }, { status: 404 })
        }

        // Verify project ownership through folder
        let project
        if (file.folderId) {
            const folder = await Folder.findById(file.folderId).lean()
            if (!folder) {
                return NextResponse.json({ message: "Folder not found" }, { status: 404 })
            }
            project = await Project.findById(folder.projectId).lean()
        } else {
            // File might be directly in project without folder
            project = await Project.findById(file.projectId).lean()
        }

        if (!project || project.ownerId.toString() !== session.user.id) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        // Delete files from S3
        try {
            // Delete main file from S3
            if (file.url) {
                const s3Key = getS3KeyFromUrl(file.url)
                if (s3Key) {
                    await deleteFromS3(s3Key)
                }
            }

            // Delete thumbnail from S3 if exists
            if (file.thumbnailUrl) {
                const thumbnailKey = getS3KeyFromUrl(file.thumbnailUrl)
                if (thumbnailKey) {
                    await deleteFromS3(thumbnailKey)
                }
            }
        } catch (error) {
            console.error(`Error deleting S3 files for ${file.filename}:`, error)
            // Continue with database deletion even if S3 deletion fails
        }

        // Delete the file from database
        await File.findByIdAndDelete(resolvedParams.fileId)

        return NextResponse.json({
            message: "File deleted successfully",
            filename: file.originalName
        })
    } catch (error) {
        console.error("Error deleting file:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}