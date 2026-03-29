"use client";

import React, { useRef, useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import {
  Bold, Italic, Strikethrough as StrikethroughIcon, List, ListOrdered,
  Link2, ImagePlus, Loader2, Quote, Code2, Minus, Undo2, Redo2, Heading1, Heading2, Heading3,
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  allowLinks?: boolean;
  allowImages?: boolean;
  onUploadImage?: (file: File) => Promise<{ url: string; public_id: string }>;
}

function ToolbarBtn({
  active, disabled, onClick, title, children,
}: {
  active?: boolean; disabled?: boolean; onClick: (e: React.MouseEvent) => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); onClick(e); }}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-zinc-700/60 mx-0.5 self-center" />;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder,
  allowLinks = false,
  allowImages = false,
  onUploadImage,
}: RichTextEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
          class: 'text-zinc-200 underline underline-offset-2',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'w-full h-auto object-cover rounded-none border-none',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Write something...',
        emptyEditorClass: 'cursor-text before:content-[attr(data-placeholder)] before:absolute before:text-zinc-500 before:opacity-50 before:pointer-events-none',
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[280px] text-sm text-white [&_strong]:font-bold [&_b]:font-bold [&_h1]:text-4xl [&_h1]:md:text-5xl [&_h1]:font-semibold [&_h1]:leading-tight [&_h2]:text-3xl [&_h2]:md:text-4xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h3]:text-2xl [&_h3]:md:text-3xl [&_h3]:font-semibold [&_h3]:leading-tight [&_p]:leading-7 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:pl-1 [&_ul]:my-4 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:pl-1 [&_ol]:my-4 [&_li]:pl-1 [&_li]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-zinc-300 [&_pre]:bg-zinc-900 [&_pre]:border [&_pre]:border-zinc-700 [&_pre]:rounded-md [&_pre]:p-3 [&_pre]:text-sm [&_code]:bg-zinc-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_hr]:border-zinc-700 [&_hr]:my-6 [&_s]:text-zinc-400',
      },
    },
  });

  useEffect(() => {
    if (editor && !isInternalUpdate.current && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
    isInternalUpdate.current = false;
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const toggleLink = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    const url = window.prompt('Enter URL', previousUrl);
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
  };

  const handlePickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const file = e.target.files?.[0];
    if (!file) return;
    if (!allowImages || !onUploadImage) {
      inputEl.value = '';
      return;
    }
    try {
      setUploadingImage(true);
      const uploaded = await onUploadImage(file);
      editor.chain().focus().setImage({ src: uploaded.url, alt: file.name }).run();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload image';
      alert(message);
    } finally {
      inputEl.value = '';
      setUploadingImage(false);
    }
  };

  return (
    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-md overflow-hidden focus-within:border-zinc-500 transition-colors">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePickImage}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-zinc-800 bg-zinc-900/60">
        {/* Undo / Redo */}
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)" disabled={!editor.can().undo()}>
          <Undo2 size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Shift+Z)" disabled={!editor.can().redo()}>
          <Redo2 size={14} />
        </ToolbarBtn>

        <Divider />

        {/* Text formatting */}
        <ToolbarBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)">
          <Bold size={14} />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)">
          <Italic size={14} />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
          <StrikethroughIcon size={14} />
        </ToolbarBtn>

        <Divider />

        {/* Headings */}
        <ToolbarBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
          <Heading1 size={14} />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
          <Heading2 size={14} />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
          <Heading3 size={14} />
        </ToolbarBtn>

        <Divider />

        {/* Lists */}
        <ToolbarBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
          <List size={14} />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
          <ListOrdered size={14} />
        </ToolbarBtn>

        <Divider />

        {/* Blocks */}
        <ToolbarBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">
          <Quote size={14} />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block">
          <Code2 size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
          <Minus size={14} />
        </ToolbarBtn>

        {allowLinks && (
          <>
            <Divider />
            <ToolbarBtn active={editor.isActive('link')} onClick={toggleLink} title="Insert Link">
              <Link2 size={14} />
            </ToolbarBtn>
          </>
        )}

        {allowImages && onUploadImage && (
          <ToolbarBtn
            disabled={uploadingImage}
            onClick={() => { if (!uploadingImage) imageInputRef.current?.click(); }}
            title="Insert Image"
          >
            {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
          </ToolbarBtn>
        )}
      </div>

      <div className="p-4 relative">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
