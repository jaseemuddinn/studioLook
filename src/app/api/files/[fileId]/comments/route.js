import { connectToDatabase, Comment, File, Project } from "@/lib/db"
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET(request, { params }) {
    try {
        await connectToDatabase()

        const session = await auth()
        if (!session?.user?.id) {
            return new Response(JSON.stringify({ error: "Not authenticated" }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const resolvedParams = await params
        const { fileId } = resolvedParams

        // Get the file and verify user owns the project
        const file = await File.findById(fileId).populate('projectId')
        if (!file) {
            return NextResponse.json({ error: "File not found" }, { status: 404 })
        }

        // Check if user owns the project
        if (file.projectId.ownerId.toString() !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        // Fetch comments for this file
        const comments = await Comment.find({ fileId: fileId })
            .populate('userId', '_id name email')
            .sort({ createdAt: -1 })

        return NextResponse.json(comments)

    } catch (error) {
        console.error("Error fetching comments:", error)
        return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 })
    }
}

export async function POST(request, { params }) {
    try {
        await connectToDatabase()

        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        const resolvedParams = await params
        const { fileId } = resolvedParams
        const { content } = await request.json()

        if (!content?.trim()) {
            return NextResponse.json({ error: "Comment content is required" }, { status: 400 })
        }

        // Get the file and verify user owns the project
        const file = await File.findById(fileId).populate('projectId')
        if (!file) {
            return NextResponse.json({ error: "File not found" }, { status: 404 })
        }

        // Check if user owns the project
        if (file.projectId.ownerId.toString() !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        // Create the comment
        const comment = new Comment({
            userId: session.user.id,
            fileId: fileId,
            content: content.trim()
        })

        await comment.save()
        await comment.populate('userId', '_id name email')

        return NextResponse.json(comment, { status: 201 })

    } catch (error) {
        console.error("Error creating comment:", error)
        return NextResponse.json({ error: "Failed to create comment" }, { status: 500 })
    }
}