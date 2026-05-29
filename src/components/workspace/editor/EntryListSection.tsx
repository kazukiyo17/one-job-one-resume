import { useCallback, useState } from "react";
import { CollapsibleEntry } from "./CollapsibleEntry";
import { FormField } from "./FormField";

export type EntryFieldDef<T> = {
  key: keyof T & string;
  label: string;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
};

type EntryListSectionProps<T extends Record<string, string | undefined>> = {
  title: string;
  sectionId: string;
  items: T[];
  emptyItem: T;
  fields: EntryFieldDef<T>[];
  addLabel: string;
  summarize: (item: T, index: number) => { title: string; subtitle?: string };
  onChange: (items: T[]) => void;
};

function defaultExpanded(sectionId: string, index: number) {
  return `${sectionId}-${index}`;
}

export function EntryListSection<T extends Record<string, string | undefined>>({
  title,
  sectionId,
  items,
  emptyItem,
  fields,
  addLabel,
  summarize,
  onChange,
}: EntryListSectionProps<T>) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const isExpanded = useCallback(
    (index: number) => {
      const key = defaultExpanded(sectionId, index);
      return collapsed[key] !== true;
    },
    [collapsed, sectionId],
  );

  const toggle = (index: number) => {
    const key = defaultExpanded(sectionId, index);
    setCollapsed((prev) => ({
      ...prev,
      [key]: isExpanded(index),
    }));
  };

  const updateItem = (index: number, field: keyof T & string, value: string) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    );
    onChange(next);
  };

  const addItem = () => {
    const next = [...items, { ...emptyItem }];
    onChange(next);
    const key = defaultExpanded(sectionId, next.length - 1);
    setCollapsed((prev) => ({ ...prev, [key]: false }));
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <section className="editor-section">
      <div className="editor-section__head">
        <h3 className="editor-section__title">{title}</h3>
        <button type="button" className="btn btn--text" onClick={addItem}>
          + {addLabel}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="editor-section__empty">暂无条目，点击上方添加。</p>
      ) : (
        <div className="entry-list">
          {items.map((item, index) => {
            const { title: entryTitle, subtitle } = summarize(item, index);
            return (
              <CollapsibleEntry
                key={`${sectionId}-${index}`}
                title={entryTitle}
                subtitle={subtitle}
                expanded={isExpanded(index)}
                onToggle={() => toggle(index)}
                onRemove={() => removeItem(index)}
              >
                {fields.map((f) => (
                  <FormField
                    key={f.key}
                    label={f.label}
                    value={String(item[f.key] ?? "")}
                    multiline={f.multiline}
                    rows={f.rows}
                    placeholder={f.placeholder}
                    onChange={(v) => updateItem(index, f.key, v)}
                  />
                ))}
              </CollapsibleEntry>
            );
          })}
        </div>
      )}
    </section>
  );
}
