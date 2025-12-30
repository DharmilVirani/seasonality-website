'use client';

import * as React from 'react';
import { cva } from 'class-variance-authority';

const separatorVariants = cva(
  'shrink-0 bg-border',
  {
    variants: {
      orientation: {
        horizontal: 'h-px w-full',
        vertical: 'h-full w-px',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
    },
  }
);

const Separator = React.forwardRef(
  ({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
    <hr
      ref={ref}
      role={decorative ? 'presentation' : undefined}
      aria-orientation={orientation === 'vertical' ? 'vertical' : undefined}
      className={separatorVariants({ orientation, className })}
      {...props}
    />
  )
);
Separator.displayName = 'Separator';

export { Separator };