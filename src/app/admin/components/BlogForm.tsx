"use client";

import React, { useMemo, useState, useCallback } from 'react';
import { ArrowLeft, BookOpenText, Clock, Eye, FileText, Hash, Layout, Loader2, Save, Trash2, Upload, X } from 'lucide-react';
import ImageWithLqip from '../../../components/ImageWithLqip';
import RichTextEditor from './RichTextEditor';

export type BlogFormRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  tags: string[];
  status: 'draft' | 'published';
  layout?: 'standard' | 'magazine' | 'minimal';
  coverImage?: { url: string; public_id: string } | null;
  inlineImages?: { url: string; public_id: string }[];
  seoTitle?: string;
  seoDescription?: string;
};

interface BlogFormProps {
  post?: BlogFormRow;
  onBack: () => void;
  onSave: (payload: any) => Promise<void>;
  onDelete?: (post: BlogFormRow) => Promise<void>;
}

type LayoutOption = 'standard' | 'magazine' | 'minimal';

const LAYOUT_OPTIONS: { value: LayoutOption; label: string; desc: string }[] = [
  { value: 'standard', label: 'Standard', desc: 'Cover image above the title. Wider layout (responsive)' },
  { value: 'magazine', label: 'Magazine', desc: 'Full-bleed hero with overlay text. Best for visual-first posts' },
  { value: 'minimal', label: 'Minimal', desc: 'Text-focused, no hero image. Maximum readability' },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function TagPills({ tags, onRemove }: { tags: string[]; onRemove: (tag: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200"
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            className="ml-0.5 rounded-full p-0.5 text-zinc-400 hover:text-white hover:bg-zinc-700"
          >
            <X size={10} />
          </button>
        </span>
      ))}
    </div>
  );
}

export default function BlogForm({ post, onBack, onSave, onDelete }: BlogFormProps) {
  const [title, setTitle] = useState(post?.title || '');
  const [slug, setSlug] = useState(post?.slug || '');
  const [autoSlug, setAutoSlug] = useState(!post?.slug);
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [contentHtml, setContentHtml] = useState(post?.contentHtml || '');
  const [tags, setTags] = useState<string[]>(post?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>(post?.status || 'draft');
  const [layout, setLayout] = useState<LayoutOption>(post?.layout || 'standard');
  const [coverImage, setCoverImage] = useState(post?.coverImage || null);
  const [inlineImages, setInlineImages] = useState<{ url: string; public_id: string }[]>(post?.inlineImages || []);
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(post?.seoDescription || '');
  const [showPreview, setShowPreview] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; slug?: string; content?: string }>({});

  const textStats = useMemo(() => {
    const text = contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(' ').length : 0;
    const readingMinutes = Math.max(1, Math.ceil(words / 220));
    const chars = text.length;
    return { words, readingMinutes, chars };
  }, [contentHtml]);

  const addTag = useCallback((value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  }, [tags]);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleTagKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }, [addTag, tagInput, tags, removeTag]);

  const uploadToCloudinary = async (file: File) => {
    const signatureRes = await fetch('/api/admin/cloudinary-signature', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ folder: 'photogen/blog' }),
    });
    const signatureData = await signatureRes.json();
    if (!signatureRes.ok || !signatureData?.ok) {
      throw new Error(signatureData?.error || 'Failed to initialize upload');
    }

    const form = new FormData();
    form.append('file', file, file.name);
    form.append('api_key', signatureData.apiKey);
    form.append('timestamp', String(signatureData.timestamp));
    form.append('signature', signatureData.signature);
    form.append('folder', signatureData.folder);
    form.append('resource_type', signatureData.resourceType || 'image');

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/${signatureData.resourceType || 'image'}/upload`,
      { method: 'POST', body: form }
    );
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData?.secure_url || !uploadData?.public_id) {
      throw new Error(uploadData?.error?.message || 'Image upload failed');
    }

    return { url: uploadData.secure_url as string, public_id: uploadData.public_id as string };
  };

  const handleUploadCover = async (file?: File) => {
    if (!file) return;
    setUploadingCover(true);
    try {
      const uploaded = await uploadToCloudinary(file);
      setCoverImage(uploaded);
    } catch (err: any) {
      alert(err?.message || 'Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleEditorImageUpload = async (file: File) => {
    const uploaded = await uploadToCloudinary(file);
    setInlineImages((prev) => {
      if (prev.some((img) => img.public_id === uploaded.public_id)) return prev;
      return [...prev, uploaded];
    });
    return uploaded;
  };

  const validate = () => {
    const nextErrors: { title?: string; slug?: string; content?: string } = {};
    if (!title.trim()) nextErrors.title = 'Title is required';
    if (!slug.trim()) nextErrors.slug = 'Slug is required';
    if (!contentHtml.trim()) nextErrors.content = 'Content is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        slug: slugify(slug),
        excerpt: excerpt.trim(),
        contentHtml,
        tags,
        status,
        layout,
        coverImage,
        inlineImages,
        seoTitle: seoTitle.trim(),
        seoDescription: seoDescription.trim(),
      });
      onBack();
    } catch (err: any) {
      alert(err?.message || 'Failed to save blog post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-lg font-medium text-zinc-100">{post ? 'Edit Blog Post' : 'Create Blog Post'}</h2>
            <p className="text-sm text-zinc-500">Write, design, and publish your article.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors ${
              showPreview
                ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            <Eye size={14} />
            Preview
          </button>

          {post && onDelete && (
            <button
              onClick={() => {
                if (confirm(`Delete blog post \"${post.title}\"?`)) onDelete(post).then(onBack).catch(() => {});
              }}
              className="rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300 hover:bg-red-950 transition-colors"
            >
              <Trash2 size={14} className="inline mr-1" />
              Delete
            </button>
          )}

          <button
            onClick={() => handleSubmit()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-60 transition-colors"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving...' : 'Save Post'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <section className="space-y-5">
          {/* Content Card */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <FileText size={14} />
              Content
            </h3>

            {/* Title */}
            <div>
              <input
                value={title}
                onChange={(e) => {
                  const value = e.target.value;
                  setTitle(value);
                  if (autoSlug) setSlug(slugify(value));
                  if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                placeholder="Your article headline..."
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-lg text-zinc-100 outline-none focus:border-zinc-500 placeholder:text-zinc-600 transition-colors"
              />
              {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title}</p>}
            </div>

            {/* Slug */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-1.5 block text-xs text-zinc-400">Slug</label>
                <div className="flex items-center gap-0 rounded-md border border-zinc-700 bg-zinc-950 overflow-hidden focus-within:border-zinc-500 transition-colors">
                  <span className="pl-3 text-sm text-zinc-500">/blog/</span>
                  <input
                    value={slug}
                    onChange={(e) => {
                      setAutoSlug(false);
                      setSlug(slugify(e.target.value));
                      if (errors.slug) setErrors((prev) => ({ ...prev, slug: undefined }));
                    }}
                    placeholder="my-post-slug"
                    className="flex-1 bg-transparent px-1 py-2.5 text-sm text-zinc-100 outline-none"
                  />
                </div>
                {errors.slug && <p className="mt-1 text-xs text-red-400">{errors.slug}</p>}
              </div>
              <button
                type="button"
                onClick={() => {
                  setAutoSlug(true);
                  setSlug(slugify(title));
                }}
                className="mt-6 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 transition-colors"
              >
                Regenerate
              </button>
            </div>

            {/* Excerpt */}
            <div>
              <label className="mb-1.5 block text-xs text-zinc-400">Excerpt</label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={2}
                placeholder="Short summary for cards and SEO snippets..."
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-500 placeholder:text-zinc-600 transition-colors"
              />
            </div>

            {/* Body */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-zinc-400">Body</label>
                <span className="text-[10px] text-zinc-600">💡 Inline images display as cards on desktop</span>
              </div>
              <RichTextEditor
                content={contentHtml}
                onChange={(html) => {
                  setContentHtml(html);
                  if (errors.content) setErrors((prev) => ({ ...prev, content: undefined }));
                }}
                placeholder="Write the story. Add links and insert images from the toolbar."
                allowLinks
                allowImages
                onUploadImage={handleEditorImageUpload}
              />
              {errors.content && <p className="mt-1 text-xs text-red-400">{errors.content}</p>}
            </div>
          </div>

          {/* Live Preview */}
          {showPreview && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                <Eye size={14} />
                Live Preview — {LAYOUT_OPTIONS.find((l) => l.value === layout)?.label} Layout
              </h3>
              <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-6 overflow-hidden">
                {layout === 'magazine' && coverImage?.url && (
                  <div className="relative -mx-6 -mt-6 mb-6 aspect-[21/9] overflow-hidden">
                    <img src={coverImage.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <h1 className="text-2xl font-medium text-white leading-tight">{title || 'Untitled'}</h1>
                      {excerpt && <p className="mt-2 text-sm text-zinc-300 line-clamp-2">{excerpt}</p>}
                    </div>
                  </div>
                )}
                {layout === 'standard' && (
                  <>
                    {coverImage?.url && (
                      <div className="relative -mx-6 -mt-6 mb-6 aspect-video overflow-hidden">
                        <img src={coverImage.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      </div>
                    )}
                    <h1 className="text-2xl font-light text-zinc-100 leading-tight">{title || 'Untitled'}</h1>
                    {excerpt && <p className="mt-2 text-sm text-zinc-400">{excerpt}</p>}
                  </>
                )}
                {layout === 'minimal' && (
                  <>
                    <h1 className="text-3xl font-light text-zinc-100 leading-tight">{title || 'Untitled'}</h1>
                    {excerpt && <p className="mt-3 text-zinc-400">{excerpt}</p>}
                  </>
                )}
                <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1"><Clock size={11} />{textStats.readingMinutes} min read</span>
                  <span>{textStats.words} words</span>
                </div>
                {contentHtml && (
                  <div
                    className="prose prose-invert prose-sm max-w-none mt-6 border-t border-zinc-800 pt-6 prose-headings:font-normal prose-p:text-zinc-300 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-4 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-4 [&_li]:mb-1"
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                  />
                )}
              </div>
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Publishing */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Publishing</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('draft')}
                className={`rounded-md border px-3 py-2.5 text-xs uppercase tracking-wide transition-colors ${
                  status === 'draft' ? 'border-zinc-500 bg-zinc-800 text-zinc-100' : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:bg-zinc-900'
                }`}
              >
                Draft
              </button>
              <button
                type="button"
                onClick={() => setStatus('published')}
                className={`rounded-md border px-3 py-2.5 text-xs uppercase tracking-wide transition-colors ${
                  status === 'published' ? 'border-emerald-700 bg-emerald-950/50 text-emerald-300' : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:bg-zinc-900'
                }`}
              >
                Published
              </button>
            </div>
            {/* Stats */}
            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-800">
              <span className="flex items-center gap-1"><Clock size={11} />{textStats.readingMinutes} min read</span>
              <span>{textStats.words} words · {textStats.chars} chars</span>
            </div>
          </div>

          {/* Layout */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <Layout size={12} />
              Layout
            </h3>
            <div className="space-y-2">
              {LAYOUT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLayout(opt.value)}
                  className={`w-full rounded-md border p-3 text-left transition-all ${
                    layout === opt.value
                      ? 'border-zinc-500 bg-zinc-800 ring-1 ring-zinc-600'
                      : 'border-zinc-700 bg-zinc-950 hover:bg-zinc-900 hover:border-zinc-600'
                  }`}
                >
                  <p className={`text-sm font-medium ${layout === opt.value ? 'text-zinc-100' : 'text-zinc-300'}`}>{opt.label}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Cover Image */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Cover Image</h3>

            <label className="relative block cursor-pointer rounded-md border border-dashed border-zinc-700 bg-zinc-950 p-3 text-center hover:bg-zinc-900 transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadCover(e.target.files?.[0])}
              />
              <Upload size={16} className="mx-auto mb-1 text-zinc-500" />
              <p className="text-xs text-zinc-400">Click to upload</p>
            </label>

            {uploadingCover && <p className="text-xs text-zinc-500 animate-pulse">Uploading cover image...</p>}

            {coverImage && (
              <div className="rounded-md border border-zinc-800 bg-zinc-950 overflow-hidden">
                <div className="relative aspect-[16/10]">
                  <ImageWithLqip src={coverImage.url} alt="Cover" fill className="object-cover" transformOpts={{ w: 960, h: 600, fit: 'cover' }} />
                </div>
                <button
                  type="button"
                  onClick={() => setCoverImage(null)}
                  className="m-2 inline-flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <X size={12} />
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <Hash size={12} />
              Tags
            </h3>
            {tags.length > 0 && <TagPills tags={tags} onRemove={removeTag} />}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
              placeholder="Type and press Enter..."
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 placeholder:text-zinc-600 transition-colors"
            />
          </div>

          {/* SEO */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">SEO</h3>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">SEO Title</label>
              <input
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder={title || 'Page title for search engines'}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 placeholder:text-zinc-600 transition-colors"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">SEO Description</label>
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                rows={2}
                placeholder={excerpt || 'Description for search engines'}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 placeholder:text-zinc-600 transition-colors"
              />
            </div>
            <p className="text-[11px] text-zinc-600">Inline uploads tracked: {inlineImages.length}</p>
          </div>
        </aside>
      </form>
    </div>
  );
}
