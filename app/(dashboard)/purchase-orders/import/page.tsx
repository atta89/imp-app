"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/auth-context";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { FullPageLoader } from "@/components/layout/full-page-loader";
import { ImportWizard } from "@/components/imports/import-wizard";

export default function ImportPurchaseOrdersPage() {
  const { user, status } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";

  // Admin-only. (AuthGate already guarantees an authenticated user; the backend
  // is the real enforcer — this just keeps non-admins out of the UI.)
  React.useEffect(() => {
    if (status === "authenticated" && !isAdmin) {
      router.replace("/purchase-orders");
    }
  }, [status, isAdmin, router]);

  if (status !== "authenticated" || !isAdmin) {
    return <FullPageLoader />;
  }

  return (
    <PageContainer>
      <div className="space-y-8">
        <PageHeader
          backHref="/purchase-orders"
          backLabel="Purchase orders"
          title="Import purchase orders"
          subtitle="Bulk-create purchase orders and assets from a CSV or XLSX file."
        />
        <ImportWizard />
      </div>
    </PageContainer>
  );
}
