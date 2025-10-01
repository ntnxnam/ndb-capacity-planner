# NDB Capacity Planner

A comprehensive web application for **Nutanix Database Service (NDB) Capacity Planning** with OKTA SSO integration and role-based access control.

## 🚀 Features

- **OKTA SSO Integration** - Secure authentication via nutanix.okta.com
- **Role-Based Access Control (RBAC)** - Three-tier permission system
- **Dynamic Data Collection** - Configurable data fields and validation
- **AI-Powered Calculations** - Generate calculation logic from natural language prompts
- **Modern UI/UX** - Beautiful, responsive interface built with Next.js and Tailwind CSS
- **Production Ready** - Docker containerization and deployment scripts

## 👥 User Roles

| Role | Email | Permissions |
|------|-------|-------------|
| **SuperAdmin** | namratha.singh@nutanix.com | • Full system access<br>• User role management<br>• Configure data fields<br>• Manage calculation logic with AI |
| **Admin** | bharath@nutanix.com | • Edit and manage data<br>• Create/update data entries<br>• View all data and calculations |
| **User** | ndb-tech-leads@nutanix.com members | • View data and calculations<br>• Run existing calculations<br>• Read-only access |

## 🛠 Technology Stack

### Backend
- **Node.js + Express** - RESTful API server
- **TypeScript** - Type-safe development
- **SQLite** - Lightweight database (perfect for quarterly usage)
- **OKTA JWT Verification** - Secure token validation
- **OpenAI Integration** - AI-powered calculation generation

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe frontend development
- **Tailwind CSS** - Modern styling framework
- **OKTA React SDK** - Seamless SSO integration
- **React Query** - Efficient data fetching and caching

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- Docker and Docker Compose (for deployment)
- OKTA application configured for nutanix.okta.com

### 1. Clone and Setup
```bash
git clone <repository-url>
cd ndb-capacity-planner
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your OKTA credentials
nano .env
```

Required OKTA Configuration in `.env`:
```env
OKTA_DOMAIN=https://nutanix.okta.com
OKTA_CLIENT_ID=your_okta_client_id
OKTA_CLIENT_SECRET=your_okta_client_secret
OKTA_ISSUER=https://nutanix.okta.com/oauth2/default
JWT_SECRET=your-secure-jwt-secret-here
```

### 3. Install Dependencies
```bash
npm run install:all
```

### 4. Development Mode
```bash
# Start both frontend and backend in development
npm run dev

# Or start individually
npm run dev:backend    # Backend on :3001
npm run dev:frontend   # Frontend on :3000
```

### 5. Production Deployment
```bash
# Make deploy script executable
chmod +x deploy.sh

# Deploy with Docker Compose
./deploy.sh
```

## 🏗 Project Structure

```
ndb-capacity-planner/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── database/       # SQLite database management
│   │   ├── middleware/     # Auth, RBAC, error handling
│   │   ├── routes/         # API endpoints
│   │   ├── types/          # TypeScript definitions
│   │   └── utils/          # Utility functions
│   ├── Dockerfile
│   └── package.json
├── frontend/               # Next.js React application
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   ├── components/    # Reusable UI components
│   │   └── lib/           # API client & utilities
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # Container orchestration
├── deploy.sh              # Deployment script
└── README.md
```

## 🔐 OKTA Configuration

### Create OKTA Application
1. Log into your Nutanix OKTA admin panel
2. Create a new **Web Application**
3. Configure redirect URIs:
   - `http://localhost:3000/login/callback` (development)
   - `https://your-domain.com/login/callback` (production)
4. Note down **Client ID** and **Client Secret**
5. Assign appropriate user groups (ndb-tech-leads@nutanix.com)

### Required OKTA Settings
- **Grant Types**: Authorization Code, Implicit (Hybrid)
- **Token Endpoint Auth Method**: Client Secret Basic
- **Allowed Scopes**: openid, profile, email

## 🎯 Key Capabilities

### SuperAdmin Powers
- **User Management**: Elevate users between roles (user ↔ admin)
- **Field Configuration**: Create/edit/delete data collection fields
- **AI Calculation Logic**: Use natural language prompts to generate JavaScript calculation functions
- **Full System Control**: Access to all features and data

### Admin Capabilities
- **Data Management**: Create, edit, and delete data entries
- **User Oversight**: View user activity and data history
- **Calculation Execution**: Run all available calculations

### User Access
- **Data Viewing**: Access to all capacity planning data
- **Calculation Execution**: Run calculations on available datasets
- **Dashboard Analytics**: View system statistics and recent activity

## 🤖 AI Integration

The SuperAdmin can create calculation logic using natural language:

**Example Prompt:**
> "Calculate the maximum database capacity based on CPU cores, RAM, and storage. Use 80% utilization threshold and account for overhead."

The AI will generate JavaScript code that:
- Validates available data fields
- Implements the calculation logic
- Includes proper error handling
- Returns structured results

## 📊 Database Schema

### Users Table
- User authentication and role management
- OKTA ID mapping for SSO integration

### Data Fields Table
- Dynamic field configuration
- Type validation (string, number, boolean, date)
- Required field enforcement

### Data Entries Table
- JSON storage for flexible data structures
- Audit trail with creator information
- Timestamp tracking

### Calculation Rules Table
- Calculation logic storage
- AI prompt history
- Version control for rule changes

## 🚢 Deployment Options

### Docker Compose (Recommended)
```bash
docker-compose up -d
```

### Manual Deployment
```bash
# Backend
cd backend
npm run build
npm start

# Frontend (separate terminal)
cd frontend
npm run build
npm start
```

### Environment Variables
See `.env.example` for all configurable options including:
- OKTA credentials
- Database paths
- API endpoints
- AI integration keys

## 🔒 Security Features

- **OKTA JWT Verification** - All API requests validated
- **Role-Based Middleware** - Endpoint-level permission checks
- **CORS Protection** - Configured for specific origins
- **Rate Limiting** - API abuse prevention
- **Helmet.js** - Security headers
- **SQL Injection Prevention** - Parameterized queries

## 📈 Usage Patterns

Perfect for quarterly capacity planning reviews:
- **Quarter Start**: SuperAdmin configures new data fields
- **Data Collection**: Admins input capacity data
- **Analysis**: All users can run calculations and view results
- **Reporting**: Export and analyze capacity trends

## 🆘 Troubleshooting

### Common Issues

**OKTA Authentication Fails**
- Verify OKTA_CLIENT_ID and OKTA_CLIENT_SECRET in .env
- Check redirect URI configuration in OKTA
- Ensure user is in authorized groups

**Database Connection Issues**  
- Check DATABASE_PATH in .env
- Ensure write permissions for database directory
- Verify SQLite installation

**API Connectivity Problems**
- Confirm BACKEND_URL and FRONTEND_URL settings
- Check CORS_ORIGIN configuration
- Verify port availability (3000, 3001)

### Logs and Debugging
```bash
# View application logs
docker-compose logs -f

# Check service status
docker-compose ps

# Access backend logs specifically
docker-compose logs backend

# Access frontend logs specifically  
docker-compose logs frontend
```

## 🤝 Contributing

This application is designed for Nutanix internal use with specific OKTA integration. For modifications:

1. Maintain OKTA authentication requirements
2. Preserve RBAC permission structure
3. Follow TypeScript best practices
4. Update tests for any new features

## 📄 License

Internal Nutanix application - Not for external distribution

---

**Need Help?** Contact the development team or check the internal documentation for OKTA configuration details specific to your Nutanix environment.