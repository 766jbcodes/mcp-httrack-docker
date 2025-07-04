import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { BrandAssets, LogoAsset, ColourPalette, FontAsset, LayoutStructure, SiteMetadata } from './types';

export class AssetExtractor {
  private downloadPath: string;
  private baseUrl: string;

  constructor(downloadPath: string, baseUrl: string) {
    this.downloadPath = downloadPath;
    this.baseUrl = baseUrl;
  }

  /**
   * Extract all brand assets from the downloaded website
   */
  async extractAssets(): Promise<BrandAssets> {
    try {
      // Find the main index.html file
      const indexFile = this.findIndexFile();
      if (!indexFile) {
        throw new Error('No index.html file found in downloaded site');
      }

      // Parse the main HTML file
      const htmlContent = fs.readFileSync(indexFile, 'utf-8');
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      // Extract all assets
      const logos = await this.extractLogos(document, indexFile);
      const colours = this.extractColours(document);
      const fonts = this.extractFonts(document);
      const layout = this.extractLayout(document);
      const metadata = this.extractMetadata(document);

      return {
        logos,
        colours,
        fonts,
        layout,
        metadata,
        extractedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Asset extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find the main index.html file in the downloaded site
   */
  private findIndexFile(): string | null {
    const possibleFiles = [
      path.join(this.downloadPath, 'index.html'),
      path.join(this.downloadPath, 'index.htm'),
      path.join(this.downloadPath, 'default.html'),
      path.join(this.downloadPath, 'default.htm')
    ];

    for (const file of possibleFiles) {
      if (fs.existsSync(file)) {
        return file;
      }
    }

    // Search recursively for index files
    return this.findIndexFileRecursive(this.downloadPath);
  }

  private findIndexFileRecursive(dir: string): string | null {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          const result = this.findIndexFileRecursive(fullPath);
          if (result) return result;
        } else if (item.toLowerCase() === 'index.html' || item.toLowerCase() === 'index.htm') {
          return fullPath;
        }
      }
    } catch (error) {
      // Ignore permission errors and continue
    }
    
    return null;
  }

  /**
   * Extract logo assets from the HTML document
   */
  private async extractLogos(document: Document, indexFilePath: string): Promise<LogoAsset[]> {
    const logos: LogoAsset[] = [];
    const baseDir = path.dirname(indexFilePath);

    // Look for favicon
    const favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]') as HTMLLinkElement;
    if (favicon?.href) {
      const faviconPath = this.resolveLocalPath(favicon.href, baseDir);
      if (faviconPath && fs.existsSync(faviconPath)) {
        logos.push({
          type: 'favicon',
          src: favicon.href,
          filename: path.basename(faviconPath),
          localPath: faviconPath
        });
      }
    }

    // Look for logos in header and footer
    const logoSelectors = [
      'header img[src*="logo"], header img[alt*="logo"], header img[alt*="Logo"]',
      'footer img[src*="logo"], footer img[alt*="logo"], footer img[alt*="Logo"]',
      '.logo img, #logo img, [class*="logo"] img',
      'img[src*="logo"], img[alt*="logo"], img[alt*="Logo"]'
    ];

    for (const selector of logoSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const img = element as HTMLImageElement;
        if (img.src) {
          const logoPath = this.resolveLocalPath(img.src, baseDir);
          if (logoPath && fs.existsSync(logoPath)) {
            const type = this.determineLogoType(img);
            logos.push({
              type,
              src: img.src,
              alt: img.alt || undefined,
              width: img.width || undefined,
              height: img.height || undefined,
              filename: path.basename(logoPath),
              localPath: logoPath
            });
          }
        }
      }
    }

    // Remove duplicates based on localPath
    return logos.filter((logo, index, self) => 
      index === self.findIndex(l => l.localPath === logo.localPath)
    );
  }

  private determineLogoType(img: HTMLImageElement): 'header' | 'footer' | 'favicon' | 'other' {
    const parent = img.closest('header, footer');
    if (parent?.tagName.toLowerCase() === 'header') return 'header';
    if (parent?.tagName.toLowerCase() === 'footer') return 'footer';
    return 'other';
  }

  /**
   * Extract colour palette from CSS and inline styles
   */
  private extractColours(document: Document): ColourPalette {
    const colours = new Set<string>();
    const primary: string[] = [];
    const secondary: string[] = [];
    const background: string[] = [];
    const text: string[] = [];
    const accent: string[] = [];

    // Extract from inline styles
    const elementsWithStyles = document.querySelectorAll('[style]');
    for (const element of elementsWithStyles) {
      const style = element.getAttribute('style');
      if (style) {
        const extracted = this.extractColoursFromCSS(style);
        extracted.forEach(colour => colours.add(colour));
      }
    }

    // Extract from style tags
    const styleTags = document.querySelectorAll('style');
    for (const styleTag of styleTags) {
      const css = styleTag.textContent || '';
      const extracted = this.extractColoursFromCSS(css);
      extracted.forEach(colour => colours.add(colour));
    }

    // Extract from external CSS files (basic implementation)
    const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
    for (const link of linkTags) {
      const href = (link as HTMLLinkElement).href;
      if (href && href.startsWith('file://')) {
        try {
          const cssPath = href.replace('file://', '');
          if (fs.existsSync(cssPath)) {
            const cssContent = fs.readFileSync(cssPath, 'utf-8');
            const extracted = this.extractColoursFromCSS(cssContent);
            extracted.forEach(colour => colours.add(colour));
          }
        } catch (error) {
          // Ignore CSS file reading errors
        }
      }
    }

    // Categorise colours (basic heuristic)
    const allColours = Array.from(colours);
    for (const colour of allColours) {
      if (this.isBackgroundColour(colour)) {
        background.push(colour);
      } else if (this.isTextColour(colour)) {
        text.push(colour);
      } else if (this.isPrimaryColour(colour)) {
        primary.push(colour);
      } else if (this.isSecondaryColour(colour)) {
        secondary.push(colour);
      } else {
        accent.push(colour);
      }
    }

    return {
      primary: primary.slice(0, 5), // Limit to top 5
      secondary: secondary.slice(0, 5),
      background: background.slice(0, 5),
      text: text.slice(0, 5),
      accent: accent.slice(0, 5),
      all: allColours
    };
  }

  private extractColoursFromCSS(css: string): string[] {
    const colourRegex = /#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)/g;
    const matches = css.match(colourRegex) || [];
    return matches.filter(colour => colour !== 'transparent' && colour !== 'inherit');
  }

  private isBackgroundColour(colour: string): boolean {
    return colour.toLowerCase().includes('fff') || colour.toLowerCase().includes('white') || 
           colour.toLowerCase().includes('f5f5f5') || colour.toLowerCase().includes('fafafa');
  }

  private isTextColour(colour: string): boolean {
    return colour.toLowerCase().includes('000') || colour.toLowerCase().includes('333') || 
           colour.toLowerCase().includes('666') || colour.toLowerCase().includes('999');
  }

  private isPrimaryColour(colour: string): boolean {
    // Heuristic for primary colours (blues, brand colours)
    return colour.toLowerCase().includes('007') || colour.toLowerCase().includes('006') || 
           colour.toLowerCase().includes('005') || colour.toLowerCase().includes('004');
  }

  private isSecondaryColour(colour: string): boolean {
    // Heuristic for secondary colours (greens, oranges, etc.)
    return colour.toLowerCase().includes('28a745') || colour.toLowerCase().includes('ffc107') || 
           colour.toLowerCase().includes('dc3545') || colour.toLowerCase().includes('6c757d');
  }

  /**
   * Extract font information from the document
   */
  private extractFonts(document: Document): FontAsset[] {
    const fonts = new Map<string, FontAsset>();

    // Extract from Google Fonts links
    const googleFontLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
    for (const link of googleFontLinks) {
      const href = (link as HTMLLinkElement).href;
      if (href) {
        const fontFamily = this.extractGoogleFontFamily(href);
        if (fontFamily) {
          fonts.set(fontFamily, {
            family: fontFamily,
            source: 'google',
            url: href
          });
        }
      }
    }

    // Extract from @font-face declarations
    const styleTags = document.querySelectorAll('style');
    for (const styleTag of styleTags) {
      const css = styleTag.textContent || '';
      const fontFaceMatches = css.match(/@font-face\s*\{[^}]*font-family:\s*['"]([^'"]+)['"][^}]*\}/g);
      if (fontFaceMatches) {
        for (const match of fontFaceMatches) {
          const familyMatch = match.match(/font-family:\s*['"]([^'"]+)['"]/);
          const srcMatch = match.match(/src:\s*url\(['"]?([^'"]+)['"]?\)/);
          if (familyMatch && srcMatch) {
            fonts.set(familyMatch[1], {
              family: familyMatch[1],
              source: 'self-hosted',
              url: srcMatch[1]
            });
          }
        }
      }
    }

    // Extract from computed styles (basic implementation)
    const body = document.body;
    if (body) {
      const computedStyle = body.style.fontFamily;
      if (computedStyle) {
        const families = computedStyle.split(',').map(f => f.trim().replace(/['"]/g, ''));
        for (const family of families) {
          if (family && !fonts.has(family)) {
            fonts.set(family, {
              family,
              source: 'system'
            });
          }
        }
      }
    }

    return Array.from(fonts.values());
  }

  private extractGoogleFontFamily(url: string): string | null {
    const match = url.match(/family=([^&]+)/);
    if (match) {
      return decodeURIComponent(match[1].split(':')[0]);
    }
    return null;
  }

  /**
   * Extract layout structure elements
   */
  private extractLayout(document: Document): LayoutStructure {
    return {
      header: document.querySelector('header') as HTMLElement || document.querySelector('.header') as HTMLElement || document.querySelector('#header') as HTMLElement,
      footer: document.querySelector('footer') as HTMLElement || document.querySelector('.footer') as HTMLElement || document.querySelector('#footer') as HTMLElement,
      navigation: document.querySelector('nav') as HTMLElement || document.querySelector('.nav') as HTMLElement || document.querySelector('#nav') as HTMLElement || 
                  document.querySelector('.navigation') as HTMLElement || document.querySelector('#navigation') as HTMLElement,
      mainContent: document.querySelector('main') as HTMLElement || document.querySelector('.main') as HTMLElement || document.querySelector('#main') as HTMLElement ||
                   document.querySelector('.content') as HTMLElement || document.querySelector('#content') as HTMLElement,
      sidebar: document.querySelector('aside') as HTMLElement || document.querySelector('.sidebar') as HTMLElement || document.querySelector('#sidebar') as HTMLElement
    };
  }

  /**
   * Extract site metadata
   */
  private extractMetadata(document: Document): SiteMetadata {
    const title = document.querySelector('title')?.textContent || '';
    const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || undefined;
    const keywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content')?.split(',').map(k => k.trim()) || undefined;
    const viewport = document.querySelector('meta[name="viewport"]')?.getAttribute('content') || undefined;
    const themeColor = document.querySelector('meta[name="theme-color"]')?.getAttribute('content') || undefined;

    return {
      title,
      description,
      keywords,
      viewport,
      themeColor
    };
  }

  /**
   * Resolve a URL to a local file path
   */
  private resolveLocalPath(url: string, baseDir: string): string | null {
    try {
      // Handle relative URLs
      if (url.startsWith('./') || url.startsWith('../') || !url.startsWith('http')) {
        const resolvedPath = path.resolve(baseDir, url);
        return resolvedPath;
      }

      // Handle absolute URLs from the same domain
      if (url.startsWith(this.baseUrl)) {
        const relativePath = url.replace(this.baseUrl, '');
        const resolvedPath = path.resolve(this.downloadPath, relativePath);
        return resolvedPath;
      }

      return null;
    } catch (error) {
      return null;
    }
  }
} 