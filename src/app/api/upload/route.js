import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, Folder, Project, File } from "@/lib/db"
import { uploadToS3 } from "@/lib/s3"
import { checkBatchStorageLimit, addToStorageUsage, getStorageLimitMessage } from "@/lib/storage"
import sharp from "sharp"
import path from "path"

export async function POST(request) {
    try {
        const session = await auth()

        if (!session?.user || (session.user.role !== "PHOTOGRAPHER" && session.user.role !== "ALL_FEATURES")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const formData = await request.formData()
        const files = formData.getAll("files")
        const folderId = formData.get("folderId")

        if (!folderId) {
            return NextResponse.json(
                { message: "Folder ID is required" },
                { status: 400 }
            )
        }

        if (!files || files.length === 0) {
            return NextResponse.json(
                { message: "No files provided" },
                { status: 400 }
            )
        }

        await connectToDatabase()

        // Verify folder ownership
        const folder = await Folder.findById(folderId).lean()
        if (!folder) {
            return NextResponse.json({ message: "Folder not found" }, { status: 404 })
        }

        const project = await Project.findById(folder.projectId).lean()
        if (!project || project.ownerId.toString() !== session.user.id) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        // Check storage limits before processing
        const fileSizes = files.filter(file => file && typeof file !== "string").map(file => file.size)
        const storageCheck = await checkBatchStorageLimit(session.user.id, fileSizes)

        if (!storageCheck.hasSpace) {
            const errorMessage = getStorageLimitMessage(storageCheck)
            return NextResponse.json(
                {
                    message: errorMessage.message,
                    title: errorMessage.title,
                    suggestion: errorMessage.suggestion,
                    storageInfo: {
                        used: storageCheck.currentUsage,
                        limit: storageCheck.limit,
                        remaining: storageCheck.remaining,
                        needed: storageCheck.additionalSize
                    }
                },
                { status: 413 } // Payload Too Large
            )
        }

        const uploadedFiles = []

        for (const file of files) {
            if (!file || typeof file === "string") continue

            // Validate file size (5MB limit)
            const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes
            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json(
                    {
                        message: `File "${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum size is 5MB.`
                    },
                    { status: 400 }
                )
            }

            const bytes = await file.arrayBuffer()
            const buffer = Buffer.from(bytes)

            // Generate unique filename
            const timestamp = Date.now()
            const randomString = Math.random().toString(36).substring(2, 15)
            const extension = path.extname(file.name).toLowerCase()
            const filename = `${timestamp}-${randomString}${extension}`

            // Upload main file to S3
            const fileUrl = await uploadToS3(buffer, `photos/${filename}`, file.type)

            let width = null
            let height = null
            let thumbnailUrl = null

            // Generate thumbnail for images
            if (file.type.startsWith('image/')) {
                try {
                    const image = sharp(buffer)
                    const metadata = await image.metadata()
                    width = metadata.width
                    height = metadata.height

                    // Create thumbnail
                    const thumbnailBuffer = await image
                        .resize(300, 300, {
                            fit: 'cover',
                            position: 'center'
                        })
                        .jpeg({ quality: 80 })
                        .toBuffer()

                    const thumbnailFilename = `thumb-${filename.replace(extension, '.jpg')}`
                    thumbnailUrl = await uploadToS3(thumbnailBuffer, `thumbnails/${thumbnailFilename}`, 'image/jpeg')
                } catch (error) {
                    console.error("Error processing image:", error)
                }
            }

            // Get the next position
            const lastFile = await File.findOne({ folderId }).sort({ position: -1 }).lean()

            // Save file info to database
            const savedFile = await File.create({
                filename,
                originalName: file.name,
                path: `photos/${filename}`,  // S3 key as path
                mimeType: file.type,
                size: file.size,
                width,
                height,
                url: fileUrl,  // S3 URL instead of local path
                thumbnailUrl,  // S3 thumbnail URL
                folderId,
                projectId: folder.projectId,
                userId: session.user.id,
                position: (lastFile?.position || 0) + 1
            })

            // Update user storage usage
            await addToStorageUsage(session.user.id, file.size)

            uploadedFiles.push({
                ...savedFile.toObject(),
                id: savedFile._id.toString() // Add id field for frontend compatibility
            })
        }

        return NextResponse.json(uploadedFiles, { status: 201 })
    } catch (error) {
        console.error("Error uploading files:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}

export const config = {
    api: {
        bodyParser: false,
    },
}