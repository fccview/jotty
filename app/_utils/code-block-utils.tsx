import {
  FileCode,
  Terminal,
  Database,
  Globe,
  Cpu,
  Code,
  FileText,
  Braces,
  Hash,
  Zap,
  Settings,
  Palette,
  Calculator,
  Layers,
  Apple,
  Coffee,
  Gem,
} from "lucide-react";

export interface CodeBlockLanguage {
  value: string;
  label: string;
  icon: JSX.Element;
  category?: string;
}

export const popularCodeBlockLanguages: CodeBlockLanguage[] = [
  {
    value: "javascript",
    label: "JavaScript",
    icon: <FileCode className="h-4 w-4" />,
    category: "Web",
  },
  {
    value: "typescript",
    label: "TypeScript",
    icon: <FileCode className="h-4 w-4" />,
    category: "Web",
  },
  {
    value: "html",
    label: "HTML",
    icon: <Globe className="h-4 w-4" />,
    category: "Web",
  },
  {
    value: "css",
    label: "CSS",
    icon: <Palette className="h-4 w-4" />,
    category: "Web",
  },
  {
    value: "scss",
    label: "SCSS",
    icon: <Palette className="h-4 w-4" />,
    category: "Web",
  },
  {
    value: "less",
    label: "Less",
    icon: <Palette className="h-4 w-4" />,
    category: "Web",
  },
  {
    value: "python",
    label: "Python",
    icon: <Cpu className="h-4 w-4" />,
    category: "Backend",
  },
  {
    value: "java",
    label: "Java",
    icon: <Coffee className="h-4 w-4" />,
    category: "Backend",
  },
  {
    value: "csharp",
    label: "C#",
    icon: <Hash className="h-4 w-4" />,
    category: "Backend",
  },
  {
    value: "cpp",
    label: "C++",
    icon: <Braces className="h-4 w-4" />,
    category: "Systems",
  },
  {
    value: "c",
    label: "C",
    icon: <Braces className="h-4 w-4" />,
    category: "Systems",
  },
  {
    value: "go",
    label: "Go",
    icon: <Zap className="h-4 w-4" />,
    category: "Systems",
  },
  {
    value: "rust",
    label: "Rust",
    icon: <Settings className="h-4 w-4" />,
    category: "Systems",
  },
  {
    value: "bash",
    label: "Bash",
    icon: <Terminal className="h-4 w-4" />,
    category: "Scripting",
  },
  {
    value: "powershell",
    label: "PowerShell",
    icon: <Terminal className="h-4 w-4" />,
    category: "Scripting",
  },
  {
    value: "shell",
    label: "Shell",
    icon: <Terminal className="h-4 w-4" />,
    category: "Scripting",
  },
  {
    value: "php",
    label: "PHP",
    icon: <FileCode className="h-4 w-4" />,
    category: "Scripting",
  },
  {
    value: "ruby",
    label: "Ruby",
    icon: <Gem className="h-4 w-4" />,
    category: "Scripting",
  },
  {
    value: "perl",
    label: "Perl",
    icon: <FileCode className="h-4 w-4" />,
    category: "Scripting",
  },
  {
    value: "sql",
    label: "SQL",
    icon: <Database className="h-4 w-4" />,
    category: "Data",
  },
  {
    value: "json",
    label: "JSON",
    icon: <FileText className="h-4 w-4" />,
    category: "Data",
  },
  {
    value: "yaml",
    label: "YAML",
    icon: <FileText className="h-4 w-4" />,
    category: "Data",
  },
  {
    value: "xml",
    label: "XML",
    icon: <FileText className="h-4 w-4" />,
    category: "Data",
  },
  {
    value: "kotlin",
    label: "Kotlin",
    icon: <Calculator className="h-4 w-4" />,
    category: "Mobile",
  },
  {
    value: "swift",
    label: "Swift",
    icon: <Apple className="h-4 w-4" />,
    category: "Mobile",
  },
  {
    value: "dart",
    label: "Dart",
    icon: <Layers className="h-4 w-4" />,
    category: "Mobile",
  },
  {
    value: "scala",
    label: "Scala",
    icon: <Calculator className="h-4 w-4" />,
    category: "Functional",
  },
  {
    value: "clojure",
    label: "Clojure",
    icon: <Braces className="h-4 w-4" />,
    category: "Functional",
  },
  {
    value: "haskell",
    label: "Haskell",
    icon: <Calculator className="h-4 w-4" />,
    category: "Functional",
  },
  {
    value: "lua",
    label: "Lua",
    icon: <Code className="h-4 w-4" />,
    category: "Scripting",
  },
  {
    value: "dockerfile",
    label: "Dockerfile",
    icon: <Layers className="h-4 w-4" />,
    category: "DevOps",
  },
  {
    value: "nginx",
    label: "Nginx",
    icon: <Globe className="h-4 w-4" />,
    category: "DevOps",
  },
  {
    value: "apache",
    label: "Apache",
    icon: <Globe className="h-4 w-4" />,
    category: "DevOps",
  },
  {
    value: "makefile",
    label: "Makefile",
    icon: <Settings className="h-4 w-4" />,
    category: "DevOps",
  },
  {
    value: "markdown",
    label: "Markdown",
    icon: <FileText className="h-4 w-4" />,
    category: "Markup",
  },
  {
    value: "latex",
    label: "LaTeX",
    icon: <FileText className="h-4 w-4" />,
    category: "Markup",
  },
  {
    value: "r",
    label: "R",
    icon: <Calculator className="h-4 w-4" />,
    category: "Data Science",
  },
  {
    value: "matlab",
    label: "MATLAB",
    icon: <Calculator className="h-4 w-4" />,
    category: "Scientific",
  },
  {
    value: "vhdl",
    label: "VHDL",
    icon: <Cpu className="h-4 w-4" />,
    category: "Hardware",
  },
  {
    value: "verilog",
    label: "Verilog",
    icon: <Cpu className="h-4 w-4" />,
    category: "Hardware",
  },
  {
    value: "plaintext",
    label: "Plain Text",
    icon: <FileText className="h-4 w-4" />,
    category: "Other",
  },
];

export const getLanguageByValue = (
  value: string
): CodeBlockLanguage | undefined => {
  return popularCodeBlockLanguages.find((lang) => lang.value === value);
};

export const getLanguagesByCategory = (
  category: string
): CodeBlockLanguage[] => {
  return popularCodeBlockLanguages.filter((lang) => lang.category === category);
};

export const getAllCategories = (): string[] => {
  const categories = popularCodeBlockLanguages
    .map((lang) => lang.category)
    .filter((category): category is string => category !== undefined);
  return Array.from(new Set(categories));
};
