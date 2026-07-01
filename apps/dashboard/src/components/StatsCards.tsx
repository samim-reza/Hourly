interface StatsCardsProps {
  totalHours: number;
  totalEntries: number;
  avgActivity: number;
  earnings: number;
  isClient: boolean;
}

export function StatsCards({ totalHours, totalEntries, avgActivity, earnings, isClient }: StatsCardsProps) {
  const cards = [
    { label: 'Total hours', value: totalHours.toFixed(1), suffix: 'h' },
    { label: 'Time entries', value: String(totalEntries), suffix: '' },
    { label: 'Avg activity', value: String(avgActivity), suffix: '%' },
    ...(!isClient ? [{ label: 'Earnings', value: `$${earnings.toFixed(2)}`, suffix: '' }] : []),
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-parrot-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-parrot-500">{card.label}</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-parrot-900">
            {card.value}
            {card.suffix && <span className="text-lg text-parrot-500">{card.suffix}</span>}
          </p>
        </div>
      ))}
    </div>
  );
}
