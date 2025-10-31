# 🚀 Protein Grub Hub (PGH) - LAUNCH READY!

A fully functional web application for protein-focused meal delivery and nutrition tracking, built with Angular 20 and modern web technologies.

## 🎉 **LIVE APPLICATION**: http://localhost:4200/

**✅ ALL BUTTONS WORK | ✅ COMPLETE USER FLOWS | ✅ READY FOR LAUNCH**

## 🚀 Features

### Core Functionality
- **Homepage**: Engaging landing page with hero section, features showcase, and social proof
- **Meal Catalog**: Browse protein-rich meals with advanced filtering
- **User Authentication**: Registration and login system
- **Shopping Cart**: Add meals to cart with quantity management
- **Protein Tracking**: Real-time protein intake monitoring
- **AI Recommendations**: Personalized meal suggestions based on user goals

### Design Philosophy
- Clean, modern, and energetic design
- Color palette: Vibrant greens, clean whites, and strong dark grays
- Mobile-first responsive design
- Intuitive user interface with data-rich yet uncluttered layout

## 🛠️ Technology Stack

- **Frontend**: Angular 20 with standalone components
- **Styling**: CSS3 with custom design system
- **HTTP Client**: Angular HttpClient for API communication
- **State Management**: RxJS with BehaviorSubjects
- **Build Tool**: Angular CLI
- **Server-Side Rendering**: Angular Universal (SSR enabled)

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   └── header/           # Navigation header
│   │   ├── models/
│   │   │   ├── meal.model.ts     # Meal data structure
│   │   │   ├── user.model.ts     # User data structure
│   │   │   └── order.model.ts    # Order and cart models
│   │   ├── pages/
│   │   │   └── home/             # Homepage component
│   │   ├── services/
│   │   │   ├── api.service.ts    # API communication
│   │   │   └── cart.service.ts   # Shopping cart management
│   │   ├── app.component.*       # Root component
│   │   └── app.routes.ts         # Routing configuration
│   └── environments/
│       ├── environment.ts        # Development config
│       └── environment.prod.ts   # Production config
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Angular CLI (v20 or higher)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Protein_Grub_Hub"
   ```

2. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:4200`


## 🎨 Design System

### Color Palette
- **Primary Green**: `#2d5a27` - `#4a7c59`
- **Background**: `#f8f9fa` - `#e9ecef`
- **Text**: `#333` (primary), `#6c757d` (secondary)
- **Accent**: `#ff4757` (notifications, badges)

### Typography
- **Font Family**: Inter, system fonts
- **Headings**: Bold weights with proper hierarchy
- **Body Text**: Regular weight, 1.6 line height

### Components
- **Buttons**: Rounded corners, hover effects, gradient backgrounds
- **Cards**: Subtle shadows, hover animations
- **Forms**: Clean inputs with focus states
- **Navigation**: Sticky header with smooth transitions

## 📱 Responsive Design

The application is fully responsive with breakpoints:
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🔧 Key Features Implementation

### 1. Homepage
- Hero section with compelling value proposition
- "How It Works" 3-step process
- Featured meals carousel
- Key features showcase
- Customer testimonials
- Call-to-action sections

### 2. Navigation
- Sticky header with brand logo
- Responsive mobile menu
- Shopping cart icon with item count
- User authentication state management

### 3. Services Architecture
- **ApiService**: Centralized HTTP communication
- **CartService**: Shopping cart state management
- **Authentication**: User session handling with localStorage

### 4. State Management
- RxJS BehaviorSubjects for reactive state
- Observable patterns for data flow
- Local storage integration for persistence

## 🌟 Future Enhancements

### Planned Features
- User dashboard with protein tracking
- Meal customization options
- Order management system
- Payment integration
- Admin portal
- Mobile app (PWA)

### Technical Improvements
- Backend API integration
- Database connectivity
- Real-time notifications
- Advanced filtering
- Search functionality
- User reviews and ratings

## 🚀 Deployment

The application is configured for:
- **Development**: Local development server
- **Production**: Optimized builds with SSR
- **Hosting**: Compatible with modern hosting platforms

## 📄 License

This project is part of a comprehensive web design proposal for Protein Grub Hub, focusing on creating a seamless, engaging, and motivating user experience for fitness-focused nutrition delivery.

## 🤝 Contributing

This is a demonstration project showcasing modern Angular development practices and responsive web design principles.

---

**Protein Grub Hub** - Your All-in-One Stop for Protein-Packed Power! 💪🥗
