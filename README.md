# 📸 StudioLook

> A modern, professional photography gallery and client management platform built with Next.js, MongoDB, and AWS S3.

[![Next.js](https://img.shields.io/badge/Next.js-15.5.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![AWS S3](https://img.shields.io/badge/AWS-S3-orange?style=flat-square&logo=amazon-aws)](https://aws.amazon.com/s3/)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

## ✨ Features

### 👨‍💼 For Photographers
- **📁 Project Management**: Organize photos into projects and folders
- **☁️ Cloud Storage**: Secure file storage with AWS S3 integration
- **🔗 Shareable Galleries**: Generate secure, time-limited gallery links
- **👥 Client Management**: Manage multiple clients and their projects
- **📧 Email Invitations**: Send gallery invitations directly to clients
- **✅ Selection Tracking**: See which photos clients have selected/rejected
- **💬 Comment System**: Receive feedback directly on photos
- **🔔 Real-time Notifications**: Get notified when clients comment or select photos
- **📊 Selection Analytics**: Track selection statistics (selected, rejected, pending, mixed)
- **🎨 Folder Organization**: Create custom folders within projects

### 👤 For Clients
- **🖼️ Beautiful Gallery View**: Responsive masonry layout for photo viewing
- **🔍 Full-Screen Preview**: View photos in high-quality modal
- **✨ Photo Selection**: Select or reject photos with visual feedback
- **💬 Photo Comments**: Leave comments and feedback on specific photos
- **📥 Direct Downloads**: Download high-resolution photos (if permitted)
- **📱 Mobile Responsive**: Perfect viewing experience on all devices
- **🔐 Secure Access**: Token-based authentication for gallery access
- **📋 Personal Dashboard**: View all your joined galleries in one place

## 🚀 Tech Stack

- **Frontend**: Next.js 15, React, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js
- **Database**: MongoDB with Mongoose ODM
- **Storage**: AWS S3
- **Authentication**: NextAuth.js with Credentials Provider
- **Email**: Nodemailer
- **File Upload**: Multipart form handling with busboy

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn** or **pnpm** or **bun**
- **MongoDB** (local installation or MongoDB Atlas account)
- **AWS Account** (for S3 storage)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/The-Acers/studioLook.git
cd studioLook
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory by copying the example:

```bash
cp .env.example .env.local
```

Then, update the `.env.local` file with your actual credentials:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/studiolook

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-random-secret-here

# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_S3_BUCKET_NAME=your-s3-bucket-name

# Email Configuration
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@studiolook.com
```

### 4. Generate NextAuth Secret

Generate a secure random string for `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

### 5. AWS S3 Setup

1. Create an S3 bucket in your AWS console
2. Configure CORS for your bucket
3. Create an IAM user with S3 access permissions
4. Copy the Access Key ID and Secret Access Key to your `.env.local`

### 6. MongoDB Setup

**Option A: Local MongoDB**
```bash
# Install MongoDB locally and start the service
mongod
```

**Option B: MongoDB Atlas**
1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Get your connection string
3. Update `MONGODB_URI` in `.env.local`

### 7. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 📁 Project Structure

```
studiolook/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── auth/         # Authentication endpoints
│   │   │   ├── projects/     # Project management APIs
│   │   │   ├── files/        # File upload/download APIs
│   │   │   ├── folders/      # Folder management APIs
│   │   │   ├── gallery/      # Gallery sharing APIs
│   │   │   ├── client/       # Client dashboard APIs
│   │   │   └── notifications/ # Notification APIs
│   │   ├── auth/             # Authentication pages
│   │   ├── projects/         # Project pages
│   │   ├── gallery/          # Gallery view pages
│   │   ├── client/           # Client dashboard
│   │   └── dashboard/        #Dashboard merged
│   ├── components/           # Reusable React components
│   ├── lib/                  # Utility functions and configurations
│   │   ├── auth.js          # NextAuth configuration
│   │   ├── db.js            # MongoDB connection and models
│   │   ├── s3.js            # AWS S3 utilities
│   │   └── notifications.js  # Notification helpers
│   └── middleware.js         # Next.js middleware
├── public/                   # Static assets
├── .env.example             # Environment variables example
├── .eslintrc.json          # ESLint configuration
├── next.config.js          # Next.js configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── package.json            # Project dependencies
```

## 🎨 Key Features Explained

### Project & Folder Management
- Create unlimited projects
- Organize photos into custom folders
- Upload multiple files simultaneously
- Support for images (JPG, PNG, GIF) and videos (MP4, MOV)

### Gallery Sharing
- Generate secure shareable links
- Set expiration dates for galleries
- Share with specific email addresses
- Control permissions (view, select, comment, download)
- Track who has joined galleries

### Selection System
- Clients can select or reject photos
- Visual indicators (green for selected, red for rejected)
- Multi-user support with conflict resolution
- Real-time selection statistics
- Filter photos by selection status

### Comment System
- Clients can comment on individual photos
- Photographers receive notifications
- Click notification to jump to commented photo
- Threaded conversation support

### Notifications
- Real-time notifications for photographers
- Comment notifications with photo preview
- Selection notifications
- Click to navigate directly to specific photos
- Mark as read/unread functionality

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Reporting Issues

1. **Check Existing Issues**: Before creating a new issue, please check if it already exists
2. **Create Detailed Reports**: Include steps to reproduce, expected behavior, and screenshots if applicable
3. **Use Issue Templates**: Follow the issue template for bug reports and feature requests

### Development Workflow

#### 1. Fork the Repository

Click the "Fork" button at the top right of the repository page.

#### 2. Clone Your Fork

```bash
git clone https://github.com/The-Acers/studioLook.git
cd studioLook
```

#### 3. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or modifications

#### 4. Make Your Changes

- Write clean, readable code
- Follow the existing code style
- Add comments for complex logic
- Update documentation if needed

#### 5. Test Your Changes

```bash
npm run dev
# Test thoroughly in your local environment
```

#### 6. Commit Your Changes

```bash
git add .
git commit -m "feat: add new gallery filtering feature"
```

Commit message conventions:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test updates
- `chore:` - Maintenance tasks

#### 7. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

#### 8. Create a Pull Request

1. Go to the original repository
2. Click "New Pull Request"
3. Select your fork and branch
4. Fill in the PR template with:
   - Description of changes
   - Related issue numbers
   - Screenshots (if UI changes)
   - Testing steps
5. Submit the pull request

### Pull Request Guidelines

- **One PR per feature/fix**: Keep changes focused
- **Update documentation**: Include README updates if needed
- **Add tests**: If applicable, add tests for new features
- **Follow code style**: Maintain consistency with existing code
- **Respond to feedback**: Address review comments promptly

### Code Review Process

1. **Automated Checks**: CI/CD will run tests and linting
2. **Manual Review**: Maintainers will review your code
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, your PR will be merged
5. **Recognition**: Contributors are credited in release notes

## 📝 Development Guidelines

### Code Style

- Use ES6+ features
- Follow React best practices
- Use functional components with hooks
- Keep components small and focused
- Use meaningful variable and function names

### Component Structure

```javascript
// Import dependencies
import { useState, useEffect } from 'react'

// Component definition
export default function ComponentName({ props }) {
  // State declarations
  const [state, setState] = useState(initialValue)
  
  // Effect hooks
  useEffect(() => {
    // Effect logic
  }, [dependencies])
  
  // Event handlers
  const handleAction = () => {
    // Handler logic
  }
  
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

### API Route Structure

```javascript
import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET(request) {
  try {
    // Authentication
    const session = await auth()
    
    // Database connection
    await connectToDatabase()
    
    // Business logic
    const data = await fetchData()
    
    // Response
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## 🧪 Testing

```bash
# Run linting
npm run lint

# Build for production
npm run build

# Start production server
npm run start
```

## 📦 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Manual Deployment

```bash
npm run build
npm run start
```

## 🔒 Security

- All API routes are protected with authentication
- Token-based gallery access with expiration
- Secure file storage with AWS S3
- Input validation and sanitization
- SQL injection prevention with Mongoose ODM

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- MongoDB for the database solution
- AWS for S3 storage
- All open-source contributors

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/The-Acers/studioLook/issues)
- **Discussions**: [GitHub Discussions](https://github.com/The-Acers/studioLook/discussions)


## 🗺️ Roadmap

- [ ] Advanced search and filtering
- [ ] Bulk photo operations
- [ ] Client feedback forms
- [ ] Integration with payment systems
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Custom branding options
- [ ] Watermark support
- [ ] Automated backup system

---

**Made with ❤️ by photographers, for photographers**

⭐ Star this repo if you find it helpful!