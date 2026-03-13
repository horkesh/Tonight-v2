interface CheckboxGridProps<T extends string> {
  options: { value: T; label: string; icon?: string }[];
  selected: T[];
  onChange: (selected: T[]) => void;
  max?: number;
  columns?: 2 | 3 | 4;
}

export function CheckboxGrid<T extends string>({
  options,
  selected,
  onChange,
  max,
  columns = 3,
}: CheckboxGridProps<T>) {
  const toggle = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else if (!max || selected.length < max) {
      onChange([...selected, value]);
    }
  };

  const gridCols =
    columns === 2 ? 'grid-cols-2' : columns === 4 ? 'grid-cols-4' : 'grid-cols-3';

  return (
    <div className={`grid ${gridCols} gap-2`}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt.value);
        const isDisabled = !isSelected && !!max && selected.length >= max;

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            disabled={isDisabled}
            className={`
              px-3 py-2.5 rounded-xl text-[9px] uppercase tracking-widest font-bold
              transition-all duration-200 border
              ${
                isSelected
                  ? 'bg-rose-600/30 border-rose-500/50 text-rose-300'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70'
              }
              ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {opt.icon && <span className="block text-base mb-1">{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
