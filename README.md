# Credit Score Dashboard

A full-stack application for managing and visualizing credit scores.

## Features

- User authentication and authorization
- Credit score visualization
- Historical data tracking
- Interactive dashboard
- RESTful API backend

## Tech Stack

### Frontend
- React 18
- Vite
- TailwindCSS
- React Router
- Axios

### Backend
- Node.js
- Express
- MongoDB with Mongoose
- JWT Authentication
- CORS enabled

## Prerequisites

- Node.js (v16 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository
```bash
git clone [repository-url]
cd credit-score-dashboard
```

2. Install Backend Dependencies
```bash
cd backend
npm install
```

3. Install Frontend Dependencies
```bash
cd frontend
npm install
```

4. Set up environment variables:
   - Copy `.env.example` to `.env` in both frontend and backend directories
   - Update the variables with your configuration

## Development

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`
The backend API will be available at `http://localhost:3000`

## Production Build

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Start the production server:
```bash
cd backend
npm start
```

## API Documentation

The API endpoints are documented using Swagger and can be accessed at `/api-docs` when running the backend server.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License. 