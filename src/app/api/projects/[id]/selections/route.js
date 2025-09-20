import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, Selection, Project, File } from "@/lib/db"

export async function GET(request, { params }) {
    try {
        await connectToDatabase()

        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        const resolvedParams = await params
        const { id } = resolvedParams

        // Verify user owns the project
        const project = await Project.findById(id)
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 })
        }

        if (project.ownerId.toString() !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        // Get all files in the project
        const files = await File.find({ projectId: id }).select('_id')
        const fileIds = files.map(file => file._id)

        // Get all selections for files in this project
        const selections = await Selection.find({ fileId: { $in: fileIds } })
            .populate('userId', '_id name email')
            .populate('fileId', '_id originalName')
            .sort({ createdAt: -1 })

        // Create a map of fileId -> selection data
        const selectionMap = {}
        selections.forEach(selection => {
            const fileId = selection.fileId._id.toString()
            if (!selectionMap[fileId]) {
                selectionMap[fileId] = []
            }
            selectionMap[fileId].push({
                _id: selection._id,
                status: selection.status,
                user: selection.userId,
                createdAt: selection.createdAt,
                updatedAt: selection.updatedAt
            })
        })

        // Get selection summary stats - count unique files, not individual selections
        const fileStatuses = {}

        // For each file, determine its overall status based on user selections
        fileIds.forEach(fileId => {
            const fileIdStr = fileId.toString()
            const fileSelections = selectionMap[fileIdStr] || []

            if (fileSelections.length === 0) {
                fileStatuses[fileIdStr] = 'PENDING'
            } else {
                // Get the most recent selection for each user
                const userSelections = {}
                fileSelections.forEach(selection => {
                    const userId = selection.user._id.toString()
                    if (!userSelections[userId] || new Date(selection.updatedAt) > new Date(userSelections[userId].updatedAt)) {
                        userSelections[userId] = selection
                    }
                })

                const currentSelections = Object.values(userSelections)
                const selectedCount = currentSelections.filter(s => s.status === 'SELECTED').length
                const rejectedCount = currentSelections.filter(s => s.status === 'REJECTED').length

                // Determine overall file status
                if (selectedCount > 0 && rejectedCount === 0) {
                    fileStatuses[fileIdStr] = 'SELECTED'
                } else if (rejectedCount > 0 && selectedCount === 0) {
                    fileStatuses[fileIdStr] = 'REJECTED'
                } else if (selectedCount > 0 && rejectedCount > 0) {
                    fileStatuses[fileIdStr] = 'MIXED'
                } else {
                    fileStatuses[fileIdStr] = 'PENDING'
                }
            }
        })

        // Count files by their overall status
        const stats = {
            selected: Object.values(fileStatuses).filter(status => status === 'SELECTED').length,
            rejected: Object.values(fileStatuses).filter(status => status === 'REJECTED').length,
            mixed: Object.values(fileStatuses).filter(status => status === 'MIXED').length,
            pending: Object.values(fileStatuses).filter(status => status === 'PENDING').length,
            total: fileIds.length
        }

        return NextResponse.json({
            selections: selectionMap,
            stats,
            totalFiles: fileIds.length
        })

    } catch (error) {
        console.error("Error fetching selections:", error)
        return NextResponse.json({ error: "Failed to fetch selections" }, { status: 500 })
    }
}