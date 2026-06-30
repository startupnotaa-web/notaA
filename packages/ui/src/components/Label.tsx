// docs/07 §7 — Label associável (htmlFor) para campos de formulário.
import * as React from 'react';
import { cn } from '../lib/cn';

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  function Label({ className, ...props }, ref) {
    return (
      <label
        ref={ref}
        className={cn('block text-sm font-medium text-text', className)}
        {...props}
      />
    );
  },
);
