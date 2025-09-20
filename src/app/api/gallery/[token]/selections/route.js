import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, ProjectShare, Selection, User } from "@/lib/db"

// GET - Fetch user selections for a shared gallery
export async function GET(request, { params }) {
    try {
        // Fix Next.js 15 headers issue by awaiting headers before auth
        await request.headers

        const session = await auth()

        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        } const resolvedParams = await params
        await connectToDatabase()

        // Debug: Log the token being searched and check if ProjectShare collection exists
        console.log('Looking for gallery token:', resolvedParams.token)
        const totalShares = await ProjectShare.countDocuments()
        // console.log('Total ProjectShare documents in database:', totalShares)

        if (totalShares > 0) {
            const sampleShare = await ProjectShare.findOne().lean()
            // console.log('Sample ProjectShare token format:', sampleShare?.token)
        }

        // Verify the gallery token exists and is valid
        const projectShare = await ProjectShare.findOne({ token: resolvedParams.token }).lean()

        // Debug: Log if share found
        // console.log('ProjectShare found:', !!projectShare)

        if (!projectShare) {
            return NextResponse.json({ message: "Gallery not found" }, { status: 404 })
        }

        // Check if the share has expired
        if (projectShare.expiresAt && new Date() > projectShare.expiresAt) {
            return NextResponse.json({ message: "Gallery access has expired" }, { status: 403 })
        }

        // Find the actual user document by email to get the MongoDB ObjectId
        const user = await User.findOne({ email: session.user.email }).select('_id').lean()

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 })
        }

        // Get user's selections for files in this project
        const selections = await Selection.find({
            userId: user._id,
            fileId: { $exists: true }
        }).populate({
            path: 'fileId',
            match: { projectId: projectShare.projectId }
        }).lean()

        // Filter out selections where fileId population failed (file not in this project)
        const validSelections = selections.filter(selection => selection.fileId)

        // Transform the data for frontend
        const selectionsData = validSelections.map(selection => ({
            id: selection._id.toString(),
            fileId: selection.fileId._id.toString(),
            status: selection.status,
            createdAt: selection.createdAt,
            updatedAt: selection.updatedAt
        }))

        return NextResponse.json(selectionsData)
    } catch (error) {
        console.error("Error fetching gallery selections:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}

// POST - Create or update a selection for a shared gallery
export async function POST(request, { params }) {
    try {
        // Fix Next.js 15 headers issue by awaiting headers before auth
        await request.headers

        const session = await auth()

        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        } const resolvedParams = await params
        const { fileId, status } = await request.json()

        if (!fileId || !status) {
            return NextResponse.json(
                { message: "File ID and status are required" },
                { status: 400 }
            )
        }

        if (!['SELECTED', 'REJECTED', 'PENDING'].includes(status)) {
            return NextResponse.json(
                { message: "Invalid status. Must be SELECTED, REJECTED, or PENDING" },
                { status: 400 }
            )
        }

        await connectToDatabase()

        // Verify the gallery token exists and is valid
        const projectShare = await ProjectShare.findOne({ token: resolvedParams.token }).lean()

        if (!projectShare) {
            return NextResponse.json({ message: "Gallery not found" }, { status: 404 })
        }

        // Check if the share has expired
        if (projectShare.expiresAt && new Date() > projectShare.expiresAt) {
            return NextResponse.json({ message: "Gallery access has expired" }, { status: 403 })
        }

        // Check if user has selection permissions
        if (!projectShare.canSelect) {
            return NextResponse.json({ message: "Selection not allowed" }, { status: 403 })
        }

        // Find the actual user document by email to get the MongoDB ObjectId
        const user = await User.findOne({ email: session.user.email }).select('_id').lean()

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 })
        }

        // Create or update the selection
        const selection = await Selection.findOneAndUpdate(
            {
                userId: user._id,
                fileId: fileId
            },
            {
                userId: user._id,
                fileId: fileId,
                status: status
            },
            {
                upsert: true,
                new: true,
                runValidators: true
            }
        )

        return NextResponse.json({
            id: selection._id.toString(),
            fileId: selection.fileId.toString(),
            status: selection.status,
            createdAt: selection.createdAt,
            updatedAt: selection.updatedAt
        })
    } catch (error) {
        console.error("Error updating gallery selection:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}
