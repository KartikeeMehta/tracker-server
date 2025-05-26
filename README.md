# Tracker Server

Backend server for the Productivity Tracker application.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file with the following variables:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your_mongodb_uri
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
JWT_SECRET=your_jwt_secret
CLIENT_URL=your_client_url
```

3. Start the server:

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

- `/api/auth` - Authentication endpoints
- `/api/users` - User management
- `/api/sessions` - Session tracking
- `/api/projects` - Project management
- `/api/teams` - Team management
- `/api/timeline` - Timeline data
- `/api/tabs` - Tab tracking

## Environment Variables

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `MONGODB_URI` - MongoDB connection string
- `CLOUDINARY_*` - Cloudinary configuration
- `JWT_SECRET` - JWT signing secret
- `CLIENT_URL` - Frontend application URL
