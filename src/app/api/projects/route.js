import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, Project, Folder } from "@/lib/db"

export async function GET() {
    try {
        const session = await auth()

        if (!session?.user || session.user.role !== "PHOTOGRAPHER") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        await connectToDatabase()

        const projects = await Project.find({
            ownerId: session.user.id
        }).sort({ createdAt: -1 }).lean()

        // Add folder count to each project
        const projectsWithCounts = await Promise.all(
            projects.map(async (project) => {
                const folderCount = await Folder.countDocuments({ projectId: project._id })
                return {
                    ...project,
                    id: project._id.toString(), // Add id field for frontend compatibility
                    _count: {
                        folders: folderCount
                    }
                }
            })
        )

        return NextResponse.json(projectsWithCounts)
    } catch (error) {
        console.error("Error fetching projects:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}

export async function POST(request) {
    try {
        const session = await auth()

        if (!session?.user || session.user.role !== "PHOTOGRAPHER") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const { title, description } = await request.json()

        if (!title || title.trim().length === 0) {
            return NextResponse.json(
                { message: "Project title is required" },
                { status: 400 }
            )
        }

        await connectToDatabase()

        const project = await Project.create({
            title: title.trim(),
            description: description?.trim() || null,
            ownerId: session.user.id,
            status: 'ACTIVE' // Set new projects to ACTIVE by default instead of DRAFT
        })

        // Convert to plain object and add folder count
        const projectWithCount = {
            ...project.toObject(),
            id: project._id.toString(), // Add id field for frontend compatibility
            _count: {
                folders: 0
            }
        }

        return NextResponse.json(projectWithCount, { status: 201 })
    } catch (error) {
        console.error("Error creating project:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}