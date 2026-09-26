# SurgeGrid AI (Chennai Grid Cockpit)

**SurgeGrid AI** is an advanced electrical grid topology, infrastructure resilience, and anticipatory disaster intelligence cockpit for the Chennai metropolitan power network (TNEB / TANGEDCO / TANTRANSCO).

---

## ⚡ Core Features

- **TNEB Super Index V2 Topology**: Real-time interactive map of all 286 Chennai substations across 4 voltage tiers (Bulk EHV 230/400kV, Sub-Transmission 110kV, Distribution 33/11kV) and 352 Assistant Engineer (AE) Section Offices.
- **Topological Interconnections**: 1,493 precomputed bidirectional electrical interconnections, allowing instant circuit tracing from bulk injection stations down to neighborhood yards.
- **On-Demand Circuit Isolation ("Show Connections")**: Isolates the active electrical circuit, visualizing incoming and outgoing power flow with directional arrows and auto-framing.
- **Interactive Feeder Corridors & DTR Transformers**: Select any 11 kV feeder to plot its electrical line with directional arrows, view distributed pole-mounted DTR transformer pins along the road, and inspect step-down specs (11,000V → 240V/415V).
- **Critical Lifeline Classification & Disaster Priority**: Categorizes 223+ critical feeders into Hospitals (P1 Non-Cut, Rose), Water/Sewage (P1 Non-Cut, Cyan), Metro/Rail (P2 Essential, Purple), and Govt/Defense (P2 Essential, Amber) with dedicated vs shared feeder identification and one-click quick-filtering.
- **Full-Height Inspector Cockpit with Side-by-Side Split View**: A redesigned inspector spanning the full vertical height of the screen with tabs (`🔌 Feeders`, `⚡ Grid Links`, `ℹ️ Info`) and an instant dual-column `[⤢ Split View]` mode (`860px`) to inspect both upstream grid ties and downstream distribution lines side-by-side.
- **Jurisdictional Boundaries**: On-demand rendering of official TNEB AE Section Office territory GeoJSON polygons with automatic camera bounds framing.
- **Zero-POI Vector Canvas**: Distraction-free custom Google Maps styling in both Light and Dark modes with all commercial POIs removed.
- **Hardware-Accelerated 60fps Experience**: Tuned for maximum pan and zoom performance with high-contrast targeting halos.

---

## 📚 Project Documentation

- [01 - Architecture & System Design](./docs/01-architecture-and-system-design.md)
- [02 - Data Dictionary & Sources](./docs/02-data-dictionary-and-sources.md)
- [03 - Chennai TNEB Power Grid Topology & Visual Field Guide](./docs/03-chennai-grid-topology-and-field-guide.md)
- [Changelog](./docs/CHANGELOG.md)

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Production build
npm run build
```

