import { Editor } from "@tiptap/react";
import { ChevronDown, Type, Search } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { ToolbarDropdown } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/Toolbar/ToolbarDropdown";
import { useState, useMemo } from "react";

type FontFamilyDropdownProps = {
  editor: Editor;
};

const allFonts = [
  { name: "Default", value: "" },
  { name: "American Typewriter", value: "'American Typewriter', serif" },
  { name: "Andale Mono", value: "'Andale Mono', monospace" },
  { name: "Arial", value: "Arial, sans-serif" },
  { name: "Arial Black", value: "'Arial Black', sans-serif" },
  { name: "Arial Narrow", value: "'Arial Narrow', sans-serif" },
  {
    name: "Arial Rounded MT Bold",
    value: "'Arial Rounded MT Bold', sans-serif",
  },
  { name: "Avant Garde", value: "'Avant Garde', sans-serif" },
  { name: "Baskerville", value: "Baskerville, serif" },
  { name: "Big Caslon", value: "'Big Caslon', serif" },
  { name: "Bodoni MT", value: "'Bodoni MT', serif" },
  { name: "Book Antiqua", value: "'Book Antiqua', serif" },
  { name: "Bookman", value: "'Bookman Old Style', serif" },
  { name: "Bradley Hand", value: "'Bradley Hand', cursive" },
  { name: "Brush Script MT", value: "'Brush Script MT', cursive" },
  { name: "Calibri", value: "Calibri, sans-serif" },
  { name: "Calisto MT", value: "'Calisto MT', serif" },
  { name: "Cambria", value: "Cambria, serif" },
  { name: "Candara", value: "Candara, sans-serif" },
  { name: "Century", value: "Century, serif" },
  { name: "Century Gothic", value: "'Century Gothic', sans-serif" },
  { name: "Century Schoolbook", value: "'Century Schoolbook', serif" },
  { name: "Chalkboard", value: "Chalkboard, sans-serif" },
  { name: "Chalkboard SE", value: "'Chalkboard SE', sans-serif" },
  { name: "Cochin", value: "Cochin, serif" },
  { name: "Comic Sans MS", value: "'Comic Sans MS', cursive" },
  { name: "Consolas", value: "Consolas, monospace" },
  { name: "Constantia", value: "Constantia, serif" },
  { name: "Cooper Black", value: "'Cooper Black', serif" },
  { name: "Copperplate", value: "Copperplate, fantasy" },
  { name: "Corbel", value: "Corbel, sans-serif" },
  { name: "Courier", value: "Courier, monospace" },
  { name: "Courier New", value: "'Courier New', monospace" },
  { name: "Cursive", value: "cursive" },
  { name: "Didot", value: "Didot, serif" },
  { name: "Ebrima", value: "Ebrima, sans-serif" },
  { name: "Fantasy", value: "fantasy" },
  { name: "Footlight MT Light", value: "'Footlight MT Light', serif" },
  {
    name: "Franklin Gothic Medium",
    value: "'Franklin Gothic Medium', sans-serif",
  },
  { name: "Futura", value: "Futura, sans-serif" },
  { name: "Gabriola", value: "Gabriola, cursive" },
  { name: "Garamond", value: "Garamond, serif" },
  { name: "Geneva", value: "Geneva, sans-serif" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Gill Sans", value: "'Gill Sans', sans-serif" },
  {
    name: "Gloucester MT Extra Condensed",
    value: "'Gloucester MT Extra Condensed', sans-serif",
  },
  { name: "Goudy Old Style", value: "'Goudy Old Style', serif" },
  { name: "Helvetica", value: "Helvetica, sans-serif" },
  { name: "Helvetica Neue", value: "'Helvetica Neue', sans-serif" },
  { name: "Herculanum", value: "Herculanum, fantasy" },
  { name: "Hoefler Text", value: "'Hoefler Text', serif" },
  { name: "Impact", value: "Impact, fantasy" },
  { name: "Luminari", value: "Luminari, fantasy" },
  { name: "Lucida Bright", value: "'Lucida Bright', serif" },
  { name: "Lucida Calligraphy", value: "'Lucida Calligraphy', cursive" },
  { name: "Lucida Console", value: "'Lucida Console', monospace" },
  { name: "Lucida Fax", value: "'Lucida Fax', serif" },
  { name: "Lucida Grande", value: "'Lucida Grande', sans-serif" },
  { name: "Lucida Handwriting", value: "'Lucida Handwriting', cursive" },
  { name: "Lucida Sans", value: "'Lucida Sans', sans-serif" },
  {
    name: "Lucida Sans Typewriter",
    value: "'Lucida Sans Typewriter', monospace",
  },
  { name: "Lucida Sans Unicode", value: "'Lucida Sans Unicode', sans-serif" },
  { name: "MS Gothic", value: "'MS Gothic', sans-serif" },
  { name: "MS Sans Serif", value: "'MS Sans Serif', sans-serif" },
  { name: "MS Serif", value: "'MS Serif', serif" },
  { name: "Marker Felt", value: "'Marker Felt', fantasy" },
  { name: "Menlo", value: "Menlo, monospace" },
  { name: "Microsoft Sans Serif", value: "'Microsoft Sans Serif', sans-serif" },
  { name: "Monaco", value: "Monaco, monospace" },
  { name: "Monospace", value: "monospace" },
  { name: "Noteworthy", value: "Noteworthy, sans-serif" },
  { name: "Optima", value: "Optima, sans-serif" },
  { name: "Palatino", value: "'Palatino Linotype', serif" },
  { name: "Papyrus", value: "Papyrus, fantasy" },
  { name: "Perpetua", value: "Perpetua, serif" },
  { name: "Phosphate", value: "Phosphate, fantasy" },
  { name: "Rockwell", value: "Rockwell, serif" },
  { name: "Rockwell Extra Bold", value: "'Rockwell Extra Bold', serif" },
  { name: "Sans-serif", value: "sans-serif" },
  { name: "Segoe Print", value: "'Segoe Print', cursive" },
  { name: "Segoe Script", value: "'Segoe Script', cursive" },
  { name: "Segoe UI", value: "'Segoe UI', sans-serif" },
  { name: "Segoe UI Symbol", value: "'Segoe UI Symbol', sans-serif" },
  { name: "Serif", value: "serif" },
  { name: "Signpainter", value: "Signpainter, fantasy" },
  { name: "Skia", value: "Skia, sans-serif" },
  { name: "Snell Roundhand", value: "'Snell Roundhand', cursive" },
  { name: "Sylfaen", value: "Sylfaen, serif" },
  { name: "Symbol", value: "Symbol, serif" },
  { name: "Tahoma", value: "Tahoma, sans-serif" },
  { name: "Times", value: "Times, serif" },
  { name: "Times New Roman", value: "'Times New Roman', serif" },
  { name: "Trattatello", value: "Trattatello, fantasy" },
  { name: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { name: "Tw Cen MT", value: "'Tw Cen MT', sans-serif" },
  { name: "Verdana", value: "Verdana, sans-serif" },
  { name: "Zapfino", value: "Zapfino, cursive" },
];

export const FontFamilyDropdown = ({ editor }: FontFamilyDropdownProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const currentStyle = editor.getAttributes("fontFamily").style;
  const currentFont =
    currentStyle?.match(/font-family:\s*([^;]+)/)?.[1]?.trim() || "";

  const filteredFonts = useMemo(() => {
    if (!searchTerm.trim()) {
      return allFonts;
    }

    const searchLower = searchTerm.toLowerCase();
    return allFonts.filter((font) =>
      font.name.toLowerCase().includes(searchLower)
    );
  }, [searchTerm]);

  const handleFontSelect = (fontValue: string) => {
    if (!fontValue) {
      editor.chain().focus().unsetMark("fontFamily").run();
    } else {
      editor
        .chain()
        .focus()
        .setMark("fontFamily", { style: `font-family: ${fontValue}` })
        .run();
    }
    setSearchTerm("");
  };

  const trigger = (
    <Button
      variant={currentFont ? "secondary" : "ghost"}
      size="sm"
      className="flex items-center gap-1"
    >
      <Type className="h-4 w-4" />
      <ChevronDown className="h-3 w-3" />
    </Button>
  );

  return (
    <ToolbarDropdown trigger={trigger}>
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search fonts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full pl-7 pr-2 py-1 text-xs bg-input border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[300px]">
        {filteredFonts.length > 0 ? (
          filteredFonts.map((font) => (
            <button
              key={font.value || "default"}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleFontSelect(font.value)}
              className={`w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors text-sm ${
                currentFont === font.value ? "bg-accent" : ""
              }`}
              style={{ fontFamily: font.value || "inherit" }}
            >
              {font.name}
            </button>
          ))
        ) : (
          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
            No fonts found
          </div>
        )}
      </div>
    </ToolbarDropdown>
  );
};
