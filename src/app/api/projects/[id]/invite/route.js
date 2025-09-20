import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase, ProjectShare, Project, User } from "@/lib/db"

export async function POST(request, { params }) {
    try {
        const session = await auth()

        if (!session?.user || session.user.role !== "PHOTOGRAPHER") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const resolvedParams = await params
        const { email, message, shareToken } = await request.json()

        if (!email || !shareToken) {
            return NextResponse.json(
                { message: "Email and share token are required" },
                { status: 400 }
            )
        }

        await connectToDatabase()

        // Verify the share exists and belongs to this user's project
        const share = await ProjectShare.findOne({ token: shareToken }).lean()

        if (!share) {
            return NextResponse.json({ message: "Invalid share token" }, { status: 400 })
        }

        const project = await Project.findById(share.projectId).lean()
        const owner = await User.findById(project.ownerId).select('name email').lean()

        if (project.ownerId.toString() !== session.user.id) {
            return NextResponse.json({ message: "Invalid share token" }, { status: 400 })
        }

        // For this demo, we'll just return success
        // In a real implementation, you would integrate with an email service like:
        // - Nodemailer with SMTP
        // - SendGrid
        // - Amazon SES
        // - Resend

        console.log("Email invitation would be sent to:", email)
        console.log("Project:", project.title)
        console.log("Share URL:", `${process.env.NEXTAUTH_URL}/gallery/${shareToken}`)
        console.log("Message:", message)

        // TODO: Implement actual email sending
        // Example with nodemailer:
        /*
        const transporter = nodemailer.createTransporter({
          host: process.env.EMAIL_SERVER_HOST,
          port: process.env.EMAIL_SERVER_PORT,
          auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD
          }
        })
    
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: email,
          subject: `${owner.name} shared a photo gallery with you`,
          html: `
            <h2>You've been invited to view a photo gallery</h2>
            <p>${owner.name} has shared the project "${project.title}" with you.</p>
            ${message ? `<p>Message: ${message}</p>` : ''}
            <p><a href="${process.env.NEXTAUTH_URL}/gallery/${shareToken}">View Gallery</a></p>
          `
        })
        */

        return NextResponse.json({
            message: "Invitation sent successfully",
            details: "In production, this would send an actual email"
        })
    } catch (error) {
        console.error("Error sending invitation:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}