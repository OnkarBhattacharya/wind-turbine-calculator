# Wind Turbine Calculator

[![TypeScript](https://img.shields.io/badge/language-Typescript-blue.svg)](https://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

An interactive web calculator that estimates the number of 10kW (and other small-scale) wind turbines required for a site, based on GPS coordinates and target energy output. It leverages NASA POWER wind climatology data, considers wind rose visualization, turbine spacing, terrain/roughness, loss models, and provides full-site and economic analysis for end-users.

---

## Features

- 🌐 **Live NASA POWER Wind Data**: Fetches multi-year climatological wind speed and direction globally via open API.
- 🗺️ **Intuitive UI**: Two-panel SaaS-style design, featuring sticky input/sidebar and a dynamic results panel.
- 🌪️ **Wind Rose Visualization**: Animated SVG/Canvas wind rose based on on-site prevailing winds.
- 🔢 **Precise Calculation Models**:
  - Weibull & IEC-61400 methods for wind prediction.
  - Wake loss, electrical/infrastructure loss, blade degradation, icing, curtailment, and operational losses.
  - Air density adjustment by site elevation.
- ⚙️ **Customizable Turbine Library**: Simulates multiple models (1kW, 3kW, 5kW, 10kW) with real-world power curves.
- 🌱 **Terrain & Siting Controls**: Account for terrain roughness, site layout, spacing, and land use.
- 📊 **Annual/Monthly Yield**: Breaks down expected energy production and seasonal variation.
- ➕ **Built with**: TypeScript, React, Vite, TailwindCSS, Radix UI, and modern JS/TS libraries.

---

## Demo

> **Note:** Unlike demo sites, this tool performs API calls and site-specific computations. Enter valid coordinates for best results.

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [pnpm](https://pnpm.io/) (preferred) or npm/yarn

### Instructions

```bash
# 1. Clone the repo
git clone https://github.com/OnkarBhattacharya/wind-turbine-calculator.git
cd wind-turbine-calculator

# 2. Install dependencies
pnpm install

# 3. Start development server
pnpm dev

#   ...or build and run production server:
pnpm build
pnpm start
```

The app runs at [http://localhost:3000](http://localhost:3000) by default.

---

## Usage

1. **Enter a GPS coordinate** (latitude & longitude).
2. **Specify annual energy target** (kWh/year), choose turbine size, and select terrain type.
3. Optionally, adjust **advanced parameters** (hub height, Weibull k, site losses, spacing).
4. **Results update live**: Number of turbines, expected kWh yield, wind rose, loss breakdown, and required land area.

### Example Inputs

| Field           | Example Value   |
|-----------------|----------------|
| Latitude        | 51.5074        |
| Longitude       | -0.1278        |
| Target Energy   | 100000 kWh     |
| Turbine Model   | 10 kW          |
| Terrain         | Suburban       |

---

## Core Calculation Model

Implemented in [`client/src/lib/windCalculations.ts`](client/src/lib/windCalculations.ts):

- **Annual Energy Production (AEP)**: Integrates the turbine power curve with the Weibull distribution at hub height.
- **Wind Height Correction**: Power law based on site/terrain roughness.
- **Losses**: Wake effect, electrical, blade, icing, curtailment, and mechanical availability—following IEA and IEC guidelines.
- **Site Siting**: Downwind/crosswind spacing (5–9x and 3–5x rotor diameter).
- **Wind Rose Generation**: Uses a von Mises distribution for directional spread.
- **Multiple Models**: Plug in other turbines in [`turbineModels.ts`](client/src/lib/turbineModels.ts).

See code for documentation and implementation details.

---

## Project Structure

Simplified for clarity:

```
.
├── client/             # Frontend app (React, TSX)
│   └── src/
���        ├── App.tsx
│        ├── lib/       # Calculation engines, API clients
│        ├── pages/     # Main pages (Home, NotFound)
│        └── ...
├── server/             # Express server for static site and prod API proxy
│   └── index.ts
├── shared/             # Constants, shared logic
├── ideas.md            # Design and UX/visual style concepts
├── package.json
└── ...
```

---

## Customization

- **Add New Turbine**: Edit `client/src/lib/turbineModels.ts` with new power curves/specs.
- **Styling**: Tweak color themes and type in `client/src/index.css` and theme provider.
- **Site Losses**: Adjust defaults in `client/src/lib/windCalculations.ts`.

---

## Contributing

PRs and contributions are welcome! Please review [ideas.md](ideas.md) for design/discussion. Main branches:
- `main` — stable
- `feature/*` — active development

---

## License

MIT

---

## Credits

- Wind data: [NASA POWER Project](https://power.larc.nasa.gov/)
- Calculation methodology: IEC/IEA wind energy standards, open source wind code
- UI/UX influences: Bauhaus SaaS, Industrial dashboards, Material Design

---

## References

- [NASA POWER API docs](https://power.larc.nasa.gov/docs/services/api/temporal/climatology/)
- [IEC 61400-2](https://webstore.iec.ch/publication/20586)
- [IEA Wind Task 11](https://iea-wind.org/task-11/)

---

## Maintainers

- [@OnkarBhattacharya](https://github.com/OnkarBhattacharya)
