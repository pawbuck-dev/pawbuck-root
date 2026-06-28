import { createSupportClient } from "@/api/supportClient";
import { InboxBatchTools } from "@/components/inbox/InboxBatchTools";
import { InboxCaseFile, RESEND_INSTRUCTIONS } from "@/components/inbox/InboxCaseFile";
import { InboxQueue } from "@/components/inbox/InboxQueue";
import { useInboxController } from "@/components/inbox/useInboxController";

type Props = {
  client: ReturnType<typeof createSupportClient>;
  presetOwnerEmail?: string;
};

export function ProcessedEmailsPanel({ client, presetOwnerEmail }: Props) {
  const inbox = useInboxController(client, presetOwnerEmail);

  const copyResend = () => {
    void navigator.clipboard.writeText(RESEND_INSTRUCTIONS).then(() => {
      inbox.setActionMessage("Re-send instructions copied to clipboard.");
    });
  };

  return (
    <>
      <div className="layout layout--support inbox-layout">
        <InboxQueue
          tab={inbox.tab}
          onTabChange={inbox.setTab}
          summary={inbox.summary}
          ownerEmail={inbox.ownerEmail}
          onOwnerEmailChange={(v) => inbox.patchParams({ owner: v || null, page: "1" })}
          q={inbox.q}
          onQChange={(v) => inbox.patchParams({ q: v || null, page: "1" })}
          dateFrom={inbox.dateFrom}
          dateTo={inbox.dateTo}
          onDateFromChange={(v) => inbox.patchParams({ from: v, page: "1" })}
          onDateToChange={(v) => inbox.patchParams({ to: v, page: "1" })}
          onPreset={inbox.applyPreset}
          onRefresh={() => void inbox.loadList()}
          onOpenBatchTools={() => inbox.setBatchOpen(true)}
          list={inbox.list}
          listLoading={inbox.listLoading}
          listError={inbox.listError}
          selectedId={inbox.selected?.id ?? null}
          onSelectRow={(row) => void inbox.openRow(row)}
          page={inbox.page}
          totalPages={inbox.totalPages}
          totalCount={inbox.totalCount}
          onPageChange={(p) => inbox.patchParams({ page: String(p) })}
          actionMessage={inbox.actionMessage}
        />
        <InboxCaseFile
          detail={inbox.selected}
          detailLoading={inbox.detailLoading}
          detailError={inbox.detailError}
          attachments={inbox.attachments}
          attachMeta={inbox.attachMeta}
          attachWarning={inbox.attachWarning}
          openBusy={inbox.openBusy}
          actionBusy={inbox.actionBusy}
          onOpenAttachment={(i) => void inbox.openAttachment(i)}
          onTryAgain={() => void inbox.runTryAgain(inbox.selected ? [inbox.selected.id] : undefined)}
          onClearError={() => void inbox.runClearError(inbox.selected ? [inbox.selected.id] : undefined)}
          onHideFromOwner={() => void inbox.runHideFromOwner(inbox.selected ? [inbox.selected.id] : undefined)}
          onReleaseLock={() => inbox.selected && void inbox.runReleaseLock(inbox.selected.id)}
          onRemoveFalseRow={() => inbox.selected && void inbox.runRemoveFalseRow(inbox.selected.id)}
          onCopyResend={copyResend}
        />
      </div>
      <InboxBatchTools
        open={inbox.batchOpen}
        onClose={() => inbox.setBatchOpen(false)}
        client={client}
        bulkActionFilters={inbox.bulkActionFilters}
        onDone={(msg) => {
          inbox.setActionMessage(msg);
          inbox.setBatchOpen(false);
          void inbox.loadList();
        }}
      />
    </>
  );
}
