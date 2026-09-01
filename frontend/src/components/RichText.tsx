import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Rendu du markdown restreint utilisé dans les fiches produit :
 * titres `###`, listes `-`, séparateurs `---`, gras `**`, italique `*`.
 *
 * Volontairement écrit sans dangerouslySetInnerHTML : le contenu vient de la
 * base et peut être édité depuis le back-office. Produire des éléments React
 * évite toute injection de balise.
 */
export function RichText({ content, className }: { content: string; className?: string }) {
  return <div className={cn('rich-text', className)}>{renderBlocks(content)}</div>;
}

function renderBlocks(source: string): ReactNode[] {
  const blocks: ReactNode[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');

  let listBuffer: string[] = [];
  let paragraphBuffer: string[] = [];
  let tableBuffer: string[] = [];
  let key = 0;

  const flushTable = () => {
    if (!tableBuffer.length) return;
    const rows = tableBuffer.map(splitRow);
    // La deuxième ligne d'un tableau markdown est le séparateur `--- | ---`.
    const [head, , ...body] = rows;
    blocks.push(
      <div key={`table-${key++}`} className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              {head.map((cell, i) => (
                <th key={i}>{renderInline(cell)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{renderInline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    tableBuffer = [];
  };

  const flushList = () => {
    if (!listBuffer.length) return;
    blocks.push(
      <ul key={`ul-${key++}`}>
        {listBuffer.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    blocks.push(<p key={`p-${key++}`}>{renderInline(paragraphBuffer.join(' '))}</p>);
    paragraphBuffer = [];
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      flushTable();
      flushList();
      flushParagraph();
      continue;
    }

    if (line.startsWith('|') && line.endsWith('|')) {
      flushList();
      flushParagraph();
      tableBuffer.push(line);
      continue;
    }
    flushTable();

    if (line === '---') {
      flushList();
      flushParagraph();
      blocks.push(<hr key={`hr-${key++}`} />);
      continue;
    }

    if (line.startsWith('### ')) {
      flushList();
      flushParagraph();
      blocks.push(<h3 key={`h3-${key++}`}>{renderInline(line.slice(4))}</h3>);
      continue;
    }

    if (line.startsWith('- ')) {
      flushParagraph();
      listBuffer.push(line.slice(2));
      continue;
    }

    flushList();
    paragraphBuffer.push(line);
  }

  flushTable();
  flushList();
  flushParagraph();
  return blocks;
}

function splitRow(row: string): string[] {
  return row
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

/** Découpe `**gras**` et `*italique*` en conservant l'ordre du texte. */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>);
    }

    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  }

  return nodes;
}
