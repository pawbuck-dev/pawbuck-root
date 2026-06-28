import { useNavigate, useSearchParams } from "react-router-dom";
import { PetHealthExplorer } from "@/components/PetHealthExplorer";
import { useAdminApp } from "@/context/AdminAppContext";
import type { SupportPetExplorerRow } from "@/types/support";
import { PageHeader } from "@/ui/PageHeader";

export function PetsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q")?.trim() ?? "";
  const { client } = useAdminApp();

  const openPet = async (pet: SupportPetExplorerRow) => {
    navigate(`/customers/users/${pet.userId}`, {
      state: {
        user: { id: pet.userId, email: pet.ownerEmail, createdAt: null },
        openPetId: pet.id,
      },
    });
  };

  return (
    <div className="page">
      <PageHeader title="Pets" description="Search pets and open the owner account workspace." />
      <section className="panel panel--flush">
        <PetHealthExplorer
          client={client}
          initialQuery={initialQuery}
          onOpenHealthRecords={(p) => {
            void openPet(p);
          }}
        />
      </section>
    </div>
  );
}
