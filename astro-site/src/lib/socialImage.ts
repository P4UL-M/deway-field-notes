import { Resvg } from '@resvg/resvg-js';

interface SocialImageData {
  title: string;
  summary: string;
  type: 'article' | 'session' | 'website';
  date?: string;
}

const WIDTH = 1200;
const HEIGHT = 630;

function escapeXML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(value: string, maxLength: number, maxLines: number): string[] {
  const words = value.trim().replace(/\s+([,.;:!?])/gu, '$1').split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  let overflow = false;

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLength || !current) {
      current = candidate;
      continue;
    }

    if (lines.length < maxLines - 1) {
      lines.push(current);
      current = word;
      continue;
    }

    overflow = true;
    break;
  }

  if (current && lines.length < maxLines) lines.push(current);

  if (overflow && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.,;:!?]?$/u, '')}…`;
  }

  return lines;
}

function textLines(lines: string[], x: number, y: number, lineHeight: number): string {
  return lines
    .map((line, index) => `<text x="${x}" y="${y + index * lineHeight}">${escapeXML(line)}</text>`)
    .join('');
}

export function renderSocialImage(data: SocialImageData): ArrayBuffer {
  const titleLength = Array.from(data.title).length;
  const titleSize = titleLength <= 46 ? 88 : titleLength <= 76 ? 76 : 64;
  const titleLineHeight = Math.round(titleSize * 0.96);
  const titleMaxLength = titleLength <= 46 ? 25 : titleLength <= 76 ? 31 : 38;
  const titleLines = wrapText(data.title, titleMaxLength, 3);
  const summaryLines = wrapText(data.summary, 68, 2);
  const label = data.type === 'session' ? 'WORKING SESSION' : data.type === 'article' ? 'FIELD NOTE' : 'FIELD NOTES';
  const date = data.date ? ` · ${data.date}` : '';
  const titleY = titleLines.length === 1 ? 306 : titleLines.length === 2 ? 252 : 206;
  const summaryY = Math.min(titleY + titleLines.length * titleLineHeight + 58, 488);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <rect width="1200" height="630" fill="#1f1e1b"/>
      <rect width="1200" height="8" fill="#df8060"/>
      <line x1="72" y1="112" x2="1128" y2="112" stroke="#3c3933" stroke-width="2"/>
      <circle cx="82" cy="68" r="7" fill="#df8060"/>
      <g fill="#eee9df" font-family="Geist" font-size="27" font-weight="600" letter-spacing="-0.7">
        <text x="103" y="77">paul@deway:~$ blog</text>
      </g>
      <g fill="#aaa59c" font-family="Geist" font-size="17" font-weight="500" letter-spacing="2.6">
        <text x="1128" y="76" text-anchor="end">${label}${escapeXML(date)}</text>
      </g>
      <g fill="#eee9df" font-family="Newsreader" font-size="${titleSize}" font-weight="600" letter-spacing="-2.2">
        ${textLines(titleLines, 72, titleY, titleLineHeight)}
      </g>
      <g fill="#aaa59c" font-family="Geist" font-size="25" font-weight="400">
        ${textLines(summaryLines, 76, summaryY, 35)}
      </g>
      <line x1="72" y1="571" x2="1128" y2="571" stroke="#3c3933" stroke-width="2"/>
      <g font-family="Geist" font-size="16" font-weight="500" letter-spacing="1.8">
        <text x="72" y="604" fill="#df8060">DEWAY — FIELD NOTES</text>
        <text x="1128" y="604" text-anchor="end" fill="#77736c">BLOG.DEWAY.FR</text>
      </g>
    </svg>
  `;

  const fontDirectory = `${process.cwd()}/fonts`;
  const renderer = new Resvg(svg, {
    fitTo: { mode: 'original' },
    font: {
      loadSystemFonts: false,
      fontFiles: [
        `${fontDirectory}/Geist-Regular.ttf`,
        `${fontDirectory}/Newsreader.ttf`,
      ],
      sansSerifFamily: 'Geist',
      serifFamily: 'Newsreader',
      defaultFontFamily: 'Geist',
    },
  });

  const png = renderer.render().asPng();
  return png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;
}
