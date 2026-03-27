# Blog Content Layout & Image Guidelines

## Overview
The blog layout has been refactored to provide:
- **Wider content containers** for better desktop readability
- **Improved image card styling** for inline images
- **Enhanced responsive design** across all layouts

## Content Width Specifications

### Article Container
- **Mobile (< 768px)**: Full width with responsive padding (`px-4`)
- **Tablet (768px - 1024px)**: `max-w-5xl` (80rem / ~1280px)
- **Desktop (> 1024px)**: `max-w-6xl` (96rem / ~1536px)

This provides significantly more horizontal space compared to the previous narrow layout, while maintaining excellent readability.

### Layout-Specific Headers
- **Standard Layout**: Headers limited to `max-w-4xl` for visual balance (cover image will extend wider)
- **Minimal Layout**: Headers limited to `max-w-4xl` for text-focused readability
- **Magazine Layout**: Full width for dramatic hero image impact

## Image Display

### Inline Images
All images embedded in blog content automatically display as **image cards** with:
- Rounded corners (xl)
- Subtle border styling
- Soft shadow effects that enhance on hover
- Responsive aspect ratios
- Figure captions support

#### How They Appear:
1. **Mobile**: Full width with slight padding
2. **Tablet**: ~90vw width, centered
3. **Desktop**: ~85vw width, centered (respects article max-width)

### Image Card Features
```html
<figure>
  <div class="rounded-xl border bg-card/50 overflow-hidden shadow-sm hover:shadow-md">
    <!-- Image content -->
  </div>
  <figcaption>Optional caption text</figcaption>
</figure>
```

## Uploading Images in Admin

1. **Cover Image**: Upload via the "Cover Image" section in the sidebar
2. **Inline Images**: Use the image button in the rich text editor toolbar
   - Images are automatically wrapped in figure elements
   - They'll display as cards on the published page
   - The editor shows a preview tooltip

### Image Best Practices
- **Dimensions**: 1000x600px or wider for best quality
- **Format**: JPG/WebP for photos, PNG for graphics
- **Size**: Optimize before upload (keep under 200KB)
- **Captions**: Add alt text in the editor for accessibility

## Layout Selection Guide

### Standard Layout (Recommended for most posts)
- ✅ Best for: Mixed content (text + images)
- ✅ Shows: Cover image above title
- ✅ Content width: Responsive, up to 6xl
- When to use: Most blog posts with visual focus

### Magazine Layout
- ✅ Best for: Image-first storytelling
- ✅ Shows: Full-screen hero with overlay title
- ✅ Content width: Same as standard
- When to use: Visual narratives, photography posts

### Minimal Layout
- ✅ Best for: Long-form essays, text-heavy content
- ✅ Shows: No hero image, focused typography
- ✅ Content width: Slightly narrower for readability
- When to use: Think pieces, analytical posts

## Content Width Comparison

| Layout | Desktop Width | Use Case |
|--------|---------------|----------|
| Standard | max-w-6xl (96rem) | Balanced visual + text |
| Magazine | max-w-6xl (96rem) | Visual storytelling |
| Minimal | max-w-6xl (96rem) | Text-focused content |
| Headers | max-w-4xl (64rem) | Visual balance |

## Responsive Design Notes

- All images scale proportionally on smaller screens
- Content maintains proper spacing and margins
- Text remains readable at all viewport sizes
- Horizontal scrolling is never required

## Future Enhancements

Potential improvements to consider:
- Gallery layouts for multiple images
- Pull quotes with styling
- Callout boxes for emphasis
- Video embedding support
- Interactive elements

---

**Created**: Blog layout refactor v2  
**Last Updated**: March 2026
