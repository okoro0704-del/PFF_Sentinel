# PWA Icons Directory

This directory contains the Progressive Web App (PWA) icons for the PFF Sentinel Distribution Portal.

## Required Icon Sizes

The following icon sizes are required for full PWA support:

- `icon-72x72.png` - 72x72 pixels
- `icon-96x96.png` - 96x96 pixels
- `icon-128x128.png` - 128x128 pixels
- `icon-144x144.png` - 144x144 pixels
- `icon-152x152.png` - 152x152 pixels
- `icon-192x192.png` - 192x192 pixels
- `icon-384x384.png` - 384x384 pixels
- `icon-512x512.png` - 512x512 pixels

## Creating Icons

You can create these icons using:

1. **Online Tools:**
   - [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
   - [RealFaviconGenerator](https://realfavicongenerator.net/)
   - [Favicon.io](https://favicon.io/)

2. **Design Software:**
   - Adobe Photoshop
   - Figma
   - GIMP (free)
   - Inkscape (free, for SVG)

3. **Command Line (ImageMagick):**
   ```bash
   # Convert a single source image to all required sizes
   convert source-icon.png -resize 72x72 icon-72x72.png
   convert source-icon.png -resize 96x96 icon-96x96.png
   convert source-icon.png -resize 128x128 icon-128x128.png
   convert source-icon.png -resize 144x144 icon-144x144.png
   convert source-icon.png -resize 152x152 icon-152x152.png
   convert source-icon.png -resize 192x192 icon-192x192.png
   convert source-icon.png -resize 384x384 icon-384x384.png
   convert source-icon.png -resize 512x512 icon-512x512.png
   ```

## Design Guidelines

- **Theme:** Security, protection, sentinel/shield imagery
- **Colors:** Use the PFF Sentinel brand colors:
  - Primary: `#3b82f6` (blue)
  - Secondary: `#8b5cf6` (purple)
  - Background: `#0f172a` (dark blue)
- **Style:** Modern, clean, high-contrast
- **Symbol:** Consider using a shield (🛡️) or lock icon
- **Maskable:** Ensure icons work well with Android's adaptive icons (safe zone in center)

## Temporary Placeholder

Until custom icons are created, you can use a simple placeholder or the shield emoji as a temporary solution.

For production, replace these placeholders with professionally designed icons that match your brand identity.

