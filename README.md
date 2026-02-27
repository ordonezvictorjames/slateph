# Slate - Modern Learning Management System

A comprehensive Learning Management System built with Next.js, React, TypeScript, and Supabase. Slate provides a modern, responsive interface for managing courses, students, instructors, and educational content.

## 🚀 Features

### Core Functionality
- **User Authentication & Authorization** - Secure login/logout with role-based access control
- **Role-Based Dashboard** - Different interfaces for Admin, Instructor, Student, and Developer roles
- **Course Management** - Create, edit, and organize courses with subjects and modules
- **User Management** - Manage system users and their roles
- **Real-time Notifications** - Facebook-style notification system with priority levels
- **Activity Tracking** - System-wide activity logging and monitoring
- **Responsive Design** - Mobile-first design that works across all devices

### User Roles & Permissions

#### Admin
- Full system access and control
- User management and role assignment
- Course creation and management
- System monitoring and analytics
- Activity tracking and logs

#### Instructor
- Course and content management
- Student progress tracking
- Assignment and grade management
- Teaching-focused dashboard

#### Student
- Course enrollment and learning
- Assignment submission
- Progress tracking
- Personalized learning experience

### Technical Features
- **Cross-browser Compatibility** - Works on Chrome, Firefox, Safari, Edge
- **Mobile Responsive** - Optimized for mobile devices and tablets
- **PWA Ready** - Progressive Web App capabilities
- **Real-time Updates** - Live data synchronization
- **Secure Authentication** - JWT-based authentication with Supabase
- **Database Integration** - PostgreSQL with Supabase backend

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **Icons**: Font Awesome
- **Deployment**: Vercel (recommended)

## 📋 Prerequisites

Before running this project, make sure you have:

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account and project
- Git for version control

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/slate-lms.git
cd slate-lms
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project settings.

### 4. Database Setup

Run the SQL migrations in your Supabase SQL editor:

1. Navigate to the `supabase/` directory
2. Execute the migration files in order:
   - `course-management-schema.sql`
   - `setup-custom-authentication.sql`
   - `add-activity-logs-clean.sql`
   - Other migration files as needed

### 5. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 Browser Support

Slate is tested and supported on:

- **Chrome** 90+
- **Firefox** 88+
- **Safari** 14+
- **Edge** 90+
- **Mobile browsers** (iOS Safari, Chrome Mobile)

## 📱 Mobile Compatibility

The application is fully responsive and optimized for:

- **Mobile phones** (320px and up)
- **Tablets** (768px and up)
- **Desktop** (1024px and up)
- **Large screens** (1440px and up)

### Mobile Features
- Touch-friendly interface with proper touch targets
- Responsive navigation and menus
- Optimized layouts for small screens
- Safe area support for notched devices

## 🔧 Configuration

### Customization Options

1. **Branding**: Update colors and logos in `tailwind.config.js`
2. **Features**: Enable/disable features in component files
3. **Roles**: Modify user roles in `src/types/index.ts`
4. **Database**: Customize schema in Supabase SQL files

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms

The application can be deployed on:
- Netlify
- AWS Amplify
- Railway
- Any Node.js hosting platform

## 📁 Project Structure

```
slate-lms/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── (auth)/         # Authentication pages
│   │   ├── admin/          # Admin-specific pages
│   │   ├── api/            # API routes
│   │   └── globals.css     # Global styles
│   ├── components/         # React components
│   │   ├── pages/          # Page components
│   │   ├── ui/             # UI components
│   │   └── Dashboard.tsx   # Main dashboard
│   ├── contexts/           # React contexts
│   ├── lib/                # Utility libraries
│   └── types/              # TypeScript types
├── supabase/               # Database migrations
├── public/                 # Static assets
└── package.json           # Dependencies
```

## 🧪 Testing

Run the test suite:

```bash
npm run test
# or
yarn test
```

For watch mode:

```bash
npm run test:watch
# or
yarn test:watch
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Write tests for new features
- Follow the existing code structure
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/slate-lms/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

## 🔄 Updates & Changelog

### Version 1.0.0
- Initial release
- Core LMS functionality
- Role-based access control
- Mobile responsive design
- Cross-browser compatibility

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Supabase](https://supabase.com/) for the backend infrastructure
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Font Awesome](https://fontawesome.com/) for the icon library

---

**Built with ❤️ for modern education**