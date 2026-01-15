# Assistant — Action Plan Protocol

## Rule: propose actions, require approval

Do not directly mutate app data. Propose an **action plan** for preview/approval. Only execute after explicit user approval.

## Action plan requirements

- Every proposed action has a **stable** `actionId`.
- The UI communicates selection state by `actionId` (checked/unchecked).
- If a plan is canceled (including “new prompt while pending”), the assistant is told the final selection state so it can re-propose.

## Apply semantics

- Only selected actions are executed.
- Keep plans minimal: propose only what is necessary to satisfy the user’s request.
- If the user’s request is ambiguous, ask a short clarifying question instead of guessing.

## Bundles: proposal order

When asked to create a bundle:

1. Propose creating any missing items first (if needed).
2. Propose creating the bundle (name + type).
3. Propose adding bundle members (items and/or nested bundles) in a clear order.
4. If requested, propose creating a log entry that uses the bundle.


