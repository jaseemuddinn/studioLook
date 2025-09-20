import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, Project, ProjectShare } from "@/lib/db"
import { randomBytes } from "crypto"

export async function GET(request, { params }) {
    try {
        const session = await auth()

        if (!session?.user || session.user.role !== "PHOTOGRAPHER") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const resolvedParams = await params
        await connectToDatabase()

        // Verify project ownership
        const project = await Project.findById(resolvedParams.id).lean()

        if (!project || project.ownerId.toString() !== session.user.id) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        const shares = await ProjectShare.find({
            projectId: resolvedParams.id
        }).sort({ createdAt: -1 }).lean()

        return NextResponse.json(shares)
    } catch (error) {
        console.error("Error fetching shares:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}

export async function POST(request, { params }) {
    try {
        const session = await auth()

        if (!session?.user || session.user.role !== "PHOTOGRAPHER") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const resolvedParams = await params
        const { canSelect = true, canComment = true, canDownload = false, expiresAt, email, name, password } = await request.json()

        await connectToDatabase()

        // Verify project ownership
        const project = await Project.findById(resolvedParams.id).lean()

        if (!project || project.ownerId.toString() !== session.user.id) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        // Generate a unique token
        const token = randomBytes(32).toString('hex')

        // Create the share
        const share = await ProjectShare.create({
            token,
            projectId: resolvedParams.id,
            canSelect,
            canComment,
            canDownload,
            email,
            name,
            password,
            expiresAt: expiresAt ? new Date(expiresAt) : null
        })

        console.log('Created new share with token:', token)

        return NextResponse.json(share, { status: 201 })
    } catch (error) {
        console.error("Error creating share:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}