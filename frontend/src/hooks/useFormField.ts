'use client';

import { useState, useCallback, type ChangeEvent, type FocusEvent } from 'react';

interface UseFormFieldOptions {
  initialValue?: string;
  validate?: (value: string) => string | undefined;
}

interface UseFormFieldReturn {
  value: string;
  error: string | undefined;
  touched: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onBlur: (e: FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  setValue: (value: string) => void;
  reset: () => void;
  validateField: () => boolean;
}

function useFormField({
  initialValue = '',
  validate,
}: UseFormFieldOptions = {}): UseFormFieldReturn {
  const [value, setValueState] = useState(initialValue);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setValueState(newValue);
      if (touched && validate) {
        setError(validate(newValue));
      }
    },
    [touched, validate],
  );

  const onBlur = useCallback(
    (e: FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setTouched(true);
      if (validate) {
        setError(validate(e.target.value));
      }
    },
    [validate],
  );

  const setValue = useCallback((newValue: string) => {
    setValueState(newValue);
  }, []);

  const reset = useCallback(() => {
    setValueState(initialValue);
    setTouched(false);
    setError(undefined);
  }, [initialValue]);

  const validateField = useCallback((): boolean => {
    setTouched(true);
    if (validate) {
      const validationError = validate(value);
      setError(validationError);
      return !validationError;
    }
    return true;
  }, [validate, value]);

  return {
    value,
    error,
    touched,
    onChange,
    onBlur,
    setValue,
    reset,
    validateField,
  };
}

export { useFormField };
export type { UseFormFieldReturn, UseFormFieldOptions };
