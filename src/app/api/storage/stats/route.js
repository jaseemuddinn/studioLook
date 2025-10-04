import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getUserStorageStats } from "@/lib/storage"

export async function GET(request) {
    try {
        const session = await auth()

        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const stats = await getUserStorageStats(session.user.id)

        return NextResponse.json(stats)
    } catch (error) {
        console.error("Error getting storage stats:", error)

        // Return safe defaults if there's an error
        return NextResponse.json({
            used: 0,
            limit: 2 * 1024 * 1024 * 1024, // 2GB
            remaining: 2 * 1024 * 1024 * 1024,
            usedPercentage: 0,
            usedFormatted: '0 Bytes',
            limitFormatted: '2 GB',
            remainingFormatted: '2 GB'
        })
    }
}