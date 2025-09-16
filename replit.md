# React Admin Dashboard

## Overview

A comprehensive admin dashboard application built with React, TypeScript, and Node.js that serves as a foundation for building larger applications. The system features a modular architecture with authentication, authorization, multi-tenancy support, and a rich set of UI components. It provides role-based and permission-based access control, user management, and a responsive interface with modern design patterns.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development practices
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with custom design system using CSS variables and themes
- **UI Components**: Custom component library built on Radix UI primitives (shadcn/ui style)
- **State Management**: React Context for authentication and theme management
- **Routing**: React Router v6 with nested routing and error boundaries
- **Icons**: Lucide React and Tabler Icons for consistent iconography

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for full-stack type safety
- **API Design**: RESTful APIs with Swagger/OpenAPI documentation
- **Middleware**: Custom authentication, authorization, validation, and rate limiting
- **File Handling**: Express-fileupload for file upload capabilities
- **Security**: JWT-based authentication with bcrypt password hashing

### Database Architecture
- **ORM**: Drizzle ORM for type-safe database operations and migrations
- **Database**: PostgreSQL (configured for PostgreSQL dialect)
- **Schema Management**: Migration-based schema evolution with timestamp prefixes
- **Multi-tenancy**: Tenant-scoped data isolation across all entities

### Core Database Schema
- **Tenant**: Multi-tenancy support with tenant isolation
- **User**: User accounts with tenant association and role-based access
- **Role**: Hierarchical role system with permission mapping
- **Permission**: Granular permission system for fine-grained access control
- **UserRole**: Many-to-many relationship between users and roles
- **RolePermission**: Many-to-many relationship between roles and permissions
- **Option**: System configuration and settings storage
- **Department**: Demo entity showing typical CRUD operations

### Authentication & Authorization
- **Authentication**: JWT token-based with secure token storage
- **Authorization**: Role-based access control (RBAC) with permission-based granular control
- **Session Management**: Automatic token refresh and expiration handling
- **Multi-tenant Security**: Tenant-scoped data access and user switching capabilities

### Component Architecture
- **Error Boundaries**: Comprehensive error handling with development/production modes
- **Authorization Components**: Declarative access control with role/permission checking
- **Data Components**: Reusable pagination, sorting, and table components
- **Form Components**: Form validation with React Hook Form and Zod schemas
- **Navigation**: Responsive sidebar with nested menu items and breadcrumbs

### Development Features
- **Type Safety**: Full TypeScript coverage from database to UI
- **Validation**: Zod schemas for runtime validation and type inference
- **Error Handling**: Development-friendly error messages with production fallbacks
- **Development Tools**: Hot reload, database studio, and comprehensive logging

## External Dependencies

### Database
- **PostgreSQL**: Primary relational database for data persistence
- **Drizzle ORM**: Type-safe database operations and schema management
- **Database Migrations**: Automated schema versioning and deployment

### Authentication & Security
- **JWT (jsonwebtoken)**: Token-based authentication
- **bcryptjs**: Password hashing and verification
- **express-rate-limit**: API rate limiting and abuse prevention

### UI & Styling
- **Radix UI**: Accessible component primitives for complex interactions
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Framer Motion**: Animation library for smooth transitions
- **Lucide React**: Modern icon library
- **Tabler Icons**: Additional icon set

### Data Handling
- **Axios**: HTTP client for API communications
- **React Hook Form**: Form state management and validation
- **@hookform/resolvers**: Zod integration for form validation
- **Zod**: Runtime type validation and schema definition
- **fast-csv**: CSV import/export functionality

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type system and compiler
- **nodemon**: Development server auto-restart
- **tsx**: TypeScript execution environment

### Email Services
- **Nodemailer**: Email sending for password resets and notifications
- **SMTP Configuration**: Configurable email transport

### Testing & Documentation
- **Playwright MCP Framework**: Business analyst testing framework with natural language support in `testing/` directory
- **Swagger/OpenAPI**: API documentation and testing interface
- **React Router**: Client-side routing with error boundaries

### File Management
- **express-fileupload**: File upload handling
- **DOMPurify**: HTML sanitization for security
- **date-fns**: Date manipulation and formatting

### Performance & UX
- **@tanstack/react-table**: Advanced table functionality
- **@dnd-kit**: Drag and drop interactions
- **Sonner**: Toast notifications
- **class-variance-authority**: Component variant management