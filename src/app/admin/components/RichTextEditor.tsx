"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Heading2 } from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder || 'Write something...',
        emptyEditorClass: 'cursor-text before:content-[attr(data-placeholder)] before:absolute before:text-zinc-500 before:opacity-50 before:pointer-events-none',
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      // Return HTML output
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[100px] text-sm text-white [&_strong]:font-bold [&_b]:font-bold',
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-md overflow-hidden focus-within:border-zinc-500 transition-colors">
      <div className="flex items-center gap-1 p-2 border-b border-zinc-800 bg-zinc-900/50">
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
          className={`p-1.5 rounded-md hover:bg-zinc-800 transition-colors ${editor.isActive('bold') ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
          title="Bold (Ctrl+B)"
        >
          <Bold size={14} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
          className={`p-1.5 rounded-md hover:bg-zinc-800 transition-colors ${editor.isActive('italic') ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
          title="Italic (Ctrl+I)"
        >
          <Italic size={14} />
        </button>
        <div className="w-px h-4 bg-zinc-800 mx-1" />
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
          className={`p-1.5 rounded-md hover:bg-zinc-800 transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
          title="Heading"
        >
          <Heading2 size={14} />
        </button>
        <div className="w-px h-4 bg-zinc-800 mx-1" />
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
          className={`p-1.5 rounded-md hover:bg-zinc-800 transition-colors ${editor.isActive('bulletList') ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
          title="Bullet List"
        >
          <List size={14} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
          className={`p-1.5 rounded-md hover:bg-zinc-800 transition-colors ${editor.isActive('orderedList') ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
          title="Numbered List"
        >
          <ListOrdered size={14} />
        </button>
      </div>
      <div className="p-3 relative">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
