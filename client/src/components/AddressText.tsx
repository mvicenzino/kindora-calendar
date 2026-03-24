import { MapPin } from "lucide-react";

const STREET_SUFFIXES =
  "Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|" +
  "Court|Ct|Way|Place|Pl|Circle|Cir|Parkway|Pkwy|Highway|Hwy|" +
  "Trail|Trl|Terrace|Ter|Loop|Run|Path|Row|Square|Sq";

const ADDRESS_RE = new RegExp(
  `\\b(\\d+\\s+[\\w\\s]*?\\b(?:${STREET_SUFFIXES})\\.?)(?:[,\\s]+(?:[\\w\\s]+,\\s*)?(?:[A-Z]{2}\\s+)?\\d{5}(?:-\\d{4})?)?`,
  "gi"
);

function googleMapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}

function renderWithAddressLinks(text: string): React.ReactNode[] {
  ADDRESS_RE.lastIndex = 0;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = ADDRESS_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const matched = match[0];
    nodes.push(
      <a
        key={match.index}
        href={googleMapsUrl(matched)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:opacity-80 transition-opacity break-words"
        onClick={(e) => e.stopPropagation()}
      >
        <MapPin className="w-3 h-3 shrink-0" />
        {matched}
      </a>
    );
    lastIndex = match.index + matched.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

interface AddressTextProps {
  text: string;
  className?: string;
}

export function AddressText({ text, className }: AddressTextProps) {
  const lines = text.split("\n");
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i}>
          {renderWithAddressLinks(line)}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </span>
  );
}
