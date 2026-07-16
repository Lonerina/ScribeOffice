import React from "react";

export function SimpleMarkdown({ content }: { content: string }) {
  if (!content) return null;
  const blocks = content.split("\n\n");
  return (
    <div className="space-y-4 text-[#d1d1d1] leading-relaxed text-sm md:text-base">
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="text-base md:text-lg font-serif italic text-[#e5e5e5] mt-5 mb-2">
              {trimmed.slice(4)}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={idx} className="text-lg md:text-xl font-serif italic text-[#e5e5e5] mt-6 mb-3 border-b border-[#2a2a2b] pb-1">
              {trimmed.slice(3)}
            </h3>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={idx} className="text-xl md:text-2xl font-serif italic text-[#e5e5e5] mt-8 mb-4">
              {trimmed.slice(2)}
            </h2>
          );
        }

        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const items = trimmed.split("\n").map((item) => item.replace(/^[-*]\s+/, ""));
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1.5 my-3">
              {items.map((item, itemIdx) => (
                <li key={itemIdx} className="text-[#b1b1b1] font-sans">
                  {item}
                </li>
              ))}
            </ul>
          );
        }

        if (/^\d+\.\s+/.test(trimmed)) {
          const items = trimmed.split("\n").map((item) => item.replace(/^\d+\.\s+/, ""));
          return (
            <ol key={idx} className="list-decimal pl-5 space-y-1.5 my-3">
              {items.map((item, itemIdx) => (
                <li key={itemIdx} className="text-[#b1b1b1] font-sans">
                  {item}
                </li>
              ))}
            </ol>
          );
        }

        if (trimmed.startsWith("> ") || trimmed.startsWith("\"\"\"")) {
          const cleanText = trimmed.replace(/^>\s+/, "").replace(/^"""|"""$/g, "");
          return (
            <blockquote key={idx} className="border-l-4 border-[#d4af37] bg-[#1a1a1c] px-4 py-2.5 italic text-[#999] font-sans my-4 rounded-r">
              {cleanText}
            </blockquote>
          );
        }

        const parts = trimmed.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={idx} className="font-sans text-[#b1b1b1]">
            {parts.map((part, partIdx) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return (
                  <strong key={partIdx} className="font-semibold text-[#e5e5e5]">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
}
