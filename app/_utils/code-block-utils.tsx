import {
  SourceCodeIcon,
  JavaScriptIcon,
  LaptopProgrammingIcon,
  Database01Icon,
  Globe02Icon,
  CpuIcon,
  File02Icon,
  ThirdBracketSquareIcon,
  GridIcon,
  ZapIcon,
  Settings01Icon,
  PaintBrush04Icon,
  CalculatorIcon,
  MobileProgramming02Icon,
  AppleIcon,
  Coffee02Icon,
  WazeIcon,
  GemIcon,
} from "hugeicons-react";

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
    icon: <JavaScriptIcon className="h-4 w-4" />,
    category: "Web",
  },
  {
    value: "typescript",
    label: "TypeScript",
    icon: <SourceCodeIcon className="h-4 w-4" />,
    category: "Web",
  },
  {
    value: "html",
    label: "HTML",
    icon: <Globe02Icon className="h-4 w-4" />,
    category: "Web",
  },
  {
    value: "css",
    label: "CSS",
    icon: <PaintBrush04Icon className="h-4 w-4" />,
    category: "Web",
  },
  {
    value: "scss",
    label: "SCSS",
    icon: <PaintBrush04Icon className="h-4 w-4" />,
    category: "Web",
  },
  {
    value: "less",
    label: "Less",
    icon: <PaintBrush04Icon className="h-4 w-4" />,
    category: "Web",
  },
  {
    value: "python",
    label: "Python",
    icon: <CpuIcon className="h-4 w-4" />,
    category: "Backend",
  },
  {
    value: "java",
    label: "Java",
    icon: <Coffee02Icon className="h-4 w-4" />,
    category: "Backend",
  },
  {
    value: "csharp",
    label: "C#",
    icon: <GridIcon className="h-4 w-4" />,
    category: "Backend",
  },
  {
    value: "cpp",
    label: "C++",
    icon: <ThirdBracketSquareIcon className="h-4 w-4" />,
    category: "Systems",
  },
  {
    value: "c",
    label: "C",
    icon: <ThirdBracketSquareIcon className="h-4 w-4" />,
    category: "Systems",
  },
  {
    value: "go",
    label: "Go",
    icon: <ZapIcon className="h-4 w-4" />,
    category: "Systems",
  },
  {
    value: "rust",
    label: "Rust",
    icon: <Settings01Icon className="h-4 w-4" />,
    category: "Systems",
  },
  {
    value: "bash",
    label: "Bash",
    icon: <LaptopProgrammingIcon className="h-4 w-4" />,
    category: "Scripting",
  },
  {
    value: "powershell",
    label: "PowerShell",
    icon: <LaptopProgrammingIcon className="h-4 w-4" />,
    category: "Scripting",
  },
  {
    value: "shell",
    label: "Shell",
    icon: <LaptopProgrammingIcon className="h-4 w-4" />,
    category: "Scripting",
  },
  {
    value: "php",
    label: "PHP",
    icon: <SourceCodeIcon className="h-4 w-4" />,
    category: "Scripting",
  },
  {
    value: "ruby",
    label: "Ruby",
    icon: <GemIcon className="h-4 w-4" />,
    category: "Scripting",
  },
  {
    value: "perl",
    label: "Perl",
    icon: <SourceCodeIcon className="h-4 w-4" />,
    category: "Scripting",
  },
  {
    value: "sql",
    label: "SQL",
    icon: <Database01Icon className="h-4 w-4" />,
    category: "Data",
  },
  {
    value: "json",
    label: "JSON",
    icon: <File02Icon className="h-4 w-4" />,
    category: "Data",
  },
  {
    value: "yaml",
    label: "YAML",
    icon: <File02Icon className="h-4 w-4" />,
    category: "Data",
  },
  {
    value: "xml",
    label: "XML",
    icon: <File02Icon className="h-4 w-4" />,
    category: "Data",
  },
  {
    value: "kotlin",
    label: "Kotlin",
    icon: <CalculatorIcon className="h-4 w-4" />,
    category: "Mobile",
  },
  {
    value: "swift",
    label: "Swift",
    icon: <AppleIcon className="h-4 w-4" />,
    category: "Mobile",
  },
  {
    value: "dart",
    label: "Dart",
    icon: <MobileProgramming02Icon className="h-4 w-4" />,
    category: "Mobile",
  },
  {
    value: "scala",
    label: "Scala",
    icon: <CalculatorIcon className="h-4 w-4" />,
    category: "Functional",
  },
  {
    value: "clojure",
    label: "Clojure",
    icon: <ThirdBracketSquareIcon className="h-4 w-4" />,
    category: "Functional",
  },
  {
    value: "haskell",
    label: "Haskell",
    icon: <CalculatorIcon className="h-4 w-4" />,
    category: "Functional",
  },
  {
    value: "lua",
    label: "Lua",
    icon: <SourceCodeIcon className="h-4 w-4" />,
    category: "Scripting",
  },
  {
    value: "dockerfile",
    label: "Dockerfile",
    icon: <WazeIcon className="h-4 w-4" />,
    category: "DevOps",
  },
  {
    value: "nginx",
    label: "Nginx",
    icon: <Globe02Icon className="h-4 w-4" />,
    category: "DevOps",
  },
  {
    value: "apache",
    label: "Apache",
    icon: <Globe02Icon className="h-4 w-4" />,
    category: "DevOps",
  },
  {
    value: "makefile",
    label: "Makefile",
    icon: <Settings01Icon className="h-4 w-4" />,
    category: "DevOps",
  },
  {
    value: "markdown",
    label: "Markdown",
    icon: <File02Icon className="h-4 w-4" />,
    category: "Markup",
  },
  {
    value: "latex",
    label: "LaTeX",
    icon: <File02Icon className="h-4 w-4" />,
    category: "Markup",
  },
  {
    value: "r",
    label: "R",
    icon: <CalculatorIcon className="h-4 w-4" />,
    category: "Data Science",
  },
  {
    value: "matlab",
    label: "MATLAB",
    icon: <CalculatorIcon className="h-4 w-4" />,
    category: "Scientific",
  },
  {
    value: "vhdl",
    label: "VHDL",
    icon: <CpuIcon className="h-4 w-4" />,
    category: "Hardware",
  },
  {
    value: "verilog",
    label: "Verilog",
    icon: <CpuIcon className="h-4 w-4" />,
    category: "Hardware",
  },
  {
    value: "plaintext",
    label: "Plain Text",
    icon: <File02Icon className="h-4 w-4" />,
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