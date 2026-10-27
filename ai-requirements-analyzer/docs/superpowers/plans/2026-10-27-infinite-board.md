# Open-ended Board Implementation Plan

Goal: remove fixed board edges so notes can always be moved out from beneath floating controls.
Architecture: signed world coordinates rendered through a translated/scaled camera; viewport clipping replaces DOM scrolling. Keep the existing JSON schema and local saving.

- [x] Change position/zoom tests to require unrestricted signed coordinates, add screen/world mapping and safe fit tests.
- [x] Replace scroll offsets with a camera throughout zoom, pan, new object placement, image upload and drawing.
- [x] Add Fit board with UI margins; fit on first open, import and reset. Keep manual pins and support middle-drag panning.
- [x] Run model/syntax checks, independent review and browser panning/zoom/fit checks; rebuild the local app and update the guides.

Evidence: 21 tests pass; script syntax checks pass; independent review found no blocking findings. Browser checks verified initial fit, unrestricted pan, cursor-anchored wheel zoom and recovery with Fit board. See VERIFICATION.md for exact scope.
