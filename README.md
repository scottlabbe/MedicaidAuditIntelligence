# Medicaid Audit Intelligence

A professional web application for searching, analyzing, and extracting insights from Medicaid audit reports. The platform provides powerful search capabilities, faceted filtering, dashboard analytics, and export functionality to help program managers and auditors efficiently access and analyze 111+ audit reports spanning the last five years.

## Features

### Core Functionality
- **Advanced Search Interface**: Powerful search with real-time autocomplete suggestions
- **Faceted Filtering**: Filter by state, agency, publication year, and themes
- **Report Details**: Comprehensive report views with objectives, findings, and recommendations
- **Dashboard Analytics**: Visual analytics and insights across all reports
- **Export Capabilities**: Bulk data export for further analysis
- **Keyboard Navigation**: Command palette for power users

### AI-Enhanced Features
- **AI-Assisted Summaries**: Automated scope summaries and insights extraction
- **Model Transparency**: Clear attribution of AI-generated content with model information
- **Keyword Analysis**: Popular keywords section showing top terms by report frequency

### User Experience
- **Responsive Design**: Mobile-friendly interface that works on all devices
- **Fast Performance**: Optimized caching and data fetching strategies
- **Professional UI**: Clean, accessible interface with warm color scheme
- **Citation Support**: Easy copying of report citations for reference

## Technology Stack

### Frontend
- **React** with TypeScript - Modern component-based UI
- **Vite** - Fast development and build tooling
- **TanStack Query** - Server state management and caching
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Accessible component library built on Radix UI
- **Wouter** - Lightweight client-side routing
- **React Hook Form + Zod** - Type-safe form handling and validation

### Backend
- **Express.js** with TypeScript - RESTful API server
- **PostgreSQL** - Relational database for structured data
- **Drizzle ORM** - Type-safe database operations
- **HMAC Authentication** - Secure API authentication
- **Rate Limiting** - API protection and throttling

### Development Tools
- **TypeScript** - End-to-end type safety
- **ESBuild** - Fast JavaScript bundling
- **Drizzle Kit** - Database migration management

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd medicaid-audit-intelligence
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file with the following variables:
```env
DATABASE_URL=your_postgresql_connection_string
NODE_ENV=development
```

4. Push database schema:
```bash
npm run db:push
```

5. Start development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Route page components
│   │   ├── lib/          # Utilities and helpers
│   │   └── hooks/        # Custom React hooks
├── server/                # Backend Express server
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Database operations
│   └── index.ts          # Server entry point
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schema and types
└── public/              # Static assets
```

## Database Schema

The application uses a star schema design centered around audit reports:

- **Reports**: Core audit documents with metadata
- **Objectives**: Report objectives and goals
- **Findings**: Audit findings and observations  
- **Recommendations**: Actionable recommendations
- **Keywords & Themes**: Categorization and tagging
- **AI Processing Logs**: Tracking of AI-generated content

## API Endpoints

- `GET /api/reports` - Search and list reports with filtering
- `GET /api/reports/:id` - Get detailed report information
- `GET /api/dashboard/stats` - Analytics and statistics
- `GET /api/keywords/top` - Top keywords by frequency
- `GET /api/export` - Bulk data export

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio for database management

### Code Style

The project follows TypeScript best practices with:
- Strict type checking enabled
- Path aliases for clean imports (`@/`, `@shared/`)
- Component-based architecture
- Separation of concerns between frontend and backend

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes with descriptive messages
4. Push to your branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Maintain TypeScript type safety
- Follow existing code style and patterns
- Write descriptive commit messages
- Update documentation as needed
- Test your changes thoroughly

## License

This project is proprietary software. All rights reserved.

## Acknowledgments

Built with modern web technologies and best practices for government transparency and accountability in healthcare audit management.