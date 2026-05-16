export interface PersonaStyle {
  id: string;
  name: string;
  description: string;
  preview_image: string;
  gemini_image_prompt_prefix: string;
  css_filter: string;
}

export const PERSONA_STYLES: PersonaStyle[] = [
  {
    id: 'noir',
    name: 'Midnight Noir',
    description: 'Shadows, smoke, cinematic mystery.',
    preview_image: '/styles/noir-preview.jpg',
    gemini_image_prompt_prefix:
      'Film noir style portrait, high contrast black and white with dramatic shadows, 1940s cinematic lighting, smoke and mystery, grain texture.',
    css_filter: 'grayscale(0.3) contrast(1.2)',
  },
  {
    id: 'watercolor',
    name: 'Watercolor Dream',
    description: 'Soft edges, bleeding colors, ethereal.',
    preview_image: '/styles/watercolor-preview.jpg',
    gemini_image_prompt_prefix:
      'Watercolor painting style portrait, soft bleeding edges, pastel and saturated colors, paper texture visible, artistic and dreamy.',
    css_filter: '',
  },
  {
    id: 'pop_art',
    name: 'Pop Art',
    description: 'Bold lines, vivid colors, Warhol energy.',
    preview_image: '/styles/pop-art-preview.jpg',
    gemini_image_prompt_prefix:
      'Pop art style portrait in the style of Roy Lichtenstein, bold black outlines, Ben-Day dots, vivid primary colors, comic book aesthetic.',
    css_filter: 'saturate(1.3)',
  },
  {
    id: 'minimal',
    name: 'Line Drawing',
    description: 'Clean, elegant, single continuous line.',
    preview_image: '/styles/minimal-preview.jpg',
    gemini_image_prompt_prefix:
      'Minimalist single continuous line drawing portrait, black ink on white background, elegant and simple, no shading.',
    css_filter: '',
  },
];
