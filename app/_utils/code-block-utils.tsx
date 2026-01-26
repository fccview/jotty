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
  color?: string;
}

const iconSize = "h-5 w-5";

export const codeblockLangs: CodeBlockLanguage[] = [
  {
    value: "apache",
    label: "Apache",
    icon: <Globe02Icon className={iconSize} />,
    category: "DevOps",
  },
  {
    value: "bash",
    label: "Bash",
    icon: <HugeiconsIcon icon={BashIcon} className={iconSize} />,
    category: "Scripting",
  },
  {
    value: "c",
    label: "C",
    icon: <HugeiconsIcon icon={CIcon} className={iconSize} />,
    category: "Systems",
  },
  {
    value: "clojure",
    label: "Clojure",
    icon: <ThirdBracketSquareIcon className={iconSize} />,
    category: "Functional",
  },
  {
    value: "cpp",
    label: "C++",
    icon: <HugeiconsIcon icon={CppIcon} className={iconSize} />,
    category: "Systems",
  },
  {
    value: "csharp",
    label: "C#",
    icon: <GridIcon className={iconSize} />,
    category: "Backend",
  },
  {
    value: "css",
    label: "CSS",
    icon: <PaintBrush04Icon className={iconSize} />,
    category: "Web",
  },
  {
    value: "dart",
    label: "Dart",
    icon: <HugeiconsIcon icon={DartIcon} className={iconSize} />,
    category: "Mobile",
  },
  {
    value: "dockerfile",
    label: "Dockerfile",
    icon: <WazeIcon className={iconSize} />,
    category: "DevOps",
  },
  {
    value: "go",
    label: "Go",
    icon: <ThirdBracketSquareIcon className={iconSize} />,
    category: "Systems",
  },
  {
    value: "haskell",
    label: "Haskell",
    icon: <CalculatorIcon className={iconSize} />,
    category: "Functional",
  },
  {
    value: "html",
    label: "HTML",
    icon: <Html5Icon className={iconSize} />,
    category: "Web",
  },
  {
    value: "java",
    label: "Java",
    icon: <HugeiconsIcon icon={JavaIcon} className={iconSize} />,
    category: "Backend",
  },
  {
    value: "javascript",
    label: "Javascript",
    icon: <JavaScriptIcon className={iconSize} />,
    category: "Web",
  },
  {
    value: "jsx",
    label: "JSX",
    icon: <JavaScriptIcon className={iconSize} />,
    category: "Web",
  },
  {
    value: "json",
    label: "JSON",
    icon: <ThirdBracketSquareIcon className={iconSize} />,
    category: "Data",
  },
  {
    value: "kotlin",
    label: "Kotlin",
    icon: <CalculatorIcon className={iconSize} />,
    category: "Mobile",
  },
  {
    value: "latex",
    label: "LaTeX",
    icon: <File02Icon className={iconSize} />,
    category: "Markup",
  },
  {
    value: "less",
    label: "Less",
    icon: <PaintBrush04Icon className={iconSize} />,
    category: "Web",
  },
  {
    value: "lua",
    label: "Lua",
    icon: <SourceCodeIcon className={iconSize} />,
    category: "Scripting",
  },
  {
    value: "makefile",
    label: "Makefile",
    icon: <Settings01Icon className={iconSize} />,
    category: "DevOps",
  },
  {
    value: "markdown",
    label: "Markdown",
    icon: <File02Icon className={iconSize} />,
    category: "Markup",
  },
  {
    value: "matlab",
    label: "MATLAB",
    icon: <CalculatorIcon className={iconSize} />,
    category: "Scientific",
  },
  {
    value: "nginx",
    label: "Nginx",
    icon: <Globe02Icon className={iconSize} />,
    category: "DevOps",
  },
  {
    value: "perl",
    label: "Perl",
    icon: <SourceCodeIcon className={iconSize} />,
    category: "Scripting",
  },
  {
    value: "php",
    label: "PHP",
    icon: <PhpIcon className={iconSize} />,
    category: "Scripting",
  },
  {
    value: "plaintext",
    label: "",
    icon: <File02Icon className={iconSize} />,
    category: "Other",
  },
  {
    value: "powershell",
    label: "PowerShell",
    icon: <LaptopProgrammingIcon className={iconSize} />,
    category: "Scripting",
  },
  {
    value: "python",
    label: "Python",
    icon: <HugeiconsIcon icon={PythonIcon} className={iconSize} />,
    category: "Backend",
  },
  {
    value: "r",
    label: "R",
    icon: <CalculatorIcon className={iconSize} />,
    category: "Data Science",
  },
  {
    value: "ruby",
    label: "Ruby",
    icon: <GemIcon className={iconSize} />,
    category: "Scripting",
  },
  {
    value: "rust",
    label: "Rust",
    icon: <Settings01Icon className={iconSize} />,
    category: "Systems",
  },
  {
    value: "scala",
    label: "Scala",
    icon: <CalculatorIcon className={iconSize} />,
    category: "Functional",
  },
  {
    value: "scss",
    label: "SCSS",
    icon: <PaintBrush04Icon className={iconSize} />,
    category: "Web",
  },
  {
    value: "shell",
    label: "Shell",
    icon: <LaptopProgrammingIcon className={iconSize} />,
    category: "Scripting",
  },
  {
    value: "sql",
    label: "SQL",
    icon: <SqlIcon className={iconSize} />,
    category: "Data",
  },
  {
    value: "swift",
    label: "Swift",
    icon: <AppleIcon className={iconSize} />,
    category: "Mobile",
  },
  {
    value: "tsx",
    label: "TSX",
    icon: <HugeiconsIcon icon={TypescriptIcon} className={iconSize} />,
    category: "Web",
  },
  {
    value: "typescript",
    label: "TypeScript",
    icon: <HugeiconsIcon icon={TypescriptIcon} className={iconSize} />,
    category: "Web",
  },
  {
    value: "vhdl",
    label: "VHDL",
    icon: <CpuIcon className={iconSize} />,
    category: "Hardware",
  },
  {
    value: "verilog",
    label: "Verilog",
    icon: <CpuIcon className={iconSize} />,
    category: "Hardware",
  },
  {
    value: "xml",
    label: "XML",
    icon: <File02Icon className={iconSize} />,
    category: "Data",
  },
  {
    value: "yaml",
    label: "YAML",
    icon: <File02Icon className={iconSize} />,
    category: "Data",
  },
  {
    value: "zig",
    label: "Zig",
    icon: <SourceCodeIcon className={iconSize} />,
    category: "Backend",
  },
];

export const getLanguageByValue = (
  value: string
): CodeBlockLanguage | undefined => {
  return codeblockLangs.find((lang) => lang.value === value);
};

export const getLanguagesByCategory = (
  category: string
): CodeBlockLanguage[] => {
  return codeblockLangs.filter((lang) => lang.category === category);
};

export const getAllCategories = (): string[] => {
  const categories = codeblockLangs
    .map((lang) => lang.category)
    .filter((category): category is string => category !== undefined);
  return Array.from(new Set(categories));
};
