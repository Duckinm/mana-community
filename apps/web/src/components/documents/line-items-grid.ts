/** Always-on 4-col grid — A4 preview / wide panels only. */
export const documentLineItemsGridClass =
  "grid grid-cols-[minmax(0,1fr)_minmax(4rem,auto)_minmax(8rem,auto)_minmax(9rem,auto)] gap-x-4 items-center";

/** Header row: hidden on narrow screens, 4-col from 480px. */
export const documentLineItemsHeaderClass =
  "hidden min-[480px]:grid grid-cols-[minmax(0,1fr)_minmax(4rem,auto)_minmax(8rem,auto)_minmax(9rem,auto)] gap-x-4 items-center";

/**
 * Body row: description full-width + 3 labeled metrics on narrow;
 * 4-col table from 480px.
 */
export const documentLineItemsRowClass =
  "grid grid-cols-3 items-start gap-x-3 gap-y-2 min-[480px]:grid-cols-[minmax(0,1fr)_minmax(4rem,auto)_minmax(8rem,auto)_minmax(9rem,auto)] min-[480px]:items-center min-[480px]:gap-x-4 min-[480px]:gap-y-0";

export const documentLineItemsDescClass =
  "col-span-3 min-w-0 break-words min-[480px]:col-span-1";

export const documentLineItemsMetricClass =
  "flex min-w-0 flex-col gap-1 text-left tabular-nums min-[480px]:block min-[480px]:text-right";

export const documentLineItemsMetricLabelClass =
  "text-2xs uppercase tracking-wider text-muted-foreground min-[480px]:hidden";

export const documentLineItemsTableShellClass = "w-full min-w-0";

export const documentLineItemsMoneyClass =
  "text-money text-right whitespace-nowrap";
