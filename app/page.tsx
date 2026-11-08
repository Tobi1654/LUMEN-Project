"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import type { Adjustments, EditDocument } from "../src/types/edit-document";
import { createEditDocument } from "../src/editor/create-edit-document";
import { defaultAdjustments } from "../src/editor/default-adjustments";


export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [editDocument, setEditDocument] = useState<EditDocument | null>(null);
  const adjustments = editDocument?.adjustments ?? defaultAdjustments; 
  const [showOriginal, setShowOriginal] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return () => { if (imageUrl) URL.revokeObjectURL(imageUrl); };
  }, [imageUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !ready) return;

    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    if (showOriginal) return;
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = frame.data;
    const exposure = Math.pow(2, adjustments.exposure);
    const contrast = (adjustments.contrast + 100) / 100;
    const saturation = (adjustments.saturation + 100) / 100;
    const warmth = adjustments.warmth * 0.55;

    for (let i = 0; i < pixels.length; i += 4) {
      let r = pixels[i] * exposure + warmth;
      let g = pixels[i + 1] * exposure;
      let b = pixels[i + 2] * exposure - warmth;
      r = (r - 128) * contrast + 128;
      g = (g - 128) * contrast + 128;
      b = (b - 128) * contrast + 128;
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      pixels[i] = clamp(gray + (r - gray) * saturation);
      pixels[i + 1] = clamp(gray + (g - gray) * saturation);
      pixels[i + 2] = clamp(gray + (b - gray) * saturation);
    }
    ctx.putImageData(frame, 0, 0);
  }, [adjustments, ready, showOriginal]);

  function clamp(value: number) {
    return Math.max(0, Math.min(255, value));
  }

  function importPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setFileName(file.name);
    const newDocument = createEditDocument(
      crypto.randomUUID()
    );

    setEditDocument(newDocument);

    setReady(false);

    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setReady(true);
    };
    image.onerror = () => alert("This image could not be opened by your browser.");
    image.src = url;
    event.target.value = "";
  }

  function update(key: keyof Adjustments, value: number) {
    setEditDocument(current => {
      if (!current) return current;

      return{
        ...current,
        adjustments: {
          ...current.adjustments,
          [key]: value,
        },
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function exportJpeg() {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const link = document.createElement("a");
    link.download = `${fileName.replace(/\.[^.]+$/, "") || "lumen-edit"}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.94);
    link.click();
  }

  const controls: { key: keyof Adjustments; label: string; min: number; max: number; step: number; unit: string }[] = [
    { key: "exposure", label: "Exposure", min: -3, max: 3, step: 0.05, unit: " EV" },
    { key: "contrast", label: "Contrast", min: -100, max: 100, step: 1, unit: "" },
    { key: "saturation", label: "Saturation", min: -100, max: 100, step: 1, unit: "" },
    { key: "warmth", label: "Temperature", min: -100, max: 100, step: 1, unit: "" }
  ];

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="brandMark">L</span><span>LUMEN</span><small>PHOTO STUDIO</small></div>
        <div className="topActions">
          <label className="button secondary">Import photo<input type="file" accept="image/*" onChange={importPhoto} hidden /></label>
          <button className="button primary" onClick={exportJpeg} disabled={!ready}>Export JPEG</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="leftRail">
          <div className="railItem active"><span>▦</span> Library</div>
          <div className="railItem"><span>◒</span> Develop</div>
          <div className="railItem"><span>◈</span> Presets</div>
          <div className="railItem"><span>▧</span> Export</div>
          <div className="railBottom">LUMEN 0.1.0</div>
        </aside>

        <section className="canvasArea">
          <div className="canvasHeader">
            <div><span className="eyebrow">DEVELOP</span><h1>{fileName || "Untitled photograph"}</h1></div>
            <button className="button subtle" onClick={() => setShowOriginal(v => !v)} disabled={!ready}>
              {showOriginal ? "Show edited" : "Compare original"}
            </button>
          </div>
          <div className="stage">
            {ready ? <canvas ref={canvasRef} aria-label="Photo preview" /> :
              <div className="emptyState">
                <div className="uploadIcon">＋</div>
                <h2>Welcome to LUMEN Photo Studio - This is your editing space</h2>
                <p>Import a photograph to begin editing.</p>
                <label className="button primary">Choose photograph<input type="file" accept="image/*" onChange={importPhoto} hidden /></label>
                <small>Images are processed locally in this browser in this prototype.</small>
              </div>}
          </div>
          <div className="filmstrip">
            <span className="eyebrow">CURRENT PHOTO</span>
            <div className="filmThumb">{ready ? <img src={imageUrl} alt="Current photograph thumbnail" /> : <span>＋</span>}</div>
            <span className="filmName">{fileName || "No photograph imported"}</span>
          </div>
        </section>

        <aside className="rightPanel">
          <div className="panelHeading"><div><span className="eyebrow">ADJUSTMENTS</span><h2>Light</h2></div><button className="textButton" onClick={() => setEditDocument(current => {
            if (!current) return current;

            return{
              ...current,
              adjustments: {...defaultAdjustments},
              updatedAt: new Date().toISOString(),
            };
          })}>
              Reset all
          </button>
          </div>
          {controls.map(control => (
            <div className="control" key={control.key}>
              <div className="controlLabel"><label htmlFor={control.key}>{control.label}</label><output>{adjustments[control.key].toFixed(control.key === "exposure" ? 2 : 0)}{control.unit}</output></div>
              <input id={control.key} type="range" min={control.min} max={control.max} step={control.step}
                value={adjustments[control.key]} onChange={e => update(control.key, Number(e.target.value))} disabled={!ready || showOriginal} />
              <div className="rangeEnds"><span>{control.min}</span><span>{control.max}</span></div>
            </div>
          ))}
          <div className="panelNote"><span className="statusDot" /> {ready ? "Local preview active" : "Waiting for a photograph"}<p>Edits are currently held in memory. Persistent edit history and project saving are next milestones.</p></div>
        </aside>
      </div>
    </main>
  );
}
