"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Adjustments, EditDocument } from "../src/types/edit-document";
import { createEditDocument } from "../src/editor/create-edit-document";
import { defaultAdjustments } from "../src/editor/default-adjustments";
import type { HistoryState } from "../src/editor/history";
import type { Snapshot } from "../src/editor/snapshots";
import { createSnapshot } from "../src/editor/snapshots";
import { 
  saveProject, 
  getAllProjects, 
  deleteProject, 
  saveCollection,
  getAllCollections,
  deleteCollection
} from "../src/storage/database";

import type { Collection } from "../src/types/collection";
import type { Project } from "../src/types/project";

import {
  createHistory,
  pushHistory,
  undo,
  redo,
  canUndo,
  canRedo,
} from "../src/editor/history";


function ProjectThumbnail({ project }: { project: Project }) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(
      project.thumbnail ?? project.image
    );

    setThumbnailUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [project.image]);

  if (!thumbnailUrl) {
    return <div className="libraryThumbnail">Loading...</div>;
  }

  return (
    <img
      className="libraryThumbnail"
      src={thumbnailUrl}
      alt={`Preview of ${project.fileName}`}
    />
  );
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [history, setHistory] = useState<HistoryState<EditDocument> | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const editDocument = history?.present ?? null;
  const adjustments = editDocument?.adjustments ?? defaultAdjustments; 
  const [showOriginal, setShowOriginal] = useState(false);
  const [ready, setReady] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [collections, setCollections] = useState<Collection[]>([])
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);

  useEffect(() => {
    return () => { if (imageUrl) URL.revokeObjectURL(imageUrl); };
  }, [imageUrl]);

  useEffect(() => {
  const canvas = canvasRef.current;
  const image = imageRef.current;

  if (!canvas || !image || !ready) return;

  const maxSide = 1800;
  const scale = Math.min(
    1,
    maxSide / Math.max(image.naturalWidth, image.naturalHeight)
  );

  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);

  const ctx = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!ctx) return;

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  if (showOriginal) return;

  const frame = ctx.getImageData(
    0,
    0,
    canvas.width,
    canvas.height
  );

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

  useEffect(() => {
  if (!history || !imageBlob) return;

  async function saveCurrentProject() {
    try {
      // Create a small copy of the original image.
      const bitmap = await createImageBitmap(imageBlob!);
      const canvas = document.createElement("canvas");

      const maxSize = 400;
      const scale = Math.min(
        maxSize / bitmap.width,
        maxSize / bitmap.height,
        1
      );

      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        bitmap.close();
        throw new Error("Could not create thumbnail canvas.");
      }

      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();

      // Apply the saved editing adjustments.
      const frame = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

      const pixels = frame.data;
      const adjustments = history!.present.adjustments;

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

        pixels[i] = Math.max(0, Math.min(255, gray + (r - gray) * saturation));
        pixels[i + 1] = Math.max(0, Math.min(255, gray + (g - gray) * saturation));
        pixels[i + 2] = Math.max(0, Math.min(255, gray + (b - gray) * saturation));
      }

      ctx.putImageData(frame, 0, 0);

      // Convert the edited canvas into an image Blob.
      const thumbnail = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Could not create thumbnail image."));
          }
        }, "image/jpeg", 0.85);
      });

      const project = {
        id: history!.present.photoID,
        fileName,
        image: imageBlob!,
        thumbnail,
        editDocument: history!.present,
        snapshots,
        updatedAt: new Date().toISOString(),
      };

      await saveProject(project);
    } catch (error) {
      console.error("Automatic saving failed:", error);
    }
  }

  saveCurrentProject();

}, [history, imageBlob, fileName, snapshots]);

  useEffect(() => {
  async function loadLibrary() {
    try {
      const savedProjects = await getAllProjects();
      const savedCollections = await getAllCollections();

      setProjects(savedProjects);
      setCollections(savedCollections);
    } catch (error) {
      console.error("Failed to load library:", error);
    }
  }

  loadLibrary();
}, []);

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
    setImageBlob(file);
    const newDocument = createEditDocument(
      crypto.randomUUID()
    );

    setHistory(createHistory(newDocument));
    setSnapshots([]);

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
  setHistory(current => {
    if (!current) return current;

    const newDocument: EditDocument = {
      ...current.present,
      adjustments: {
        ...current.present.adjustments,
        [key]: value,
      },
      updatedAt: new Date().toISOString(),
    };

    return pushHistory(current, newDocument);
  });
}

function handleUndo(){
  setHistory(current => {
    if (!current) return current;
    return undo(current);
  });
}

function handleRedo(){
  setHistory(current => {
    if (!current) return current;
    return redo(current);
  });
}

function handleSaveSnapshot(){
  if (!editDocument) return;

  const name = window.prompt("Give your snapshot a title:");

  if (!name || !name.trim()) return;

  const snapshot = createSnapshot(
    editDocument,
    name.trim()
  );

  setSnapshots(current => [...current, snapshot]);
}

function handleRestoreSnapshot(snapshot: Snapshot){
  setHistory(current => {
    if (!current) return current;

    const restoredDocument: EditDocument = {
      ...snapshot.document,
      updatedAt: new Date().toISOString(),
    };

    return pushHistory(current, restoredDocument);
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

  async function handleOpenProject(project: Project) {
  try {
    const url = URL.createObjectURL(project.image);

    setReady(false);

    const image = new Image();

    image.onload = () => {
      imageRef.current = image;

      setImageUrl(url);
      setFileName(project.fileName);
      setImageBlob(project.image);
      setHistory(createHistory(project.editDocument));
      setSnapshots(project.snapshots);
      setReady(true);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      console.error("Failed to open saved project.");
      alert("Could not open this project.");
    };

    image.src = url;
  } catch (error) {
    console.error("Failed to open project:", error);
    alert("Could not open this project.");
  }
}

async function handleDeleteProject(project: Project) {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${project.fileName}"?`
  );

  if (!confirmed) return;

  try {
    await deleteProject(project.id);

    setProjects(current =>
      current.filter(item => item.id !== project.id)
    );
  } catch (error) {
    console.error("Failed to delete project:", error);
    alert("Could not delete this project.");
  }
}

async function handleCreateCollection() {
  const name = window.prompt("Name your collection:");

  if (!name || !name.trim()) return;

  const now = new Date().toISOString();

  const collection: Collection = {
    id: crypto.randomUUID(),
    name: name.trim(),
    projectIds: [],
    createdAt: now,
    updatedAt: now,
  };

  try {
    await saveCollection(collection);

    setCollections(current => [...current, collection]);
  } catch (error) {
    console.error("Failed to create collection:", error);
    alert("Could not create collection.");
  }
}

async function handleRenameCollection(collection: Collection) {
  const newName = window.prompt(
    "Enter a new collection name:",
    collection.name
  );

  if (!newName || !newName.trim()) return;

  const updatedCollection = {
    ...collection,
    name: newName.trim(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await saveCollection(updatedCollection);

    setCollections(current =>
      current.map(item =>
        item.id === updatedCollection.id
          ? updatedCollection
          : item
      )
    );
  } catch (error) {
    console.error("Failed to rename collection:", error);
    alert("Could not rename collection.");
  }
}

async function handleDeleteCollection(collection: Collection) {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${collection.name}"? Your photos will not be deleted.`
  );

  if (!confirmed) return;

  try {
    await deleteCollection(collection.id);

    setCollections(current =>
      current.filter(item => item.id !== collection.id)
    );

    if (activeCollectionId === collection.id) {
      setActiveCollectionId(null);
    }
  } catch (error) {
    console.error("Failed to delete collection:", error);
    alert("Could not delete collection.");
  }
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

          <div className="librarySection">
            <div className="panelHeading">
              <div>
                <span className="eyebrow">YOUR WORK</span>
                <h2>Project Library</h2>
                <input
                  type="text"
                  placeholder="Search projects by name..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <button onClick={handleCreateCollection}> + New Collection </button>
                <div className="librarySection">
                  <h2>My Collections</h2>

                  {collections.length === 0 ? (
                    <p>No collections yet. Create one to get started</p>
                  ) : (
                    <div>{collections.map((collection) => (
                      <div className="libraryItem" key={collection.id}>
                        {collection.projectIds.length > 0 && (() => {
                          const coverProject = projects.find(
                            project => project.id === collection.projectIds[0]
                          );

                          return coverProject ? (
                            <ProjectThumbnail project={coverProject} />
                          ) : null;
                        })()}

                        <strong>{collection.name}</strong>
                        <p>{collection.projectIds.length} photos</p>

                        <button onClick={() => setActiveCollectionId(collection.id)}>Open Collection</button>
                        <button onClick={() => handleRenameCollection(collection)}>Rename Collection</button>
                        <button className="deleteButton" onClick={() => handleDeleteCollection(collection)}>Delete this Collection</button>
                      </div>
                    ))}
                    </div>
                  )}
                </div>
                {activeCollectionId && (
                  <div className="librarySection">
                    <h2>
                      {collections.find(
                        collection => collection.id === activeCollectionId
                      )?.name}
                    </h2>

                    <button onClick={() => setActiveCollectionId(null)}>
                      Back to Collections
                    </button>

                    <div>
                      {collections
                        .find(collection => collection.id === activeCollectionId)
                        ?.projectIds.map(projectId => {
                          const project = projects.find(
                            item => item.id === projectId
                          );

                          if (!project) return null;

                          return (
                            <div className="libraryItem" key={project.id}>
                              <ProjectThumbnail project={project} />

                              <strong>{project.fileName}</strong>

                              <button onClick={() => handleOpenProject(project)}>
                                Open Project
                              </button>

                              <button
                                className="deleteButton"
                                onClick={async () => {
                                  const updatedCollection = {
                                    ...collections.find(
                                      collection => collection.id === activeCollectionId
                                    )!,
                                    projectIds: collections.find(
                                      collection => collection.id === activeCollectionId
                                    )!.projectIds.filter(id => id !== project.id),
                                    updatedAt: new Date().toISOString(),
                                  };

                                  await saveCollection(updatedCollection);

                                  setCollections(current =>
                                    current.map(collection =>
                                      collection.id === updatedCollection.id
                                        ? updatedCollection
                                        : collection
                                    )
                                  );
                                }}
                              >
                                Remove from Collection
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
              <span>{projects.length} projects</span>
            </div>

            {projects.length === 0 ? (
              <p>No projects saved yet</p>
            ) : (
              projects
                .filter(project =>
                  project.fileName.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(project => (
                <div className="libraryItem" key={project.id}>
                  <ProjectThumbnail project={project}/>

                  <div>
                    <strong>{project.fileName}</strong>
                    <p>Last edited: {new Date(project.updatedAt).toLocaleString()}</p>
                  </div>

                  <button onClick={() => handleOpenProject(project)}>
                    Open Project
                  </button>

                  <button
                    onClick={() => {
                      const collectionName = window.prompt(
                        "Which collection would you like to add this photo to?\n\n" +
                        collections.map(collection => collection.name).join("\n")
                      );

                      if (!collectionName) return;

                      const selectedCollection = collections.find(
                        collection =>
                          collection.name.toLowerCase() === collectionName.trim().toLowerCase()
                      );

                      if (!selectedCollection) {
                        alert("Collection not found.");
                        return;
                      }

                      if (selectedCollection.projectIds.includes(project.id)) {
                        alert("This photo is already in that collection.");
                        return;
                      }

                      const updatedCollection = {
                        ...selectedCollection,
                        projectIds: [...selectedCollection.projectIds, project.id],
                        updatedAt: new Date().toISOString(),
                      };

                      saveCollection(updatedCollection).then(() => {
                        setCollections(current =>
                          current.map(collection =>
                            collection.id === updatedCollection.id
                              ? updatedCollection
                              : collection
                          )
                        );

                        alert("Photo added to collection!");
                      });
                    }}
                  >
                    Add to Collection
                  </button>

                  <button onClick={() => handleDeleteProject(project)} className="deleteButton">
                    Delete Project
                  </button>
                </div>
              ))
            )
          }
          </div>
        </section>

        <aside className="rightPanel">
          <div className="panelHeading"><div><span className="eyebrow">ADJUSTMENTS</span><h2>Light</h2></div>
          
          <div>
            <button className="textButton" onClick={handleUndo} disabled={!history || !canUndo(history)}>Undo</button>
            <button className="textButton" onClick={handleRedo} disabled={!history || !canRedo(history)}>Redo</button>
          </div>

          <button className="textButton" onClick={() => {
  setHistory(current => {
    if (!current) return current;

    const newDocument: EditDocument = {
      ...current.present,
      adjustments: { ...defaultAdjustments },
      updatedAt: new Date().toISOString(),
    };

    return pushHistory(current, newDocument);
  });
}}>
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

          <div className="snapshotSection">
              <div className="panelHeading">
                <div>
                  <span className="eyebrow">YOUR EDITS</span>
                  <h2>Snapshots</h2>
                </div>

                <button
                  className="textButton"
                  onClick={handleSaveSnapshot}
                  disabled={!ready}
                >
                  + Save
                </button>
              </div>

              {snapshots.length === 0 ? (
                <p className="panelNote">
                  No snapshots yet. Save your current editing style to get started.
                </p>
              ) : (
                snapshots.map(snapshot => (
                  <div className="snapshotItem" key={snapshot.id}>
                    <div>
                      <strong>{snapshot.name}</strong>
                      <p>
                        {new Date(snapshot.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <button
                      className="textButton"
                      onClick={() => handleRestoreSnapshot(snapshot)}
                    >
                      Restore
                    </button>
                  </div>
                ))
              )}
            </div>

          <div className="panelNote"><span className="statusDot" /> {ready ? "Local preview active" : "Waiting for a photograph"}<p>Your project is saved locally in this browser as you edit. Cloud sync is not available yet.</p></div>
        </aside>
      </div>
    </main>
  );
}
