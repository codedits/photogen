"use client";
import React, { useState, useEffect, useRef } from "react";
import ImageWithLqip from '../../components/ImageWithLqip';

type PresetRow = {
  id: string;
  name: string;
  description?: string;
  prompt?: string;
  tags?: string[];
  images?: { url: string; public_id: string }[];
};

export default function AdminPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [uploadItems, setUploadItems] = useState<Array<{ id: string; preview: string; file?: File; progress: number; status: 'idle'|'uploading'|'done'|'error'|'cancelled'; public_id?: string; url?: string; xhr?: XMLHttpRequest | null }>>([]);
  const [dngFile, setDngFile] = useState<File | null>(null);
  const [dngName, setDngName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [list, setList] = useState<PresetRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    // initial load
  }, []);

  const handleFiles = (files?: FileList | null) => {
    if (!files || !files.length) return;
    const list = Array.from(files).slice(0, 8);
    const readers = list.map((f) => new Promise<{ preview: string; file: File }>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve({ preview: String(r.result), file: f });
      r.readAsDataURL(f);
    }));
    Promise.all(readers).then((arr) => {
      const items = arr.map((a, i) => ({ id: `${Date.now()}_${i}`, preview: a.preview, file: a.file, progress: 0, status: 'idle' as const, xhr: null }));
  setUploadItems((prev) => [...prev, ...items]);
  items.forEach((it, idx) => setTimeout(() => startUpload(it), idx * 120));
    });
  };

  const handleDng = (files?: FileList | null) => {
    if (!files || !files.length) {
      setDngFile(null);
      setDngName(null);
      return;
    }
    const f = files[0];
    setDngFile(f);
    setDngName(f.name);
  };

  const startUpload = (item: { id: string; preview: string; file?: File }) => {
    if (!item.file) return;
    const form = new FormData();
    form.append('image', item.file, item.file.name);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload-image');
    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable) return;
      const pct = Math.round((ev.loaded / ev.total) * 100);
      setUploadItems((prev) => prev.map((p) => p.id === item.id ? { ...p, progress: pct } : p));
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && data?.ok) {
          setUploadItems((prev) => prev.map((p) => p.id === item.id ? { ...p, status: 'done', progress: 100, public_id: data.public_id, url: data.url, xhr: null } : p));
        } else {
          setUploadItems((prev) => prev.map((p) => p.id === item.id ? { ...p, status: 'error', xhr: null } : p));
        }
      } catch {
        setUploadItems((prev) => prev.map((p) => p.id === item.id ? { ...p, status: 'error', xhr: null } : p));
      }
    };
    xhr.onerror = () => {
      setUploadItems((prev) => prev.map((p) => p.id === item.id ? { ...p, status: 'error', xhr: null } : p));
    };
    setUploadItems((prev) => prev.map((p) => p.id === item.id ? { ...p, status: 'uploading', xhr } : p));
    xhr.send(form);
  };

  const cancelUpload = async (id: string) => {
    const it = uploadItems.find((u) => u.id === id);
    if (!it) return;
    if (it.xhr) try { it.xhr.abort(); } catch {}
    if (it.public_id) {
      try {
        await fetch('/api/upload-image', { method: 'DELETE', body: JSON.stringify({ public_id: it.public_id }), headers: { 'content-type': 'application/json' } });
      } catch {}
    }
    setUploadItems((prev) => prev.filter((p) => p.id !== id));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setUploadProgress(0);
    try {
      if (!dngFile) {
        setMessage('Error: DNG file is required');
        setLoading(false);
        return;
      }
      const form = new FormData();
      form.set('dng', dngFile, dngFile.name);
      form.set('name', name);
      form.set('description', description);
      form.set('tags', tags);
      const doneItems = uploadItems.filter((u) => u.status === 'done').slice(0, 8);
      for (let i = 0; i < doneItems.length; i++) {
        form.append('imageUrls', JSON.stringify({ public_id: doneItems[i].public_id, url: doneItems[i].url }));
      }
      const result = await new Promise<{ ok?: boolean; id?: string; error?: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/presets');
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText || '{}');
            if (xhr.status >= 200 && xhr.status < 300) resolve(data);
            else reject(data);
          } catch (err) { reject(err); }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(form);
      });
      if (result?.ok) {
        setMessage('Preset created: ' + result.id);
        // Optimistically add the new preset to the local list so UI is responsive
        const doneItems = uploadItems.filter((u) => u.status === 'done').slice(0, 8);
        const newPreset: PresetRow = {
          id: result.id || String(Date.now()),
          name,
          description,
          tags: tags.split(',').map(s=>s.trim()).filter(Boolean),
          images: doneItems.map((d) => ({ url: d.url || '', public_id: d.public_id || '' })),
        };
        setList((prev) => [newPreset, ...prev]);
        setName(''); setDescription(''); setTags(''); setDngFile(null); setDngName(null);
        setShowCreate(false);
        setUploadItems([]);
      } else {
        setMessage('Error: ' + (result?.error || 'Unknown'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage('Error: ' + msg);
    }
    setUploadProgress(0);
    setLoading(false);
  };

  const loadList = async () => {
    setListLoading(true);
    try {
      const res = await fetch('/api/presets', { cache: 'no-store' });
      const data = await res.json();
      if (data?.ok) setList(data.presets || []);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => { loadList(); }, []);

  const updatePreset = async (row: PresetRow, changes: Partial<PresetRow> & { addUrls?: string[]; addFiles?: FileList | null; removePublicIds?: string[] }) => {
  const form = new FormData();
    if (changes.name !== undefined) form.set('name', changes.name);
    if (changes.description !== undefined) form.set('description', changes.description || '');
    if (changes.prompt !== undefined) form.set('prompt', changes.prompt || '');
    if (changes.tags !== undefined) form.set('tags', (changes.tags || []).join(', '));
    (changes.removePublicIds || []).forEach((pid) => form.append('removePublicIds', pid));
    (changes.addUrls || []).slice(0,8).forEach((u) => form.append('imageUrls', u));
    if (changes.addFiles && changes.addFiles.length) {
      const list = Array.from(changes.addFiles).slice(0, 8);
      for (let i = 0; i < list.length; i++) form.append('images', list[i]);
    }
    // Optimistically update local list to reflect changes immediately
    const prevList = list;
    setList((lst) => lst.map((r) => r.id === row.id ? { ...r, ...(changes as Partial<PresetRow>) } : r));
    const res = await fetch(`/api/presets/${row.id}`, { method: 'PATCH', body: form });
    const data = await res.json();
    if (!data?.ok) {
      // revert
      setList(prevList);
      throw new Error(data?.error || 'Update failed');
    }
  };

  const deletePreset = async (row: PresetRow) => {
    // Optimistic removal
    const prevList = list;
    setList((lst) => lst.filter((r) => r.id !== row.id));
    const res = await fetch(`/api/presets/${row.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data?.ok) {
      setList(prevList);
      throw new Error(data?.error || 'Delete failed');
    }
  };

  return (
    <div className="min-h-screen px-6 pt-24 pb-8">
      <h2 className="text-2xl font-semibold mb-4">Admin</h2>
      <div className={`grid grid-cols-1 ${showCreate ? 'lg:grid-cols-2' : ''} gap-6`}>
        {showCreate && (
          <div className="rounded-lg border border-white/8 p-4 bg-black/30">
            <h3 className="text-lg font-semibold mb-3">Create Preset</h3>
            <form onSubmit={submit} className="grid grid-cols-1 gap-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="p-2 rounded bg-white/5" required />
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="p-2 rounded bg-white/5" />
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags (comma separated)" className="p-2 rounded bg-white/5" />

              <label className="text-sm text-slate-300">DNG (required, single)</label>
              <input type="file" accept=".dng,image/x-adobe-dng" onChange={(e) => handleDng(e.target.files)} className="p-2 rounded bg-white/5" required />
              {dngName && <div className="text-xs text-slate-300">Selected: {dngName}</div>}

              <label className="text-sm text-slate-300 mt-3">Images (max 8)</label>
              <input type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} className="p-2 rounded bg-white/5" />

              {!!uploadItems.length && (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {uploadItems.slice(0, 8).map((it) => (
                    <div key={it.id} className="relative h-28 w-full rounded overflow-hidden bg-slate-800">
                      <img src={it.preview} alt="preview" className="h-full w-full object-cover" />
                      <div className="absolute left-1 right-1 bottom-1">
                        <div className="w-full bg-white/5 rounded h-2 overflow-hidden">
                          <div className="bg-indigo-600 h-2" style={{ width: `${it.progress}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-slate-300 mt-1">
                          <div>{it.status}</div>
                          <div>
                            {it.status !== 'done' && (
                              <button type="button" onClick={() => cancelUpload(it.id)} className="text-xs text-red-400">Cancel</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {uploadProgress > 0 && (
                <div className="w-full bg-white/5 rounded overflow-hidden h-3 mt-2">
                  <div className="bg-indigo-600 h-3" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}

              <div className="flex items-center gap-3 mt-2">
                <button disabled={loading} className="px-3 py-2 rounded bg-indigo-600 text-white">{loading ? 'Creating...' : 'Create Preset'}</button>
                <div className="text-sm text-slate-300">{message}</div>
              </div>
            </form>
          </div>
        )}

        <div className="rounded-lg border border-white/8 p-4 bg-black/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Manage Presets</h3>
            <div>
              <button type="button" onClick={() => setShowCreate((s) => !s)} className="inline-flex items-center gap-2 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white" disabled={loading} aria-disabled={loading}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm">New preset</span>
              </button>
            </div>
          </div>

          {listLoading ? (
            <div className="text-sm text-slate-300">Loading…</div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {list.map((row) => (
                <AdminRow key={row.id} row={row} onUpdate={updatePreset} onDelete={async (r) => { await deletePreset(r); await loadList(); }} />
              ))}
              {!list.length && (
                <div className="text-sm text-slate-400">No presets yet.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminRow({ row, onUpdate, onDelete }: { row: PresetRow; onUpdate: (row: PresetRow, changes: Partial<PresetRow> & { addUrls?: string[]; addFiles?: FileList | null; removePublicIds?: string[] }) => Promise<void>; onDelete: (row: PresetRow) => Promise<void> }) {
  const [name, setName] = useState(row.name);
  const [description, setDescription] = useState(row.description || '');
  const [tags, setTags] = useState((row.tags || []).join(', '));
  const [addUrls, setAddUrls] = useState('');
  const [addFiles, setAddFiles] = useState<FileList | null>(null);
  const [imagesLocal, setImagesLocal] = useState(row.images || [] as { url: string; public_id: string }[]);
  const [deleting, setDeleting] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = detailsRef.current;
    if (!el) return;
    const onToggle = () => setOpen(!!el.open);
    // initialize state
    setOpen(!!el.open);
    el.addEventListener('toggle', onToggle);
    return () => el.removeEventListener('toggle', onToggle);
  }, []);

  const submit = async () => {
    setBusy(true);
    try {
      const changes = {
        name,
        description,
        tags: tags.split(',').map(s => s.trim()).filter(Boolean),
        addUrls: addUrls.split(',').map(s => s.trim()).filter(Boolean).slice(0,8),
        addFiles,
      } as Partial<PresetRow> & { addUrls?: string[]; addFiles?: FileList | null };

      const res = await onUpdate(row, changes);
      setAddUrls(''); setAddFiles(null);
      // on success, try to sync local images from server data if returned
      // Some servers may not return content; we still keep optimistic UI
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(msg || 'Update failed');
    }
    setBusy(false);
  };

  const handleDelete = async (pid: string) => {
    if (deleting.includes(pid)) return;
    setDeleting((s) => [...s, pid]);
    const prev = imagesLocal;
    setImagesLocal((list) => list.filter((i) => i.public_id !== pid));
    try {
      // call PATCH directly here so we don't force parent to reload the entire list
      const form = new FormData();
      form.append('removePublicIds', pid);
      const res = await fetch(`/api/presets/${row.id}`, { method: 'PATCH', body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || `Failed to delete image (${res.status})`);
      }
    } catch (err: unknown) {
      setImagesLocal(prev);
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg || 'Failed to delete image');
    } finally {
      setDeleting((s) => s.filter((x) => x !== pid));
    }
  };

  return (
    <details ref={detailsRef} className="rounded-lg border border-white/10 overflow-hidden">
      <summary className="cursor-pointer flex items-center justify-between p-3 bg-black/10">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center justify-center w-6 h-6 text-slate-300 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} aria-hidden>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </span>
          <div className="w-12 h-12 rounded overflow-hidden bg-slate-800 flex items-center justify-center">
              {imagesLocal && imagesLocal[0] ? (
              <ImageWithLqip src={imagesLocal[0].url} alt="thumb" width={48} height={48} className="object-cover" transformOpts={{ w: 80, h: 80, fit: 'cover' }} />
            ) : (
              <div className="text-sm">{row.name.charAt(0)}</div>
            )}
          </div>
          <div>
            <div className="font-medium">{row.name}</div>
            <div className="text-xs text-slate-400">{(row.tags||[]).join(', ')}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button title="Edit" onClick={(e)=>{ e.preventDefault(); }} className="p-1 rounded hover:bg-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17h2m-1-1v1m5-11l2 2m-4-1l-1 1M4 20h4l10-10-4-4L4 16v4z"/></svg>
          </button>
          <button title="Delete" onClick={(e)=>{ e.preventDefault(); if (confirm(`Delete preset "${row.name}"? This cannot be undone.`)) { onDelete(row).then(()=>{ alert('Successfully deleted'); }).catch(err=>{ alert(err?.message || 'Delete failed'); }); } }} className="p-1 rounded hover:bg-white/5 text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </summary>

      <div className="p-4 bg-black/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-sm">Name</label>
            <input className="w-full p-2 rounded bg-white/5" value={name} onChange={(e)=>setName(e.target.value)} />
            <label className="block text-sm mt-3">Description</label>
            <input className="w-full p-2 rounded bg-white/5" value={description} onChange={(e)=>setDescription(e.target.value)} />
            <label className="block text-sm mt-3">Tags</label>
            <input className="w-full p-2 rounded bg-white/5" value={tags} onChange={(e)=>setTags(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="block text-sm">Add Image URLs (comma separated)</label>
            <input className="w-full p-2 rounded bg-white/5" value={addUrls} onChange={(e)=>setAddUrls(e.target.value)} />
            <label className="block text-sm mt-3">Add Image Files (max 8)</label>
            <input type="file" multiple accept="image/*" onChange={(e)=>setAddFiles(e.target.files)} className="w-full p-2 rounded bg-white/5" />
            <div className="text-xs text-slate-400">Click the red X on an image to delete it immediately.</div>
          </div>
          <div>
            <div className="grid grid-cols-3 gap-2">
              {imagesLocal.map((img) => {
                const isDeleting = deleting.includes(img.public_id);
                return (
                  <div key={img.public_id} className="relative h-20 rounded overflow-hidden border border-white/10">
                    <ImageWithLqip src={img.url} alt="img" fill className="object-cover" transformOpts={{ w: 320, h: 240, fit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => handleDelete(img.public_id)}
                      disabled={isDeleting}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow"
                      aria-label={isDeleting ? 'Deleting' : 'Delete image'}
                    >
                      {isDeleting ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v4" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button disabled={busy} onClick={submit} className="px-3 py-2 rounded bg-indigo-600 text-white">{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </details>
  );
}
