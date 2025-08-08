# 🎬 Movie Generator

An AI-powered movie script and scene generation application with real-time chat functionality, Google OAuth authentication, and scalable S3-based storage. Built with NestJS, TypeScript, PostgreSQL, and OpenAI's latest models.

## ✨ Features

- **AI Chat Interface**: Real-time chat experience with Server-Sent Events (SSE)
- **Script Generation**: Generate professional movie scripts using GPT-4
- **Image Generation**: Create scene images using DALL-E 3
- **Media Management**: Upload and manage images, videos, and documents
- **Tool Calls**: Visual tool call indicators during AI processing
- **Real-time Updates**: SSE support for live chat experience
- **Google OAuth**: Secure authentication with Google
- **Scalable Storage**: S3-based file storage with PostgreSQL metadata
- **Modern UI**: Beautiful, responsive interface

## 🏗️ Architecture

- **Backend**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM (metadata only)
- **Storage**: AWS S3 for chat content and media files
- **Authentication**: Google OAuth + JWT
- **Real-time**: Server-Sent Events (SSE)
- **AI Integration**: OpenAI API (GPT-4, DALL-E 3)
- **File Upload**: Multer with S3 integration

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd movie-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   DB_DATABASE=movie_generator

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=24h

   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. **Set up PostgreSQL database**
   ```sql
   CREATE DATABASE movie_generator;
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run start:dev

   # Production mode
   npm run build
   npm run start:prod
   ```

6. **Access the application**
   - Backend API: http://localhost:3000
   - Frontend: http://localhost:3000/public/index.html

## 📚 API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login user

### Chat
- `GET /chat/sessions` - Get user's chat sessions
- `POST /chat/sessions` - Create new chat session
- `GET /chat/sessions/:id` - Get specific chat session
- `POST /chat/messages` - Send message

### WebSocket Events
- `joinChat` - Join a chat session
- `sendMessage` - Send a message
- `typing` - Typing indicator

## 🎯 Usage Examples

### Generate a Movie Script
```
User: "Write a sci-fi script about time travel"
AI: [Generates professional screenplay format script]
```

### Generate Scene Images
```
User: "Generate an image of a futuristic city at night"
AI: [Creates high-quality scene image using DALL-E 3]
```

### Combined Workflow
```
User: "Create a horror movie script about a haunted house"
AI: [Generates script, then creates scene images for key moments]
```

## 🛠️ Development

### Project Structure
```
src/
├── entities/          # Database entities
├── controllers/       # API controllers
├── services/         # Business logic
├── dto/              # Data transfer objects
├── guards/           # Authentication guards
├── strategies/       # Passport strategies
├── gateways/         # WebSocket gateways
└── main.ts           # Application entry point
```

### Database Schema
- **Users**: User accounts and authentication
- **ChatSessions**: Chat conversation sessions
- **ChatMessages**: Individual messages with tool calls
- **Scripts**: Generated movie scripts
- **Scenes**: Generated scene images and videos

### Adding New Features

1. **New AI Tool**: Add to `OpenAIService`
2. **New Entity**: Create in `entities/` and add to module
3. **New API Endpoint**: Create controller and service methods
4. **New WebSocket Event**: Add to `ChatGateway`

## 🔧 Configuration

### Environment Variables
- `DB_*`: PostgreSQL connection settings
- `OPENAI_API_KEY`: OpenAI API key
- `JWT_*`: JWT authentication settings
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode

### Database Configuration
The application uses TypeORM with PostgreSQL. In development, `synchronize: true` automatically creates tables. For production, use migrations.

## 🚀 Deployment

### AWS Deployment
1. Set up AWS RDS PostgreSQL instance
2. Configure environment variables for AWS
3. Deploy to EC2 or use container services
4. Set up reverse proxy (nginx) for production

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🔮 Future Enhancements

- [ ] Video generation from scripts
- [ ] Character development tools
- [ ] Storyboarding features
- [ ] Collaboration features
- [ ] Export to Final Draft format
- [ ] Voice synthesis for scripts
- [ ] Advanced scene composition tools

---

Built with ❤️ using NestJS, TypeScript, and OpenAI
