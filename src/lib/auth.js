import NextAuth from "next-auth"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import { MongoClient } from "mongodb"
import CredentialsProvider from "next-auth/providers/credentials"
import bcryptjs from "bcryptjs"
import connectToDatabase from "@/lib/mongodb"
import { User } from "@/lib/models"

const client = new MongoClient(process.env.MONGODB_URI)
const clientPromise = client.connect()

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: MongoDBAdapter(clientPromise),
    trustHost: true, // Trust the host to reduce headers warnings
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                name: { label: "Name", type: "text" },
                role: { label: "Role", type: "text" },
                isSignUp: { label: "Is Sign Up", type: "text" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                const { email, password, name, role, isSignUp } = credentials

                await connectToDatabase()

                if (isSignUp === "true") {
                    // Sign up flow
                    const existingUser = await User.findOne({ email })

                    if (existingUser) {
                        throw new Error("User already exists")
                    }

                    const hashedPassword = await bcryptjs.hash(password, 12)

                    const user = await User.create({
                        email,
                        name: name || "",
                        password: hashedPassword,
                        role: role === "PHOTOGRAPHER" ? "PHOTOGRAPHER" : "CLIENT"
                    })

                    return {
                        id: user._id.toString(),
                        email: user.email,
                        name: user.name,
                        role: user.role
                    }
                } else {
                    // Sign in flow
                    const user = await User.findOne({ email })

                    if (!user) {
                        return null
                    }

                    const isPasswordValid = await bcryptjs.compare(password, user.password)

                    if (!isPasswordValid) {
                        return null
                    }

                    return {
                        id: user._id.toString(),
                        email: user.email,
                        name: user.name,
                        role: user.role
                    }
                }
            }
        })
    ],
    session: {
        strategy: "jwt"
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role
            }
            return token
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.sub
                session.user.role = token.role
            }
            return session
        }
    },
    pages: {
        signIn: "/auth/signin",
        signUp: "/auth/signup"
    }
})