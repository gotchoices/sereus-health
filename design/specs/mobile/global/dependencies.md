# Dependencies Spec

This file documents the key dependencies for the app target.
Actual packages vary by framework; examples below are illustrative.

## React Native (example)

```yaml
deps:
  - "@react-navigation/native": "^6"
  - "@react-navigation/native-stack": "^6"
  - "zustand": "^4"
  - "expo-linking": "^6"
  - "expo": "^51"
devDeps:
  - "typescript": "^5"
  - "eslint": "^9"
  - "vitest": "^2"
```

## SvelteKit (example)

```yaml
deps:
  - "@sveltejs/kit": "^2"
  - "svelte": "^5"
devDeps:
  - "typescript": "^5"
  - "vite": "^5"
  - "vitest": "^2"
```

## Notes

- Versions are indicative; adjust per project and framework.
- Consult `design/specs/project.md` for framework choice.
