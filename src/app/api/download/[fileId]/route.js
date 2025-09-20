import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, File, Project, ProjectShare } from "@/lib/db"

export async function GET(request, { params }) {
    try {
        const session = await auth()
        const resolvedParams = await params
        const { searchParams } = new URL(request.url)
        const token = searchParams.get('token') // For shared gallery access

        await connectToDatabase()

        // Get the file
        const file = await File.findById(resolvedParams.fileId).lean()

        if (!file) {
            return NextResponse.json({ message: "File not found" }, { status: 404 })
        }

        // Check access permissions
        let hasAccess = false

        if (session?.user) {
            // Check if user owns the project
            const project = await Project.findById(file.projectId).lean()
            if (project && project.ownerId.toString() === session.user.id) {
                hasAccess = true
            }
        }

        // If no direct access, check shared gallery permissions
        if (!hasAccess && token) {
            const projectShare = await ProjectShare.findOne({
                token,
                projectId: file.projectId
            }).lean()

            if (projectShare && projectShare.canDownload) {
                hasAccess = true
            }
        }

        if (!hasAccess) {
            return NextResponse.json({ message: "Access denied" }, { status: 403 })
        }

        // Fetch the file from S3 and return it with download headers
        const fileResponse = await fetch(file.url)

        if (!fileResponse.ok) {
            return NextResponse.json({ message: "File not found in storage" }, { status: 404 })
        }

        const fileBuffer = await fileResponse.arrayBuffer()

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': file.mimeType || 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${file.originalName}"`,
                'Content-Length': fileBuffer.byteLength.toString(),
            },
        })

    } catch (error) {
        console.error("Error downloading file:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}