import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, Folder, File, Project } from "@/lib/db"
import { deleteFromS3, getS3KeyFromUrl } from "@/lib/s3"

export async function DELETE(request, { params }) {
    try {
        const session = await auth()

        if (!session?.user || session.user.role !== "PHOTOGRAPHER") {
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

        // Get all files in this folder to delete them from disk
        const files = await File.find({ folderId: resolvedParams.id }).lean()

        // Recursive function to delete folder and all its children
        const deleteRecursively = async (folderId) => {
            // Find all child folders
            const childFolders = await Folder.find({ parentId: folderId }).lean()

            // Log if there are child folders (useful for debugging)
            if (childFolders.length > 0) {
                console.log(`Deleting ${childFolders.length} child folders of folder ${folderId}`)
            }

            // Recursively delete all child folders first
            for (const childFolder of childFolders) {
                await deleteRecursively(childFolder._id)
            }

            // Get all files in this specific folder
            const folderFiles = await File.find({ folderId }).lean()

            // Delete files from S3
            for (const file of folderFiles) {
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
                    // Continue with deletion even if S3 deletion fails
                }
            }

            // Delete all files in this folder from database
            await File.deleteMany({ folderId })

            // Delete the folder itself
            await Folder.findByIdAndDelete(folderId)

            return folderFiles.length
        }

        // Start recursive deletion
        const totalDeletedFiles = await deleteRecursively(resolvedParams.id)

        return NextResponse.json({
            message: "Folder and all contents deleted successfully",
            deletedFiles: totalDeletedFiles
        })
    } catch (error) {
        console.error("Error deleting folder:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}