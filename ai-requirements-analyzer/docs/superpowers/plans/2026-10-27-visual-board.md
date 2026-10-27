# Visual Board Implementation Plan

Approved in chat: fill the workspace with the board beside the right-hand dialogue panel; use floating tools for cards, rectangles/circles/arrows, freehand drawing and uploaded images.

Architecture: retain native HTML/SVG/canvas and the existing board JSON/localStorage format; add optional, validated visual fields to version 1 objects. Existing saved text boards remain readable. No dependencies or external image service.

- [x] Test enlarged bounds, visual object round trips, safe raster data, bounded drawing points and legacy cards.
- [x] Extend board validation, dimensions and duplication; create native tools for drawing, shapes and image upload.
- [x] Replace stacked headers/toolbars with floating canvas controls and compact menus. Reserve the right panel on wide screens; allow it to close and adapt on smaller screens.
- [x] Support drag, manual pins, duplication, resize/edit and deletion undo for visual objects; preserve saving/export/import and text tools.
- [x] Run model/syntax checks, review the implementation and update usage/verification notes. Attempt browser checks only through supported tools; report any limitation accurately.

Limits: 6000 × 4000 board, 100 objects, 2000 points per drawing, incoming raster file <=12 MB, stored raster data URL <=1.5 million characters. Re-encode images locally before storage. No SVG uploads, remote image URLs or executable content. Save failures retain the current session and recommend JSON export.

Verification: 16 model tests pass; all four browser scripts pass syntax checks. Independent final review found no remaining blocking issues after fixes for drawing viewport jumps and oversized image restoration. Temporary static preview connections timed out; switched to the rebuilt Docker app and verified layout, rectangle/style/resize, freehand drawing, local PNG upload, object movement, zoom and reload persistence. See VERIFICATION.md for the precise limits and screenshot.
