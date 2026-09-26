import { InvToRcForm } from "@/components/documents/promotion/inv-to-rc-form";
import { PromotionWizardSkeleton } from "@/components/documents/promotion/promotion-wizard-skeleton";
import { QoToInvForm } from "@/components/documents/promotion/qo-to-inv-form";
import { applyDocumentDisplayStatus } from "@/lib/document-display-status";
import { canPromoteDocument } from "@/lib/document-helpers";
import { client, expectEden } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export function PromotionPage({ documentId }: { documentId: string }) {
  const { t } = useTranslation("documents");
  const navigate = useNavigate();

  const { data: doc, isLoading } = useQuery({
    queryKey: queryKeys.document(documentId),
    queryFn: async () =>
      applyDocumentDisplayStatus(
        expectEden(await client.api.documents({ id: documentId }).get()),
      ),
  });

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 lg:max-w-[40%]">
        <PromotionWizardSkeleton />
      </div>
    );
  }

  if (!doc || !canPromoteDocument(doc)) {
    return (
      <Navigate
        to="/documents/$documentId"
        params={{ documentId }}
        replace
      />
    );
  }

  const backToDetail = () =>
    navigate({ to: "/documents/$documentId", params: { documentId } });
  const goToNewDoc = (newDoc: { id: string }) =>
    navigate({
      to: "/documents/$documentId",
      params: { documentId: newDoc.id },
    });

  if (doc.type === "QO") {
    return (
      <QoToInvForm
        doc={doc}
        onCancel={backToDetail}
        onSuccess={goToNewDoc}
        title={t("promotion.convertToInvoice")}
        subtitle={t("promotion.fromNumber", { number: doc.number })}
      />
    );
  }

  return (
    <InvToRcForm
      doc={doc}
      onCancel={backToDetail}
      onSuccess={goToNewDoc}
      title={t("promotion.generateReceipt")}
      subtitle={t("promotion.fromNumber", { number: doc.number })}
    />
  );
}
