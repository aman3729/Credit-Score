# Role Selector Implementation

## Overview
This document describes the implementation of a role selector in the registration form that allows users to choose their role during account creation and automatically redirects them to the appropriate dashboard based on their role.

## Features Implemented

### 1. Frontend Registration Form (`frontend/src/components/Register.jsx`)
- ✅ Added role selector dropdown to registration form
- ✅ Added role field to form state
- ✅ Added role validation (required field)
- ✅ Role options: Borrower (user), Premium User (premium), Lender (lender), Admin (admin)
- ✅ Role-based redirects after successful registration

### 2. Authentication Service (`frontend/src/services/authService.js`)
- ✅ Added `register` function to handle user registration
- ✅ Properly formats user data including role
- ✅ Stores authentication token after registration
- ✅ Handles registration errors appropriately

### 3. Authentication Context (`frontend/src/contexts/AuthContext.jsx`)
- ✅ Updated login function to return user data for role-based navigation
- ✅ Normalizes user data including role information
- ✅ Maintains role information in user state

### 4. Application Routing (`frontend/src/App.jsx`)
- ✅ Updated `handleLogin` to redirect based on user role
- ✅ Updated `handleRegister` to redirect based on user role
- ✅ Role-based redirects:
  - `user` → `/dashboard`
  - `premium` → `/dashboard`
  - `lender` → `/lender`
  - `admin` → `/admin`

### 5. Backend Validation (`backend/routes/auth.js`)
- ✅ Role validation in registration endpoint
- ✅ Allowed roles: `['user', 'premium', 'lender', 'admin', 'analyst']`
- ✅ Role stored in user document
- ✅ Role included in JWT token

### 6. Protected Routes
- ✅ Existing `ProtectedRoute` component supports role-based access
- ✅ Admin users can access all routes
- ✅ Lender users can access lender and user routes
- ✅ Regular users can only access user routes

## Role Definitions

| Role | Value | Description | Dashboard | Permissions |
|------|-------|-------------|-----------|-------------|
| Borrower | `user` | Standard user | `/dashboard` | View own score, basic report |
| Premium User | `premium` | Enhanced user | `/dashboard` | Full report, score simulations, credit monitoring |
| Lender | `lender` | Lending professional | `/lender` | View applicants, bulk score check, lender dashboard |
| Admin | `admin` | System administrator | `/admin` | Manage users, system config, audit logs, override scores |

## User Flow

### Registration Flow
1. User navigates to `/register`
2. User fills out registration form including role selection
3. Frontend validates role is selected
4. Backend validates role against allowed values
5. User account is created with selected role
6. User is automatically redirected to role-appropriate dashboard

### Login Flow
1. User navigates to `/login`
2. User enters credentials
3. Backend authenticates and returns user data with role
4. Frontend redirects user to role-appropriate dashboard

### Access Control
- Users can only access routes appropriate for their role
- Admin users have access to all routes
- Attempting to access unauthorized routes shows access denied message
- Users are redirected to their dashboard if access is denied

## Testing

### Manual Testing Steps
1. Start backend server: `cd backend && npm start`
2. Start frontend server: `cd frontend && npm run dev`
3. Navigate to `/register`
4. Test registration with different roles:
   - Create a user account with "Borrower" role
   - Create a user account with "Lender" role
   - Create a user account with "Admin" role
5. Verify redirects to appropriate dashboards
6. Test login with different role users
7. Verify role-based access to protected routes

### Expected Behavior
- ✅ Role selector appears in registration form
- ✅ All roles are available for selection
- ✅ Registration validates role selection
- ✅ Users are redirected to appropriate dashboards
- ✅ Login redirects to appropriate dashboards
- ✅ Protected routes enforce role-based access
- ✅ Admin users can access all routes
- ✅ Lender users can access lender routes
- ✅ Regular users can only access user routes

## Files Modified

### Frontend Files
- `frontend/src/components/Register.jsx` - Added role selector
- `frontend/src/services/authService.js` - Added register function
- `frontend/src/contexts/AuthContext.jsx` - Updated login function
- `frontend/src/App.jsx` - Updated routing logic

### Backend Files
- `backend/routes/auth.js` - Already had role validation
- `backend/models/User.js` - Already had role field
- `backend/constants/roles.js` - Already had role definitions

## Security Considerations

- Role validation happens on both frontend and backend
- Backend enforces role restrictions regardless of frontend validation
- JWT tokens include role information for authorization
- Protected routes check user role before allowing access
- Admin users have elevated permissions across the system

## Future Enhancements

- Role-based feature flags
- Dynamic role permissions
- Role upgrade/downgrade functionality
- Role-based email templates
- Role-based analytics and reporting 