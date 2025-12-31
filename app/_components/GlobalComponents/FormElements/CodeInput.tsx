"use client";

import { useRef, useState, KeyboardEvent, ClipboardEvent } from "react";
import { Input } from "./Input";

interface CodeInputProps {
    length?: number;
    onComplete: (code: string) => void;
    disabled?: boolean;
    autoFocus?: boolean;
}

export const CodeInput = ({
    length = 6,
    onComplete,
    disabled = false,
    autoFocus = true,
}: CodeInputProps) => {
    const [values, setValues] = useState<string[]>(Array(length).fill(""));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, value: string) => {
        if (disabled) return;

        const newValue = value.replace(/[^0-9]/g, "").slice(-1);
        const newValues = [...values];
        newValues[index] = newValue;
        setValues(newValues);

        if (newValue && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        if (newValues.every((v) => v !== "")) {
            onComplete(newValues.join(""));
        }
    };

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !values[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, length);
        const newValues = [...values];

        for (let i = 0; i < pastedData.length; i++) {
            newValues[i] = pastedData[i];
        }

        setValues(newValues);

        const nextEmptyIndex = newValues.findIndex((v) => v === "");
        if (nextEmptyIndex !== -1) {
            inputRefs.current[nextEmptyIndex]?.focus();
        } else {
            inputRefs.current[length - 1]?.focus();
            if (newValues.every((v) => v !== "")) {
                onComplete(newValues.join(""));
            }
        }
    };

    return (
        <div className="flex gap-2 justify-center" onPaste={handlePaste}>
            {values.map((value, index) => (
                <div key={index} className="w-12">
                    <Input
                        id={`code-${index}`}
                        type="text"
                        value={value}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        disabled={disabled}
                        autoFocus={autoFocus && index === 0}
                        className="text-center text-2xl font-semibold h-14 p-0"
                        ref={(el) => {
                            inputRefs.current[index] = el;
                        }}
                    />
                </div>
            ))}
        </div>
    );
};
