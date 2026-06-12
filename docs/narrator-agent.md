# Narrator Agent

## Role

The narrator agent generates personal story events inside the fixed timeline.

## Inputs

- Current timeline beat.
- Selected lens.
- Character profile.
- Current character state.
- Full selected choice history.
- Feedback hints from thumbs up/down in the same life.

## Output Contract

The UI expects structured output:

- `title`: short event title.
- `narration`: playable prose.
- `choices`: 2-3 choices.
- `stateChanges`: passive event-level state changes.
- `callbackHint`: a short memory note for later feedback conditioning.

Each choice includes:

- `id`
- `label`
- `detail`
- `stateDelta`

## Prompt Rules

- The fixed world timeline cannot branch.
- The player is ordinary, not the main architect of history.
- Make callbacks to past choices when useful.
- Use feedback to bias tone and event type, not to flatter the player.
- Avoid exposition dumps; show the timeline through personal pressure.

## Local Fallback

The app must remain playable without AI credentials. The fallback narrator should preserve the same data shape so frontend and persistence work even offline.
