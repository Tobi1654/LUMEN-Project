# LUMEN Photo Studio

A starter for a browser-based, non-destructive photo editor.

## Requirements
- Node.js 20.9 or newer
- npm

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## What's working in this starter
- Import a browser-supported image.
- Preview it on a canvas.
- Adjust exposure, contrast, saturation and warmth.
- Toggle between original and edited preview.
- Reset adjustments.
- Export the current preview as JPEG.

## Important prototype limitations
- The current editor works on browser-decodable raster images. It is not a RAW developer.
- Adjustments are held in React state and are not yet persisted.
- The canvas pipeline is a first working baseline, not a colour-managed professional renderer.
- JPEG export is limited to the current preview resolution (maximum side 1800 px).
- The current temperature control is a simple warm/cool tint, not a physical white-balance model.

## Planned architecture
- `src/domain`: photo, album, metadata and edit-document types.
- `src/editor`: adjustment graph, history and rendering contracts.
- `src/workers`: background image processing.
- `src/wasm`: Rust/WebAssembly processing engine.
- `src/gpu`: WebGPU shaders and render pipeline.
- `src/storage`: IndexedDB and cloud storage adapters.
- `src/features`: library, develop, masking, presets and export modules.

## Next engineering milestones
1. Extract adjustment state into a versioned edit document.
2. Add undo/redo history and autosave to IndexedDB.
3. Add a thumbnail/preview pipeline and multi-photo library.
4. Introduce a worker-based renderer so large images do not block the UI.
5. Add RAW decoding through a dedicated, tested codec pipeline.
