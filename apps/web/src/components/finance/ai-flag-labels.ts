const AI_FLAG_KEY: Record<string, string> = {
  uncertain_currency: "transactions.aiFlagUncertainCurrency",
  uncertain_amount: "transactions.aiFlagUncertainAmount",
  unclear_image: "transactions.aiFlagUnclearImage",
};

export function aiFlagKey(flag: string): string | undefined {
  return AI_FLAG_KEY[flag];
}
