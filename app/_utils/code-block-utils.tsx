import {
  SourceCodeIcon,
  JavaScriptIcon,
  LaptopProgrammingIcon,
  Globe02Icon,
  CpuIcon,
  File02Icon,
  ThirdBracketSquareIcon,
  GridIcon,
  Settings01Icon,
  PaintBrush04Icon,
  CalculatorIcon,
  AppleIcon,
  WazeIcon,
  GemIcon,
  ThirdBracketIcon,
  PhpIcon,
  SqlIcon,
  Html5Icon,
} from "hugeicons-react";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  PythonIcon,
  JavaIcon,
  BashIcon,
  CppIcon,
  CIcon,
  DartIcon,
  TypescriptIcon,
} from "@hugeicons/core-free-icons";

export interface CodeBlockLanguage {
  value: string;
  label: string;
  icon: JSX.Element;
  category?: string;
}

export const popularCodeBlockLanguages: CodeBlockLanguage[] = [
  {
    value: "apache",
    label: "Apache",
    icon: <Globe02Icon className="h-4 w-4" />,
    category: "DevOps",
  },
  {
    value: "bash",
    label: "Bash",
    icon: <HugeiconsIcon icon={BashIcon} className="h-4 w-4" />,
    category: "Scripting",
  },
  {
    value: "c",
    label: "C",
    icon: <HugeiconsIcon icon={CIcon} className="h-4 w-4" />,
    category: "Systems",
  },
  {
    value: "clojure",
    label: "Clojure",
    icon: <ThirdBracketSquareIcon className="h-4 w-4" />,
    category: "Functional",
  },
  {
    value: "cpp",
    label: "C++",
    icon: <HugeiconsIcon icon={CppIcon} className="h-4 w-4" />,
    category: "Systems",
  },
  {
    value: "csharp",
    label: "C#",
    icon: <GridIcon className="h-4 w-4" />,
    category: "Backend",
  },
  {
    value: "css",
    label: "CSS",
    icon: <PaintBrush04Icon className="h-4 w-4" />,
    category: "Web",
  },
  {
    value: "dart",
    label: "Dart",
    icon: <HugeiconsIcon icon={DartIcon} className="h-4 w-4" />,
    category: "Mobile",
  },
  {
    value: "dockerfile",
    label: "Dockerfile",
    icon: <WazeIcon className="h-4 w-4" />,
    category: "DevOps",
  },
  {
    value: "go",
    label: "Go",
    icon: <JavaScriptIcon className="h-4 w-4" />,
    category: "Systems",
  },
  {
    value: "haskell",
    label: "Haskell",
    icon: <CalculatorIcon className="h-4 w-4" />,
    category: "Functional",
  },
  {
    value: "html",
    label: "HTML",
    icon: <Html5Icon className="h-4 w-4" />,
    category: "Web",
  },
  {
    value: "java",
    label: "Java",
    icon: <HugeiconsIcon icon={JavaIcon} className="h-4 w-4" />,
    category: "Backend",
  },
  {
    value: "javascript",
    label: "JavaScript",
    icon: <JavaScriptIcon className="h-4 w-4" />,
    category: "Web",
  },
  {
    value: "json",
    label: "JSON",
    icon: <ThirdBracketIcon className="h-4 w-4" />,
    category: "Data",
  },
  {
    value: "kotlin",
    label: "Kotlin",
    icon: <CalculatorIcon className="h-4 w-4" />,
    category: "Mobile",
  },
  {
    value: "latex",
    label: "LaTeX",
    icon: <File02Icon className="h-4 w-4" />,
    category: "Markup",
  },
  {
    value: "less",
    label: "Less",
    icon: <PaintBrush04Icon className="h-4 w-4" />,
    category: "Web",
  },
  {
    value: "lua",
    label: "Lua",
    icon: <SourceCodeIcon className="h-4 w-4" />,
    category: "Scripting",
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
    value: "matlab",
    label: "MATLAB",
    icon: <CalculatorIcon className="h-4 w-4" />,
    category: "Scientific",
  },
  {
    value: "nginx",
    label: "Nginx",
    icon: <Globe02Icon className="h-4 w-4" />,
    category: "DevOps",
  },
  {
    value: "perl",
    label: "Perl",
    icon: <SourceCodeIcon className="h-4 w-4" />,
    category: "Scripting",
  },
  {
    value: "php",
    label: "PHP",
    icon: <PhpIcon className="h-4 w-4" />,
    category: "Scripting",
  },
  {
    value: "plaintext",
    label: "Plain Text",
    icon: <File02Icon className="h-4 w-4" />,
    category: "Other",
  },
  {
    value: "powershell",
    label: "PowerShell",
    icon: <LaptopProgrammingIcon className="h-4 w-4" />,
    category: "Scripting",
  },
  {
    value: "python",
    label: "Python",
    icon: <HugeiconsIcon icon={PythonIcon} className="h-4 w-4" />,
    category: "Backend",
  },
  {
    value: "r",
    label: "R",
    icon: <CalculatorIcon className="h-4 w-4" />,
    category: "Data Science",
  },
  {
    value: "ruby",
    label: "Ruby",
    icon: <GemIcon className="h-4 w-4" />,
    category: "Scripting",
  },
  {
    value: "rust",
    label: "Rust",
    icon: <Settings01Icon className="h-4 w-4" />,
    category: "Systems",
  },
  {
    value: "scala",
    label: "Scala",
    icon: <CalculatorIcon className="h-4 w-4" />,
    category: "Functional",
  },
  {
    value: "scss",
    label: "SCSS",
    icon: <PaintBrush04Icon className="h-4 w-4" />,
    category: "Web",
  },
  {
    value: "shell",
    label: "Shell",
    icon: <LaptopProgrammingIcon className="h-4 w-4" />,
    category: "Scripting",
  },
  {
    value: "sql",
    label: "SQL",
    icon: <SqlIcon className="h-4 w-4" />,
    category: "Data",
  },
  {
    value: "swift",
    label: "Swift",
    icon: <AppleIcon className="h-4 w-4" />,
    category: "Mobile",
  },
  {
    value: "typescript",
    label: "TypeScript",
    icon: <HugeiconsIcon icon={TypescriptIcon} className="h-4 w-4" />,
    category: "Web",
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
    value: "xml",
    label: "XML",
    icon: <File02Icon className="h-4 w-4" />,
    category: "Data",
  },
  {
    value: "yaml",
    label: "YAML",
    icon: <File02Icon className="h-4 w-4" />,
    category: "Data",
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
