# Felicity Event Management System (EMS)

**Name:** Shivansh Santoki
**Roll Number:** 2024101119

### Frontend
- **React**: Chosen for its component-based architecture, making it easy to build reusable UI elements and manage complex state efficiently in a single-page application.
- **Vite**: Used as the build tool and development server for its extremely fast hot module replacement (HMR) and optimized build process compared to traditional tools like Create React App.
- **react-router-dom**: Essential for handling client-side routing, enabling navigation between different views (dashboards, event details, registration) without page reloads.
- **axios**: Preferred over native fetch for its automatic JSON parsing, request/response interceptors, and simplified syntax for making HTTP requests.
- **socket.io-client**: Used to establish real-time, bi-directional communication with the backend for the Team Chat feature.
- **fuse.js**: A lightweight, powerful fuzzy-search library used for implementing rapid and forgiving search functionality on the frontend without requiring complex backend query logic.

### Backend
- **Node.js & Express**: Express is a minimal and flexible Node.js web application framework that provides a robust set of features to develop RESTful APIs quickly and efficiently.
- **Mongoose**: An Object Data Modeling (ODM) library for MongoDB and Node.js. It simplifies database interactions by providing schema validation, managing relationships between data, and translating between objects in code and their representation in MongoDB.
- **jsonwebtoken (JWT)**: Used for stateless, secure authentication. It allows the server to verify the user's identity securely, preventing session state reliance in the database.
- **bcryptjs**: Used for securely hashing user passwords before storing them in the database, protecting against rainbow table attacks.
- **socket.io**: The server-side library corresponding to `socket.io-client`, enabling the real-time websocket connections necessary for the Team Chat feature.
- **@getbrevo/brevo**: A reliable transactional email API used to send event tickets, payment confirmations, and OTPs. Chosen because it provides a generous free tier and reliable deliverability.
- **qrcode**: A library to dynamically generate QR code data URLs for event tickets and merchandise purchases, allowing organizers to effectively scan and verify entries.

---

## Advanced Features Implemented

### Tier A: Core Advanced Features

**1. Hackathon Team Registration**
- **Justification**: Hackathons inherently require team collaboration. A robust registration flow ensures only fully matched teams are confirmed, preventing stranded participants and simplifying organizer logistics.
- **Design Choices & Implementation**: The feature tracks the team's status (Pending/Confirmed). A Team Leader creates the team and shares an invite code. Members join using this code. Registration is finalized, and tickets are generated only when the team size meets the minimum limit.
- **Technical Decisions**: We used a single registration document linked to a team document. When a user joins via a code, backend route logic updates both the team members array and the user's registration statuses immediately ensuring data consistency.

**2. Merchandise Payment Approval Workflow**
- **Justification**: Merchandise management requires strict tracking of payments, proofs, and inventory limits. Automating parts of this eliminates manual errors and potential fraud.
- **Design Choices & Implementation**: Participants upload payment proofs (images) while buying merchandise. The order naturally enters a "Pending Approval" state. Organizers use a dedicated dashboard to uniquely review uploaded proofs, approving or rejecting individual purchases. 
- **Technical Decisions**: QR codes and tickets are explicitly withheld on the backend level until the order status resolves to "Approved". Stock decreases only when the order is successfully approved by the organizer.

### Tier B: Real-time & Communication Features

**1. Organizer Password Reset Workflow**
- **Justification**: Organizers losing access to their accounts is a common security/maintenance issue. An admin-managed recovery workflow ensures hijacked accounts are caught before resetting passwords.
- **Design Choices & Implementation**: An organizer requests a reset, attaching a reason to the payload. The Admin sees all requests in an admin table. The Admin can approve (auto-generating a new password) or reject (appending comments for why).
- **Technical Decisions**: Instead of sending standard automatic email links for resets, the system generates a secure temporary password right into the system dashboard that the Admin manually shares later, providing a strict additional layer of administrative oversight.

**2. Team Chat**
- **Justification**: Teams often require an immediate space to communicate effectively once formed without jumping context to external tools (Discord/WhatsApp).
- **Design Choices & Implementation**: Gives isolated, real-time message broadcasting functionality strictly bounded to team members of a hackathon. The UI supports typing indicators, file/link sharing formatting, and time-stamped chat bubbles.
- **Technical Decisions**: Built on top of `socket.io`. Messages are simultaneously persisted to MongoDB via mongoose and synchronously broadcasted to the namespace corresponding to the specific team's Socket room to ensure no messages are lost if users disconnect/reconnect.

### Tier C: Integration & Enhancement Features

**1. Add to Calendar Integration**
- **Justification**: Users frequently forget events if they register well in advance. Adding registered events cleanly to personal calendars dramatically decreases no-show rates.
- **Design Choices & Implementation**: Displays options to generate Google Calendar links, Outlook web links, and structurally sound downloadable `.ics` extension files universally on the user's "My Registrations" view.
- **Technical Decisions**: The backend buffers `.ics` file constructs dynamically with accurate UTC timezone data alongside venue specifications to pass validation formats. Google/Outlook web links are composed strictly using encodeURIComponent parameters directing directly to their respective portals perfectly filled in.

---

## Setup and Installation Instructions

### Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB instance running locally, or a hosted MongoDB Atlas URI string
- API Key from Brevo (Required to utilize the email and OTP functionalities effectively)

### 1. Clone the repository
bash
git clone <repository_url>
cd Felicity_EMS


### 2. Backend Setup
bash
cd backend
npm install

- Create a `.env` file in the `backend` directory containing the following critical variables:
 env
PORT,
MONGO_URI,
JWT_SECRET,
BREVO_API_KEY,
BREVO_SENDER_EMAIL,
- Start the server:
bash
# Run in Development mode
npm run dev

# Run in Production mode
npm start

### 3. Frontend Setup
Open an entirely new or split terminal window:
\`\`\`bash
cd frontend
npm install
\`\`\`
- Create a `.env` file in the base of the `frontend` directory:
\`\`\`env
VITE_API_URL=http://localhost:5000
\`\`\`
- Execute the application's client development environment:
\`\`\`bash
npm run dev
\`\`\`

### 4. Admin Account Initialization (Optional)
To quickly inject the initial admin account necessary for managing Organizer accounts/password resets:
\`\`\`bash
cd backend
node seedAdmin.js
\`\`\`
