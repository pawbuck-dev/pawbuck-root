import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "@/layouts/AdminLayout";
import { CommandCenterPage } from "@/pages/CommandCenterPage";
import { AccountWorkspacePage } from "@/pages/customers/AccountWorkspacePage";
import { PetsPage } from "@/pages/customers/PetsPage";
import { UsersPage } from "@/pages/customers/UsersPage";
import { EmailOpsPage } from "@/pages/email/EmailOpsPage";
import { InboxPage } from "@/pages/email/InboxPage";
import { ProcessingHealthPage } from "@/pages/email/ProcessingHealthPage";
import { AdrPage } from "@/pages/milo/AdrPage";
import { ClassifyPage } from "@/pages/milo/ClassifyPage";
import { JournalPage } from "@/pages/milo/JournalPage";
import { DocumentSyncPage } from "@/pages/product/DocumentSyncPage";
import { GatesPage } from "@/pages/product/GatesPage";
import { VerificationPage } from "@/pages/product/VerificationPage";

export function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="home" element={<CommandCenterPage />} />
        <Route path="customers/users" element={<UsersPage />} />
        <Route path="customers/users/:userId" element={<AccountWorkspacePage />} />
        <Route path="customers/pets" element={<PetsPage />} />
        <Route path="email/inbox" element={<InboxPage />} />
        <Route path="email/health" element={<ProcessingHealthPage />} />
        <Route path="email/ops" element={<EmailOpsPage />} />
        <Route path="milo/journal" element={<JournalPage />} />
        <Route path="milo/classify" element={<ClassifyPage />} />
        <Route path="milo/adr" element={<AdrPage />} />
        <Route path="product/gates" element={<GatesPage />} />
        <Route path="product/verification" element={<VerificationPage />} />
        <Route path="product/document-sync" element={<DocumentSyncPage />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  );
}
