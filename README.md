# TradeLens - Shipping Documentation Portal

A comprehensive web application for managing shipping documentation, powered by Next.js, Supabase, and TypeScript.

## Features

- **Authentication**: Secure login with Magic Links (email-based).
- **Role-Based Access**: Differentiated access for Importers, Exporters, and Agents.
- **Documentation Management**:
  - Upload and manage shipping documents.
  - Real-time preview of documents with OCR transcription.
- **Billing System**:
  - Track transactions and manage payments.
  - Automated status updates based on transaction records.
- **Dashboard**: Comprehensive overview of transactions and documents.

## Tech Stack

- **Frontend**: React 19, Next.js 16.0.5, Tailwind CSS 4.1.17, Shadcn/UI
- **State Management**: Redux Toolkit, React Hook Form, TanStack Table
- **Styling**: Tailwind CSS, Radix UI
- **Utilities**: Lucide React, Date-fns, Class Variance Authority

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- Yarn (v1.22.x)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd tradelens2
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Configure environment variables:
   Create a `.env.local` file in the `frontend` directory:
   ```env
   # Backend URL
   NEXT_PUBLIC_BASE_URL=https://tradelens.app/api
   
   # Supabase Configuration (from backend)
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # Redis Configuration (from backend)
   NEXT_PUBLIC_REDIS_HOST=your-redis-host
   NEXT_PUBLIC_REDIS_PORT=6379
   NEXT_PUBLIC_REDIS_USERNAME=your-redis-username
   NEXT_PUBLIC_REDIS_PASSWORD=your-redis-password
   ```

4. Start the development server:
   ```bash
   yarn dev
   ```

## Usage

- Open [http://localhost:3000](http://localhost:3000) in your browser.
- Use the credentials provided to log in.

## License

ISC

---

**Note**: This project uses Craco for configuration.
