# Real-Time Document Collaboration

A NestJS application for real-time collaborative document editing with file upload support and PostgreSQL storage.

## Features

- Real-time document collaboration via WebSocket
- File upload and download support
- User management with CRUD operations
- PostgreSQL database with TypeORM
- Auto-save with debouncing
- Active users tracking per document

## Tech Stack

- **Backend:** NestJS 11
- **Database:** PostgreSQL with TypeORM
- **Real-time:** Socket.io
- **File Upload:** Multer

## Project Structure

```
src/
├── main.ts                    # Application entry point
├── app.module.ts              # Root module
├── user/                      # User management
│   ├── user.controller.ts
│   ├── user.service.ts
│   ├── user.module.ts
│   ├── entities/user.entity.ts
│   └── dto/
├── document/                  # Document management
│   ├── document.controller.ts
│   ├── document.service.ts
│   ├── document.module.ts
│   ├── entities/document.entity.ts
│   └── dto/
└── collaboration/             # Real-time collaboration
    └── collaboration.gateway.ts
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file:

```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_NAME=your_database
DB_SYNC=true
DB_LOGGING=true
```

### 3. Run the application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Endpoints

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/user` | Create user |
| GET | `/user` | Get all users |
| GET | `/user/:id` | Get user by ID |
| PATCH | `/user/:id` | Update user |
| DELETE | `/user/:id` | Delete user |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/documents` | Create text document |
| POST | `/documents/upload` | Upload file document |
| GET | `/documents` | Get all documents |
| GET | `/documents/:id` | Get document by ID |
| GET | `/documents/:id/download` | Download file |
| PATCH | `/documents/:id` | Update document |
| PATCH | `/documents/:id/upload` | Replace file |
| DELETE | `/documents/:id` | Delete document |

## WebSocket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join-document` | `{ documentId, userId, userName }` | Join a document room |
| `leave-document` | `{ documentId, userId }` | Leave a document room |
| `content-change` | `{ documentId, userId, content }` | Send content changes |
| `cursor-move` | `{ documentId, userId, userName, position }` | Send cursor position |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `document-loaded` | `{ id, title, content, fileName, ... }` | Initial document data |
| `content-updated` | `{ userId, content }` | Content changed by another user |
| `active-users` | `{ users: [{ userId, userName }] }` | List of active users |
| `cursor-moved` | `{ userId, userName, position }` | Another user's cursor |

## Testing

1. Start the server: `npm run start:dev`
2. Open `test-collab.html` in your browser
3. Create a user and upload/create a document
4. Open in multiple browser tabs to test real-time sync

## Example Usage

### Create a user

```bash
curl -X POST http://localhost:3000/user \
  -H "Content-Type: application/json" \
  -d '{"name":"John","username":"john","email":"john@example.com","age":25,"gender":"m","password":"Test@123!"}'
```

### Create a document

```bash
curl -X POST http://localhost:3000/documents \
  -H "Content-Type: application/json" \
  -d '{"title":"My Document","content":"Hello World","ownerId":1}'
```

### Upload a file

```bash
curl -X POST http://localhost:3000/documents/upload \
  -F "file=@/path/to/file.pdf" \
  -F "ownerId=1" \
  -F "title=My PDF"
```

## License

MIT
