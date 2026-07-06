// SCR-04 — Фильтры списка классов. LOGIC-007: OR внутри группы, AND между группами.
import { useEffect, useState } from 'react';
import { listChefs, listPrograms } from '../../api/endpoints';
import type { Chef, Program, ProgramType, SlotFilters } from '../../api/types';
import { Button, Modal } from '../../shared/ui';

const programTypeLabels: Record<ProgramType, string> = {
  novice: 'Новичковый',
  experienced: 'Опытный',
};

export function FiltersSheet({
  open,
  onClose,
  filters,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  filters: SlotFilters;
  onApply: (next: SlotFilters) => void;
}) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [draft, setDraft] = useState<SlotFilters>(filters);

  useEffect(() => {
    if (!open) return;
    setDraft(filters);
    listPrograms().then(setPrograms);
    listChefs().then(setChefs);
  }, [open, filters]);

  function toggleProgramType(type: ProgramType) {
    setDraft((prev) => {
      const current = prev.program_type ?? [];
      const next = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
      return { ...prev, program_type: next };
    });
  }

  function toggleChef(chefId: string) {
    setDraft((prev) => {
      const current = prev.chef_id ?? [];
      const next = current.includes(chefId) ? current.filter((id) => id !== chefId) : [...current, chefId];
      return { ...prev, chef_id: next };
    });
  }

  function reset() {
    const empty: SlotFilters = {};
    setDraft(empty);
    onApply(empty);
    onClose();
  }

  function apply() {
    onApply(draft);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Фильтры"
      footer={
        <>
          <Button variant="ghost" onClick={reset}>
            Сбросить
          </Button>
          <Button onClick={apply}>Применить</Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <section>
          <p className="mb-2 text-sm font-semibold text-ink-900">Тип программы</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(programTypeLabels) as ProgramType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleProgramType(type)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  draft.program_type?.includes(type)
                    ? 'border-terracotta-600 bg-terracotta-600 text-cream-50'
                    : 'border-cream-200 bg-white text-ink-700'
                }`}
              >
                {programTypeLabels[type]}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-2 text-sm font-semibold text-ink-900">Шеф</p>
          <div className="flex flex-wrap gap-2">
            {chefs.map((chef) => (
              <button
                key={chef.id}
                type="button"
                onClick={() => toggleChef(chef.id)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  draft.chef_id?.includes(chef.id)
                    ? 'border-terracotta-600 bg-terracotta-600 text-cream-50'
                    : 'border-cream-200 bg-white text-ink-700'
                }`}
              >
                {chef.name}
              </button>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-between">
          <label htmlFor="only-available" className="text-sm font-semibold text-ink-900">
            Только со свободными местами
          </label>
          <input
            id="only-available"
            type="checkbox"
            checked={Boolean(draft.only_available)}
            onChange={(event) => setDraft((prev) => ({ ...prev, only_available: event.target.checked }))}
            className="h-5 w-5 accent-terracotta-600"
          />
        </section>

        {programs.length === 0 && <p className="text-xs text-ink-500">Загрузка справочника программ…</p>}
      </div>
    </Modal>
  );
}
