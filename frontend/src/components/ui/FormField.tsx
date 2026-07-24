import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Label } from './Label';

export interface FormFieldProps {
  label?: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
}

function FormField({
  label,
  error,
  touched,
  required,
  children,
  className,
  id,
}: FormFieldProps) {
  const showError = touched && error;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && (
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          )}
        </Label>
      )}
      {children}
      {showError && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export { FormField };
