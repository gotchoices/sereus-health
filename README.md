# Sereus Health

A personal health tracking app that helps you discover correlations between your daily activities, conditions, and health outcomes.

## Overview

Sereus Health lets you log what you do (activities), what's happening around you (conditions), and how you feel (outcomes). Over time, these data points reveal patterns—helping you understand what makes you feel better or worse.

**Key capabilities:**

- **Flexible taxonomy**: Log activities (exercise, eating, work), conditions (weather, stress), and outcomes (pain, energy, mood). Add your own categories and items as needed.
- **Quantifiers**: Track intensity, duration, quantity—whatever measurements matter for each item.
- **Bundles**: Group frequently-used items together for quick logging.
- **Graphs**: Visualize trends across time to spot correlations.
- **Export & share**: Generate reports for healthcare providers.
- **Sereus networking** *(planned)*: Sync across devices and share with trusted parties via Sereus fabric.

## Documentation

| Document | Description |
|----------|-------------|
| [docs/STATUS.md](docs/STATUS.md) | Current project status and TODOs |
| [design/stories/](design/stories/) | User stories describing app functionality |
| [design/specs/](design/specs/) | Technical specifications for screens and API |
| [design/generated/scenarios/](design/generated/scenarios/) | Visual scenarios with screenshots |

## Development

### Prerequisites

- Node.js 18+
- React Native development environment ([setup guide](https://reactnative.dev/docs/set-up-your-environment))
- For iOS: Xcode, CocoaPods
- For Android: Android Studio, JDK

### Quick Start

```bash
# Install dependencies
npm install

# iOS: install pods (first time or after native dep changes)
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on device/simulator
npm run android   # or: npm run ios
```

### Project Structure

```
health/
├── src/
│   ├── screens/      # Screen components
│   ├── components/   # Reusable UI components
│   ├── data/         # Data adapters (mock/Quereus)
│   ├── db/           # Database schema and queries
│   └── i18n/         # Internationalization
├── design/           # Specs, stories, generated docs
├── docs/             # Project documentation
└── mock/             # Mock data for development
```

## License

Proprietary – Sereus Project
