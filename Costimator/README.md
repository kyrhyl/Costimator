# Costimator

**DPWH Integrated Cost Estimation System**

A comprehensive Next.js application combining:
- **Quantity Takeoff** - Grid-based structural quantity estimation
- **Unit Price Analysis (UPA/DUPA)** - Detailed cost breakdowns
- **Bill of Quantities (BOQ)** - Project-based estimation and management

---

## 🚀 Features

### Quantity Takeoff System
- Grid-based structural modeling
- Floor level management
- Element templates (beams, columns, slabs)
- Automated quantity calculations
- Floor plan visualization
- Earthwork and excavation analysis
- Doors/windows schedules
- Complete traceability

### UPA/DUPA Management
- Reusable DUPA templates
- Labor, equipment, and material entries
- Location-based rate instantiation
- Add-on calculations (OCM, CP, VAT)
- Support for "As Submitted" and "As Evaluated" pricing

### BOQ & Project Management
- Project-based organization
- BOQ import/export
- Automatic pricing from rate items
- Comprehensive cost breakdowns
- Report generation
- Master data management (materials, labor, equipment, pay items)

---

## 🛠️ Technology Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **UI:** React 18 + Tailwind CSS 4
- **Database:** MongoDB + Mongoose 9
- **Testing:** Vitest + Testing Library
- **Validation:** Zod
- **PDF Export:** jsPDF
- **Data Processing:** PapaParse, XLSX

---

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB (local or cloud instance)

---

## 🏁 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set your MongoDB URI:

```env
MONGODB_URI=mongodb://localhost:27017/costimator
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm test` | Run tests with Vitest |
| `npm run test:ui` | Run tests with UI |
| `npm run test:coverage` | Generate coverage report |
| `npm run seed:pay-items` | Seed pay items database |

---

## 📁 Project Structure

```
Costimator/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── api/          # API routes
│   │   ├── projects/     # Project management
│   │   ├── estimate/     # Estimates
│   │   ├── catalog/      # Pay items catalog
│   │   └── ...
│   ├── components/       # React components
│   │   ├── takeoff/      # Quantity takeoff components
│   │   └── ...
│   ├── lib/              # Business logic
│   │   ├── costing/      # Cost calculations
│   │   ├── logic/        # Takeoff logic (grid, levels, elements)
│   │   ├── math/         # Geometry utilities
│   │   └── db/           # Database utilities
│   ├── models/           # Mongoose models
│   ├── types/            # TypeScript types
│   └── data/             # Static data files
├── public/               # Static assets
├── docs/                 # Documentation
├── scripts/              # Utility scripts
└── ...config files
```

---

## 🧪 Testing

Run all tests:
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

Coverage report:
```bash
npm run test:coverage
```

---

## 📚 Documentation

Detailed documentation is available in the `/docs` folder:

- [Integration Plan](../INTEGRATION_PLAN.md)
- [Migration Map](../MIGRATION_MAP.md)
- Feature-specific docs in `/docs`

---

## 🔒 Environment Variables

See [.env.example](.env.example) for all required environment variables.

**Required:**
- `MONGODB_URI` - MongoDB connection string

---

## 🤝 Contributing

This is an integrated codebase from:
- **BuildingEstimate** - Quantity takeoff system
- **cost-estimate-application** - UPA/DUPA and BOQ system

See [INTEGRATION_PLAN.md](../INTEGRATION_PLAN.md) for integration details.

---

## 📄 License

Private - DPWH Internal Use

---

## 🆘 Support

For issues or questions, refer to project documentation or contact the development team.

---

*Built with ❤️ for DPWH cost estimation*
