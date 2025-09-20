import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, ProjectShare, Project, User, File, Comment } from "@/lib/db"
import { notifyCommentAdded } from "@/lib/notifications"

export async function GET(request, { params }) {
    try {
        const session = await auth()

        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const resolvedParams = await params
        const { searchParams } = new URL(request.url)
        const fileId = searchParams.get('fileId')

        if (!fileId) {
            return NextResponse.json(
                { message: "File ID is required" },
                { status: 400 }
            )
        }

        await connectToDatabase()

        // Verify access to the gallery and permissions
        const projectShare = await ProjectShare.findOne({ token: resolvedParams.token }).lean()

        if (!projectShare) {
            return NextResponse.json({ message: "Gallery not found" }, { status: 404 })
        }

        if (!projectShare.canComment) {
            return NextResponse.json({ message: "Comments not allowed" }, { status: 403 })
        }

        // Verify the file belongs to this project
        const file = await File.findOne({
            _id: fileId,
            projectId: projectShare.projectId
        }).lean()

        if (!file) {
            return NextResponse.json({ message: "File not found" }, { status: 404 })
        }

        // Get comments for this file
        const comments = await Comment.find({ fileId })
            .populate('userId', '_id name email')
            .sort({ createdAt: -1 })
            .lean()

        return NextResponse.json(comments)
    } catch (error) {
        console.error("Error fetching comments:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}

export async function POST(request, { params }) {
    try {
        const session = await auth()

        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const resolvedParams = await params
        const { fileId, content } = await request.json()

        if (!fileId || !content?.trim()) {
            return NextResponse.json(
                { message: "File ID and content are required" },
                { status: 400 }
            )
        }

        await connectToDatabase()

        // Verify access to the gallery and permissions
        const projectShare = await ProjectShare.findOne({ token: resolvedParams.token }).lean()

        if (!projectShare) {
            return NextResponse.json({ message: "Gallery not found" }, { status: 404 })
        }

        if (!projectShare.canComment) {
            return NextResponse.json({ message: "Comments not allowed" }, { status: 403 })
        }

        // Get project details
        const project = await Project.findById(projectShare.projectId).lean()

        // Verify the file belongs to this project
        const file = await File.findOne({
            _id: fileId,
            projectId: projectShare.projectId
        }).lean()

        if (!file) {
            return NextResponse.json({ message: "File not found" }, { status: 404 })
        }

        // Create the comment
        const comment = await Comment.create({
            content: content.trim(),
            fileId,
            userId: session.user.id
        })

        // Populate user data for response
        const populatedComment = await Comment.findById(comment._id).populate('userId', '_id name email').lean()

        // Create notification for the project owner
        if (project.ownerId.toString() !== session.user.id) {
            console.log('Creating notification for project owner:', {
                projectOwnerId: project.ownerId,
                clientName: session.user.name || session.user.email,
                projectTitle: project.title,
                projectId: project._id
            })

            try {
                await notifyCommentAdded({
                    projectOwnerId: project.ownerId,
                    clientName: session.user.name || session.user.email,
                    projectTitle: project.title,
                    projectId: project._id,
                    fileId: fileId
                })
                console.log('Notification created successfully')
            } catch (notificationError) {
                console.error('Failed to create notification:', notificationError)
            }
        } else {
            console.log('Skipping notification - user is project owner')
        }

        return NextResponse.json(populatedComment, { status: 201 })
    } catch (error) {
        console.error("Error creating comment:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}