import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormInputProps {
  id: string;
  label: string;
  type?: "text" | "email" | "tel" | "url";
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  "data-testid"?: string;
  "data-testid-error"?: string;
}

/**
 * Reusable form input component with consistent styling and error handling.
 * Uses the same design patterns as PasswordInput for consistency.
 */
export function FormInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  disabled = false,
  required = false,
  "data-testid": dataTestId,
  "data-testid-error": dataTestIdError,
}: FormInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={error ? "text-destructive" : ""}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        data-testid={dataTestId}
        className={cn(
          "w-full px-3 py-2 rounded-md border bg-background",
          "transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-destructive" : "border-input"
        )}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <p
          id={`${id}-error`}
          className="text-sm text-destructive"
          role="alert"
          data-testid={dataTestIdError || `${id}-error`}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
