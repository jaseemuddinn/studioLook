import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME

export async function uploadToS3(buffer, key, contentType) {
    try {
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: BUCKET_NAME,
                Key: key,
                Body: buffer,
                ContentType: contentType,
                // Make files publicly readable
                ACL: 'public-read',
            },
        })

        const result = await upload.done()

        // Return the public URL
        return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
    } catch (error) {
        console.error('Error uploading to S3:', error)
        throw error
    }
}

export async function deleteFromS3(key) {
    try {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        })

        await s3Client.send(command)
        return true
    } catch (error) {
        console.error('Error deleting from S3:', error)
        throw error
    }
}

// Helper function to extract S3 key from URL
export function getS3KeyFromUrl(url) {
    if (!url || !url.includes('amazonaws.com')) return null

    const parts = url.split('/')
    return parts.slice(3).join('/') // Remove https://bucket.s3.region.amazonaws.com/
}