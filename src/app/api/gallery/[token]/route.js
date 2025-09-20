import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, ProjectShare, Project, User, Folder, File } from "@/lib/db"

export async function GET(request, { params }) {
    try {
        const resolvedParams = await params
        await connectToDatabase()

        // Debug logging for gallery token
        console.log('Gallery token lookup:', resolvedParams.token)
        const shareCount = await ProjectShare.countDocuments()
        console.log('Total shares in database:', shareCount)

        // Find the project share by token
        const projectShare = await ProjectShare.findOne({ token: resolvedParams.token }).lean()

        // console.log('ProjectShare found in gallery route:', !!projectShare)

        if (!projectShare) {
            return NextResponse.json({ message: "Gallery not found" }, { status: 404 })
        }

        // Check if the share has expired
        if (projectShare.expiresAt && new Date() > projectShare.expiresAt) {
            return NextResponse.json({ message: "Gallery access has expired" }, { status: 403 })
        }

        // Get the project with owner details
        const project = await Project.findById(projectShare.projectId).lean()
        const owner = await User.findById(project.ownerId).select('_id name email').lean()

        // Get folders and files for this project
        const folders = await Folder.find({ projectId: project._id }).sort({ position: 1 }).lean()
        const files = await File.find({ projectId: project._id }).sort({ position: 1 }).lean()

        // Group files by folder
        const folderFiles = {}
        files.forEach(file => {
            const folderId = file.folderId?.toString() || 'root'
            if (!folderFiles[folderId]) {
                folderFiles[folderId] = []
            }
            folderFiles[folderId].push(file)
        })

        // Attach files to folders
        const foldersWithFiles = folders.map(folder => ({
            ...folder,
            id: folder._id.toString(), // Add id field for frontend compatibility
            files: (folderFiles[folder._id.toString()] || []).map(file => ({
                ...file,
                id: file._id.toString() // Add id field for frontend compatibility
            }))
        }))

        // Build the project object
        const projectWithDetails = {
            ...project,
            id: project._id.toString(), // Add id field for frontend compatibility
            owner,
            folders: foldersWithFiles
        }

        if (!projectShare) {
            return NextResponse.json({ message: "Gallery not found" }, { status: 404 })
        }

        // Check if the share has expired
        if (projectShare.expiresAt && new Date() > projectShare.expiresAt) {
            return NextResponse.json({ message: "Gallery access has expired" }, { status: 403 })
        }

        // Flatten all files from all folders
        const allFiles = foldersWithFiles.reduce((acc, folder) => {
            return acc.concat(folder.files)
        }, [])

        return NextResponse.json({
            project: projectWithDetails,
            files: allFiles,
            permissions: {
                canSelect: projectShare.canSelect,
                canComment: projectShare.canComment,
                canDownload: projectShare.canDownload
            }
        })
    } catch (error) {
        console.error("Error fetching gallery:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}