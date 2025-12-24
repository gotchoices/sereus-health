# Project Spec

This document captures key decisions for the project.

## Purpose

**What problem does this project solve?**

Sereus Health is a personal health tracking system that allows users to log activities, conditions, and outcomes over time, then analyze patterns through graphs and correlations. It provides a flexible taxonomy (user-defined categories and items with quantifiers) and supports distributed sync across multiple devices/nodes (user's devices + doctor/researcher nodes). One goal is to demonstrate a personal medical record owned and controlled by the individual.

**Who are the target users?**

Primary persona: Health-conscious individual managing chronic conditions, tracking daily activities, diet, symptoms, and outcomes to identify patterns and share relevant data with healthcare providers.  Also, healthcare providers who share access to the [sereus strand](https://sereus.org) and will analyze data for the patent's welfare.

**Delivery posture:**

- **Production / Industrial-strength — optimize for correctness, scalability, accessibility, maintainability** ✓

## Platforms

**What platforms will this project target?**
- [x] Mobile (iOS/Android)
- [x] Web (desktop browsers)

**Are experiences different per platform?**

Mobile: Native app for quick daily logging, graphs, on-device storage.
Web: Responsive interface for users and healthcare professionals to review/analyze patient data.

## Apps

List the apps to be built:

| App Name | Platform | Framework | Status |
|----------|----------|-----------|--------|
| mobile | iOS/Android | react-native | planned |
| web | browser | sveltekit | planned |

## Toolchain

### Mobile

- Framework: **react-native** (0.82.1 or newer if Quereus compatible)
- Runtime: **bare** (direct access to native modules for Quereus integration)
- Language: **typescript**
- Package manager: **yarn**
- Navigation: **react-navigation** (v6+)
- State: **zustand** (minimal global state)

### Web

- Framework: **sveltekit**
- Language: **typescript**
- Package manager: **npm**

## Data Strategy

**How will data be managed?**

- [x] Sereus Fabric protocol
- [x] Sereus in-memory only (no persistence) as debugging/mock fallback
- [x] Offline support required (primary use case)
- [x] Real-time updates needed (across user's cadre and authorized nodes)

**Backend:**

- **Local database access**: [Quereus](https://github.com/gotchoicies/sereus.git)
- **No central server**: Each participating node is part of a Sereus strand

## Notes

Healthcare data requires production-grade quality: data integrity.
HIPAA considerations are minimized since all data is kept by the patient himself.

Brand assets (logo / icon artwork) live under `docs/images/`. See `docs/APP_ICONS.md` for how each app integrates them.

**Quality / performance posture (brief):**

- Expected scale: **medium** (single user's lifetime health data, <100k log entries).  May grow to include a full "medical record" including lab results, procedures, scans, etc.
- Critical interactions that must stay fast: quick log entry creation, type-ahead search in catalog, graph rendering, import/export
