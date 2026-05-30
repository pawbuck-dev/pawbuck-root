import { useEffect, useState } from "react";
import { createSupportClient, SupportApiError } from "@/api/supportClient";
import type { SupportVaccinationRow } from "@/types/support";
import { formatDateInput } from "@/utils/adminApp";

type Props = {
  row: SupportVaccinationRow;
  client: ReturnType<typeof createSupportClient>;
  onSaved: () => Promise<void>;
};

export function VaccinationEditorCard({ row, client, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.name);
  const [date, setDate] = useState(formatDateInput(row.date));
  const [nextDue, setNextDue] = useState(formatDateInput(row.nextDueDate));
  const [clinic, setClinic] = useState(row.clinicName ?? "");
  const [notes, setNotes] = useState(row.notes ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setName(row.name);
      setDate(formatDateInput(row.date));
      setNextDue(formatDateInput(row.nextDueDate));
      setClinic(row.clinicName ?? "");
      setNotes(row.notes ?? "");
    }
  }, [row, editing]);

  const save = async () => {
    setErr(null);
    setSaving(true);
    try {
      await client.updateVaccination(row.id, {
        name,
        date,
        nextDueDate: nextDue || null,
        clinicName: clinic.trim() || null,
        notes: notes.trim() || null,
      });
      setEditing(false);
      await onSaved();
    } catch (e) {
      setErr(e instanceof SupportApiError ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="vac-card">
      {editing ? (
        <div className="edit-inline">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <div className="row2">
            <div className="field">
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Next due</label>
              <input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
            </div>
          </div>
          <input value={clinic} onChange={(e) => setClinic(e.target.value)} placeholder="Clinic" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
          {err ? (
            <span className="error" style={{ display: "block" }}>
              {err}
            </span>
          ) : null}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="button" className="btn" disabled={saving} onClick={() => void save()}>
              Save
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <h3>{row.name}</h3>
          <div className="muted">
            {formatDateInput(row.date) || row.date}
            {row.nextDueDate ? ` · next ${formatDateInput(row.nextDueDate)}` : ""}
          </div>
          {row.clinicName || row.notes ? (
            <div className="muted" style={{ marginTop: "0.35rem" }}>
              {[row.clinicName, row.notes].filter(Boolean).join(" · ")}
            </div>
          ) : null}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: "0.55rem" }}
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        </>
      )}
    </div>
  );
}
