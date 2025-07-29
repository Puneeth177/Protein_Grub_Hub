---
description: Repository Information Overview
alwaysApply: true
---

# Protein Grub Hub Information

## Summary
Protein Grub Hub (PGH) is a web application for protein-focused meal delivery and nutrition tracking. It features a responsive design with a modern UI, user authentication, meal browsing, shopping cart functionality, and protein intake tracking.

## Structure
The project follows a full-stack architecture with separate frontend and backend components:
- **Frontend**: Angular 20 application with standalone components
- **Backend**: Node.js/Express API with MongoDB database

## Language & Runtime
**Frontend**:
- **Language**: TypeScript/JavaScript
- **Framework**: Angular 20
- **Build System**: Angular CLI
- **Package Manager**: npm

**Backend**:
- **Language**: JavaScript (Node.js)
- **Framework**: Express.js
- **Database**: MongoDB
- **Package Manager**: npm

## Dependencies

### Frontend Dependencies
**Main Dependencies**:
- Angular Core/Common/Router (^20.1.0)
- Angular SSR (^20.1.3)
- Express (^5.1.0)
- RxJS (~7.8.0)

**Development Dependencies**:
- Angular CLI (^20.1.3)
- TypeScript (~5.8.2)
- Jasmine/Karma (Testing)

### Backend Dependencies
- Express (^4.18.2)
- Mongoose (^7.0.3)
- JSON Web Token (^9.0.0)
- bcryptjs (^2.4.3)
- dotenv (^16.0.3)
- cors (^2.8.5)

## Build & Installation

### Frontend
```bash
cd frontend
npm install
ng serve
```

### Backend
```bash
npm install
npm run dev
```

### Production Build
```bash
cd frontend
ng build --configuration production
```

## Testing
**Framework**: Jasmine/Karma
**Test Location**: Frontend tests in respective component directories
**Run Command**:
```bash
cd frontend
ng test
```

## Design System

### Color Palette
- **Primary**: Green (#4a7c59, #2d5a27)
- **Background**: Light (#f8f9fa) / Dark theme supported
- **Text**: Dark (#333333) / Light for dark theme

### Theme System
The application implements a comprehensive theming system with:
- CSS custom properties for colors, spacing, and typography
- Dark theme support with `.dark-theme` class
- Smooth transitions between themes

### Components
- Responsive navigation header
- Card-based UI for meals
- Custom buttons with hover states
- Form controls with consistent styling

## Key Features
- **Homepage**: Landing page with hero section and features showcase
- **Meal Catalog**: Browse protein-rich meals with filtering
- **User Authentication**: Registration and login system
- **Shopping Cart**: Add meals with quantity management
- **Responsive Design**: Mobile-first approach with breakpoints for different devices
- **Dark Theme Support**: Complete theming system for light/dark modes

## Future Enhancements
- User dashboard with protein tracking
- Meal customization options
- Payment integration
- Admin portal
- Mobile app (PWA)
- Backend API integration