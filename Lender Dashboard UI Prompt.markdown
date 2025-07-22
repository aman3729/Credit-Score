Ultra-Specific UI Design Prompt for Lender Dashboard Login Page
Overview
Design a modern, aesthetically pleasing, and highly functional login page for the Lender Dashboard, tailored for underwriters and borrowers accessing their respective dashboards. The login page should exude professionalism, align with the existing dashboard’s aesthetic (neutral tones, clean layout, sans-serif typography), and prioritize user experience. The design must be PC-first (optimized for 1440px desktop screens) but fully responsive for mobile devices (320px-768px). The page should balance security, accessibility, and visual appeal, creating a seamless entry point to the dashboard.
Design Requirements
General Guidelines

Style: Modern, minimalist, and professional with a welcoming yet secure feel.
Color Scheme: Neutral base (white #FFFFFF, light gray #F8F9FA) with primary accents in navy blue (#1A3C5E) and secondary accents in teal (#17A2B8). Use red (#DC3545) for error states and green (#28A745) for success messages.
Typography: Sans-serif font (e.g., Inter or Roboto, weights 400 and 700). Font sizes: 32px for title, 18px for labels, 16px for body text, 14px for helper text.
Layout: Centered card-based design with subtle shadows and rounded corners. Use a 12-column grid with 24px gutters for desktop.
Responsiveness: Fully responsive for mobile (stack elements vertically, adjust font sizes by 10%, reduce padding to 16px).
Interactivity: Smooth animations (e.g., 0.3s fade-in for card, hover effects on buttons). Include loading states and error handling.
Accessibility: WCAG 2.1 compliance (4.5:1 contrast ratio, ARIA labels, keyboard navigation, screen reader support).

Components and Layout
1. Header Section

Logo: Place the Lender Dashboard logo (placeholder: stylized text “LenderHub” in navy blue, 24px, bold) at the top-left or center of the page.
Title: “Welcome to LenderHub” (32px, bold, navy blue) centered above the login card.
Subtitle: “Sign in to access your dashboard” (18px, light gray #6C757D) below the title.
Styling: Use a full-width header with 24px padding. Center-align title and subtitle on desktop; stack vertically on mobile.

2. Login Card (Centered, 400px wide on desktop)

Background: White card (#FFFFFF) with subtle shadow (box-shadow: 0 4px 12px rgba(0,0,0,0.1)) and 8px border-radius.
Fields:
Email/Username Input:
Label: “Email or Username” (18px, bold, navy blue).
Input: Text field with placeholder “Enter your email or username” (16px, gray #6C757D).
Styling: Bordered (1px, light gray #CED4DA), 8px border-radius, 12px padding. On focus, border changes to teal (#17A2B8).


Password Input:
Label: “Password” (18px, bold, navy blue).
Input: Password field with placeholder “Enter your password” (16px, gray #6C757D).
Features: Eye icon (toggle visibility, Font Awesome fa-eye/fa-eye-slash) aligned right inside the input.
Styling: Same as email input. Ensure password masking is secure.


Remember Me Checkbox:
Label: “Remember me” (16px, gray #6C757D).
Styling: Square checkbox with teal fill on check. Place below password field, left-aligned.


Forgot Password Link:
Text: “Forgot Password?” (14px, teal #17A2B8, underlined on hover).
Placement: Right-aligned below password field.
Action: Opens a modal for password reset with email input and “Send Reset Link” button.


Login Button:
Text: “Sign In” (18px, bold, white).
Styling: Full-width, teal background (#17A2B8), 8px border-radius, 12px padding. Hover: Darken to #138496. Disabled state: Gray (#6C757D).
Loading State: Show spinning loader (white, 24px) with “Signing In…” text.




Error/Success Messages:
Display below inputs (e.g., “Invalid email or password” in red #DC3545 or “Login successful” in green #28A745).
Styling: 14px, italic, with 8px margin-top. Fade in/out with 0.3s animation.


Styling: Card has 32px internal padding, 16px spacing between elements. Center on page with max-width 400px on desktop, 90% width on mobile.
Interactivity: Validate inputs in real-time (e.g., email format, password length ≥8). Disable button until inputs are valid.

3. Alternative Login Options

Title: “Or sign in with” (16px, gray #6C757D, centered).
Options:
Google Login: Button with Google logo (SVG, 24px) and text “Sign in with Google” (16px, white).
SSO Option: Button with generic SSO icon (e.g., lock, 24px) and text “Sign in with SSO” (16px, white).


Styling: Buttons are full-width, 8px border-radius, with navy blue background (#1A3C5E). Hover: Darken to #142A44. Space buttons 12px apart.
Placement: Below login card, separated by a horizontal divider (1px, light gray #CED4DA).

4. Footer Section

Content:
Links: “Create Account” (teal #17A2B8, underlined on hover) and “Privacy Policy” (gray #6C757D, underlined on hover).
Support: “Need help? Contact Support” (14px, gray #6C757D, with email link to support@lenderhub.com).


Styling: Full-width footer with 16px padding, centered text. On mobile, stack links vertically.
Interactivity: “Create Account” links to a registration page; “Privacy Policy” opens a modal with placeholder text.

Interaction Details

Animations:
Login card fades in on page load (0.5s ease-in).
Button hover: Scale up by 1.05, 0.2s transition.
Error messages slide in from top (0.3s).


Form Validation:
Email: Check for valid format (e.g., user@domain.com) with regex.
Password: Minimum 8 characters, show strength indicator (weak: red, medium: yellow, strong: green).
Real-three


Modals:
Forgot Password: Modal with email input, “Send Reset Link” button (teal), and “Cancel” button (gray). Centered, 300px wide, with 8px border-radius.
Privacy Policy: Modal with placeholder text, scrollable, and “Close” button.


Loading States: Show a spinner (teal, 24px) on form submission. Disable inputs during submission.
Keyboard Navigation: Support Tab key to cycle through inputs, buttons, and links. Enter key submits the form.

Responsive Design

Desktop (1440px):
Centered login card (400px wide), header and footer full-width.
24px padding and margins, 32px title font.


Tablet (768px):
Card width: 80% of screen (max 500px).
Reduce font sizes by 10% (e.g., title: 28px, labels: 16px).
Stack header, card, and footer vertically.


Mobile (320px-480px):
Card width: 90% of screen.
Reduce padding to 16px, font sizes by 15% (e.g., title: 26px, labels: 15px).
Hide “Or sign in with” text; show Google/SSO buttons as icons only (32px, square).
Stack all elements vertically, increase button height to 48px for touch targets.



Technical Requirements

Framework: React with Tailwind CSS for styling. Use CDN links for React, ReactDOM, and Tailwind (e.g., https://cdn.tailwindcss.com).
Data Binding: Handle form inputs with React state (e.g., { email: "", password: "" }). Mock API call for login validation.
Security:
Use HTTPS for form submission.
Sanitize inputs to prevent XSS attacks.
Store “Remember Me” token securely (e.g., localStorage with encryption).


Performance: Lazy-load modals and external scripts (e.g., Google SSO). Optimize images (logo) to <50KB.
Accessibility:
ARIA labels: aria-label="Email or Username input", aria-label="Password input".
Contrast ratios: Navy blue text (#1A3C5E) on white (#FFFFFF) = 9.2:1.
Screen reader support: Announce error messages and loading states.



Visual Mockup Notes

Background: Subtle gradient (white #FFFFFF to light gray #F8F9FA) or a clean hero image (e.g., abstract financial charts, blurred).
Login Card: Centered with subtle shadow, rounded corners, and 32px padding. Teal accents for inputs and buttons.
Icons: Use Font Awesome for password toggle (eye) and SSO buttons. Google logo as SVG for clarity.
Error States: Red border on invalid inputs, with error message below (e.g., “Please enter a valid email”).
Mobile Adjustments: Larger touch targets (48px buttons), simplified layout, hidden non-essential text.

Deliverables

A React-based HTML file with Tailwind CSS for styling.
A JSON schema for form data (e.g., { email: string, password: string, rememberMe: boolean }).
A low-fidelity wireframe (in comments) to visualize desktop and mobile layouts.
