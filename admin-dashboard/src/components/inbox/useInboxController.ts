import { createSupportClient, SupportApiError } from "@/api/supportClient";
import type {
  SupportProcessedEmailAttachment,
  SupportProcessedEmailDetail,
  SupportProcessedEmailListItem,
  SupportProcessedEmailsSummaryResponse,
} from "@/types/support";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { InboxTab } from "./inboxUtils";
import {
  exclusiveEndIsoFromYmd,
  parseInboxTab,
  startOfUtcDayYmd,
  toYmd,
} from "./inboxUtils";

export type InboxClient = ReturnType<typeof createSupportClient>;

export function useInboxController(client: InboxClient, presetOwnerEmail?: string) {
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = parseInboxTab(searchParams.get("tab"));
  const ownerEmail = searchParams.get("owner")?.trim() || presetOwnerEmail?.trim() || "";
  const q = searchParams.get("q") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const dateFrom = searchParams.get("from") ?? startOfUtcDayYmd(30);
  const dateTo = searchParams.get("to") ?? toYmd(new Date());
  const batchOpen = searchParams.get("tools") === "1";

  const pageSize = 25;
  const fromIso = useMemo(() => `${dateFrom}T00:00:00.000Z`, [dateFrom]);
  const toIso = useMemo(() => exclusiveEndIsoFromYmd(dateTo), [dateTo]);

  const [list, setList] = useState<SupportProcessedEmailListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SupportProcessedEmailsSummaryResponse | null>(null);

  const [selected, setSelected] = useState<SupportProcessedEmailDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<SupportProcessedEmailAttachment[]>([]);
  const [attachMeta, setAttachMeta] = useState<{ code: string | null; message: string | null }>({
    code: null,
    message: null,
  });
  const [attachWarning, setAttachWarning] = useState<string | null>(null);
  const [openBusy, setOpenBusy] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const patchParams = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v == null || v === "") next.delete(k);
          else next.set(k, v);
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const setTab = (t: InboxTab) => patchParams({ tab: t === "needs-action" ? null : t, page: "1" });
  const setBatchOpen = (open: boolean) => patchParams({ tools: open ? "1" : null });

  const listQuery = useMemo(() => {
    const base = {
      page,
      pageSize,
      from: fromIso,
      to: toIso,
      q: q.trim() || undefined,
      ownerEmail: ownerEmail || undefined,
      failuresOnly: false as boolean,
      reviewInboxOnly: false as boolean,
      stuckOnly: false as boolean,
    };
    if (tab === "needs-action") {
      return { ...base, reviewInboxOnly: true, failuresOnly: false };
    }
    if (tab === "stuck") {
      return { ...base, stuckOnly: true, failuresOnly: false };
    }
    return { ...base, failuresOnly: false, reviewInboxOnly: false };
  }, [page, pageSize, fromIso, toIso, q, ownerEmail, tab]);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await client.listProcessedEmails(listQuery);
      setList(res.items);
      setTotalCount(res.totalCount);
    } catch (e) {
      setList([]);
      setTotalCount(0);
      setListError(e instanceof SupportApiError ? e.message : "Failed to load emails");
    } finally {
      setListLoading(false);
    }
  }, [client, listQuery]);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await client.getProcessedEmailsSummary(fromIso, toIso));
    } catch {
      setSummary(null);
    }
  }, [client, fromIso, toIso]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const openRow = async (row: SupportProcessedEmailListItem) => {
    setDetailLoading(true);
    setDetailError(null);
    setAttachments([]);
    setAttachMeta({ code: null, message: null });
    setAttachWarning(null);
    setSelected(null);
    try {
      const [detail, att] = await Promise.all([
        client.getProcessedEmail(row.id),
        client.listProcessedEmailAttachments(row.id),
      ]);
      setSelected(detail);
      setAttachments(att.attachments ?? []);
      setAttachMeta({ code: att.errorCode ?? null, message: att.errorMessage ?? null });
      setAttachWarning(att.warningMessage ?? null);
    } catch (e) {
      setSelected(null);
      setDetailError(e instanceof SupportApiError ? e.message : "Failed to load case file");
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async (id: string) => {
    const detail = await client.getProcessedEmail(id);
    setSelected(detail);
  };

  const openAttachment = async (index: number) => {
    if (!selected) return;
    setOpenBusy(index);
    setDetailError(null);
    try {
      const r = await client.getProcessedEmailAttachmentSignedUrl(selected.id, index, 300);
      if (r.signedUrl) {
        window.open(r.signedUrl, "_blank", "noopener,noreferrer");
      } else {
        setDetailError(r.errorMessage ?? r.errorCode ?? "Could not open attachment");
      }
    } catch (e) {
      setDetailError(e instanceof SupportApiError ? e.message : "Open attachment failed");
    } finally {
      setOpenBusy(null);
    }
  };

  const bulkActionFilters = useMemo(
    () => ({
      from: fromIso,
      to: toIso,
      ownerEmail: ownerEmail || undefined,
    }),
    [fromIso, toIso, ownerEmail],
  );

  const runTryAgain = async (emailIds?: string[]) => {
    const ok = window.confirm(
      emailIds?.length === 1
        ? "Try again for this email?\n\nExtracts PDFs and saves to the pet profile (same as owner Confirm)."
        : "Try again for matching emails?",
    );
    if (!ok) return;
    setActionBusy(true);
    setActionMessage(null);
    try {
      const res = await client.bulkReprocessReviewInbox({
        dryRun: false,
        defaultDocType: "vaccinations",
        includeDismissed: true,
        maxRows: emailIds?.length === 1 ? 1 : 25,
        ...bulkActionFilters,
        emailIds,
      });
      setActionMessage(res.message);
      await loadList();
      if (emailIds?.length === 1 && selected?.id === emailIds[0]) {
        await refreshDetail(emailIds[0]);
      }
    } catch (e) {
      setActionMessage(e instanceof SupportApiError ? e.message : "Try again failed");
    } finally {
      setActionBusy(false);
    }
  };

  const runClearError = async (emailIds?: string[]) => {
    const ok = window.confirm(
      "Clear error?\n\nMarks as handled in the inbox. Does not add health records — use only when records are already on the profile.",
    );
    if (!ok) return;
    setActionBusy(true);
    setActionMessage(null);
    try {
      const res = await client.bulkClearReviewInbox({
        action: "resolve",
        dryRun: false,
        ...bulkActionFilters,
        maxRows: 500,
        emailIds,
      });
      setActionMessage(res.message);
      await loadList();
      if (emailIds?.length === 1) setSelected(null);
    } catch (e) {
      setActionMessage(e instanceof SupportApiError ? e.message : "Clear error failed");
    } finally {
      setActionBusy(false);
    }
  };

  const runHideFromOwner = async (emailIds?: string[]) => {
    const ok = window.confirm(
      "Hide from owner?\n\nRemoves from Processing errors in the app. Does not delete health records already saved.",
    );
    if (!ok) return;
    setActionBusy(true);
    setActionMessage(null);
    try {
      const res = await client.bulkClearReviewInbox({
        action: "dismiss",
        dryRun: false,
        ...bulkActionFilters,
        maxRows: 500,
        emailIds,
      });
      setActionMessage(res.message);
      await loadList();
      if (emailIds?.length === 1) setSelected(null);
    } catch (e) {
      setActionMessage(e instanceof SupportApiError ? e.message : "Hide failed");
    } finally {
      setActionBusy(false);
    }
  };

  const runReleaseLock = async (emailId: string) => {
    setActionBusy(true);
    setActionMessage(null);
    try {
      const res = await client.releaseStuckLock(emailId);
      setActionMessage(res.message);
      await loadList();
      if (selected?.id === emailId) {
        setSelected(res.email ?? (await client.getProcessedEmail(emailId)));
      }
    } catch (e) {
      setActionMessage(e instanceof SupportApiError ? e.message : "Release lock failed");
    } finally {
      setActionBusy(false);
    }
  };

  const runRemoveFalseRow = async (emailId: string) => {
    const ok = window.confirm(
      "Remove this false completion row?\n\nDeletes the processed_emails record only. Message threads are not deleted.",
    );
    if (!ok) return;
    setActionBusy(true);
    setActionMessage(null);
    try {
      const res = await client.bulkDeleteGhostSuccess({
        dryRun: false,
        ...bulkActionFilters,
        emailIds: [emailId],
        maxRows: 1,
      });
      setActionMessage(res.message);
      await loadList();
      setSelected(null);
    } catch (e) {
      setActionMessage(e instanceof SupportApiError ? e.message : "Remove row failed");
    } finally {
      setActionBusy(false);
    }
  };

  const applyPreset = (days: number) => {
    patchParams({ from: startOfUtcDayYmd(days), to: toYmd(new Date()), page: "1" });
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    tab,
    setTab,
    ownerEmail,
    q,
    page,
    dateFrom,
    dateTo,
    batchOpen,
    setBatchOpen,
    patchParams,
    list,
    totalCount,
    totalPages,
    listLoading,
    listError,
    summary,
    selected,
    detailLoading,
    detailError,
    attachments,
    attachMeta,
    attachWarning,
    openBusy,
    actionMessage,
    actionBusy,
    setActionMessage,
    loadList,
    openRow,
    openAttachment,
    runTryAgain,
    runClearError,
    runHideFromOwner,
    runReleaseLock,
    runRemoveFalseRow,
    applyPreset,
    bulkActionFilters,
    pageSize,
  };
}
