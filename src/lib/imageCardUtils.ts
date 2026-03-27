/**
 * Wraps standalone <img> tags in <figure> tags for styled card display
 * Preserves existing figure elements and processes only bare images
 */
export function wrapImagesInFigures(html: string): string {
  // Create a temporary container to parse HTML
  const container = document.createElement('div');
  container.innerHTML = html;

  // Find all images
  const images = container.querySelectorAll('img');

  images.forEach((img) => {
    // Skip if the image is already inside a figure
    if (img.closest('figure')) {
      return;
    }

    // Create figure element with card styling
    const figure = document.createElement('figure');
    figure.className = 'my-8 rounded-xl border border-border bg-card/50 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300';

    // Move the image into the figure
    img.replaceWith(figure);
    figure.appendChild(img);

    // Reset image styles to work within figure container
    img.style.width = '100%';
    img.style.height = 'auto';
    img.classList.remove('rounded-md', 'border', 'border-zinc-800');
  });

  return container.innerHTML;
}

/**
 * Server-side version using regex (for SSR compatibility)
 * Wraps bare <img> tags in <figure> tags with inline styles
 * Handles both self-closing and standard img tags
 */
export function wrapImagesInFiguresRegex(html: string): string {
  if (!html) return html;

  // Pattern to match img tags (both self-closing and standard)
  const imgPattern = /<img\s+([^>]*)?\s*\/?>/gi;
  let result = html;

  // Process all matches in reverse order to preserve indices
  const matches = Array.from(html.matchAll(imgPattern));
  
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const fullMatch = match[0];
    const startIdx = match.index || 0;

    // Check if this image is already inside a figure tag
    const beforeImg = html.substring(0, startIdx);
    const lastFigureOpen = beforeImg.lastIndexOf('<figure');
    const lastFigureClose = beforeImg.lastIndexOf('</figure>');
    
    // Skip if already in a figure
    if (lastFigureOpen > lastFigureClose) {
      continue;
    }

    // Wrap with inline styles - using CSS variables from the global theme
    // Added aspect-ratio: 16/9 to ensure consistent dimensions
    const wrappedImg = `<figure style="margin: 2rem 0; border-radius: 12px; border: 1px solid var(--border); background-color: var(--card); overflow: hidden; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); transition: box-shadow 0.3s ease; aspect-ratio: 16/9;">${fullMatch}</figure>`;
    
    result = result.substring(0, startIdx) + wrappedImg + result.substring(startIdx + fullMatch.length);
  }

  return result;
}
