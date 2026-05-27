import type { Tables } from "@/database.types";

let mockGetUser: jest.Mock;
let mockRefreshSession: jest.Mock;
let mockGetSession: jest.Mock;
let mockRpc: jest.Mock;
let mockUploadPetProfilePhotoFromUri: jest.Mock;
const mockPetsFrom = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};

jest.mock("@/utils/petPhotoUpload", () => {
  mockUploadPetProfilePhotoFromUri = jest.fn();
  return {
    isLocalPhotoUri: (uri: string | null | undefined) => {
      const trimmed = uri?.trim();
      if (!trimmed) return false;
      return trimmed.startsWith("file://") || trimmed.startsWith("ph://");
    },
    uploadPetProfilePhotoFromUri: (...args: unknown[]) =>
      mockUploadPetProfilePhotoFromUri(...args),
  };
});

jest.mock("@/utils/supabase", () => {
  mockGetUser = jest.fn();
  mockRefreshSession = jest.fn().mockResolvedValue({ data: { session: null }, error: null });
  mockGetSession = jest.fn().mockResolvedValue({
    data: { session: { access_token: "t" } },
    error: null,
  });
  mockRpc = jest.fn();
  return {
    supabase: {
      auth: {
        getUser: mockGetUser,
        refreshSession: mockRefreshSession,
        getSession: mockGetSession,
      },
      rpc: mockRpc,
      from: jest.fn((table: string) => {
        if (table === "pets") return mockPetsFrom;
        throw new Error(`unexpected table ${table}`);
      }),
    },
  };
});

import { createPet, deletePet, getPets, updatePet, validateEmailIdFormat } from "@/services/pets";

function mockPetsSelectList(result: { data: Tables<"pets">[] | null; error: Error | null }) {
  const order = jest.fn().mockResolvedValue(result);
  const isFilter = jest.fn().mockReturnValue({ order });
  const select = jest.fn().mockReturnValue({ is: isFilter });
  mockPetsFrom.select = select;
  return { select, is: isFilter, order };
}

function mockPetsUpdateChain(result: { data: Tables<"pets"> | null; error: Error | null }) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ single });
  const eq2 = jest.fn().mockReturnValue({ select });
  const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
  const update = jest.fn().mockReturnValue({ eq: eq1 });
  mockPetsFrom.update = update;
  return { update, eq1, eq2, select, single };
}

describe("pets service — auth + RLS-aligned user_id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadPetProfilePhotoFromUri.mockResolvedValue("u1/pet_Milo_pet-new/profile.jpg");
    mockRefreshSession.mockResolvedValue({ data: { session: null }, error: null });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "t" } },
      error: null,
    });
  });

  describe("getPets", () => {
    it("throws when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      await expect(getPets()).rejects.toThrow("User must be authenticated to fetch pets");
    });

    it("returns rows for authenticated user", async () => {
      const rows = [{ id: "p1" } as Tables<"pets">];
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
      mockPetsSelectList({ data: rows, error: null });
      await expect(getPets()).resolves.toEqual(rows);
      expect(mockPetsFrom.select).toHaveBeenCalledWith("*");
    });
  });

  describe("createPet", () => {
    it("throws when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      await expect(createPet({ name: "Buddy" } as never)).rejects.toThrow(
        "User must be authenticated to create a pet"
      );
    });

    it("throws when session has no access token", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: null } },
        error: null,
      });
      await expect(createPet({ name: "Buddy" } as never)).rejects.toThrow(
        "Session expired — sign in again to create a pet"
      );
    });

    it("calls insert_pet_for_current_user RPC with fields (no user_id)", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "session-user" } } });
      const returned = {
        id: "pet-new",
        user_id: "session-user",
        name: "Buddy",
      } as Tables<"pets">;
      mockRpc.mockResolvedValue({ data: returned, error: null });

      const petPayload = {
        name: "Buddy",
        animal_type: "dog",
      } as never;

      await expect(createPet(petPayload)).resolves.toEqual(returned);

      expect(mockRefreshSession).toHaveBeenCalled();
      expect(mockGetSession).toHaveBeenCalled();
      expect(mockRpc).toHaveBeenCalledWith("insert_pet_for_current_user", {
        p_fields: expect.objectContaining({
          name: "Buddy",
          animal_type: "dog",
        }),
      });
      expect(mockRpc.mock.calls[0][1].p_fields).not.toHaveProperty("user_id");
    });

    it("RPC payload omits stale user_id and client id", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "correct-owner" } } });
      const returned = { id: "p2", user_id: "correct-owner", name: "Max" } as Tables<"pets">;
      mockRpc.mockResolvedValue({ data: returned, error: null });

      await createPet({
        name: "Max",
        user_id: "someone-else-id",
        id: "client-id",
      } as never);

      const fields = mockRpc.mock.calls[0][1].p_fields as Record<string, unknown>;
      expect(fields).toEqual(expect.objectContaining({ name: "Max" }));
      expect(fields).not.toHaveProperty("user_id");
      expect(fields).not.toHaveProperty("id");
    });

    it("propagates RPC error", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
      const err = { message: 'new row violates row-level security policy for table "pets"' };
      mockRpc.mockResolvedValue({ data: null, error: err });
      await expect(createPet({ name: "X" } as never)).rejects.toEqual(err);
    });

    it("throws when RPC returns no row", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
      mockRpc.mockResolvedValue({ data: null, error: null });
      await expect(createPet({ name: "X" } as never)).rejects.toThrow(
        "No data returned from insert_pet_for_current_user"
      );
    });

    it("uploads local onboarding photo after insert and updates photo_url", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
      const created = {
        id: "pet-new",
        user_id: "u1",
        name: "Milo",
        photo_url: null,
      } as Tables<"pets">;
      const withPhoto = {
        ...created,
        photo_url: "u1/pet_Milo_pet-new/profile.jpg",
      } as Tables<"pets">;
      mockRpc.mockResolvedValue({ data: created, error: null });
      const { update } = mockPetsUpdateChain({ data: withPhoto, error: null });

      await expect(
        createPet({
          name: "Milo",
          photo_url: "file:///tmp/milo.jpg",
        } as never),
      ).resolves.toEqual(withPhoto);

      expect(mockRpc.mock.calls[0][1].p_fields).not.toHaveProperty("photo_url");
      expect(mockUploadPetProfilePhotoFromUri).toHaveBeenCalledWith(
        "file:///tmp/milo.jpg",
        "u1",
        "pet-new",
        "Milo",
      );
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          photo_url: "u1/pet_Milo_pet-new/profile.jpg",
        }),
      );
    });
  });

  describe("updatePet", () => {
    it("throws when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      await expect(updatePet("pid", { name: "N" })).rejects.toThrow(
        "User must be authenticated to update a pet"
      );
    });

    it("scopes update by pet id and session user_id", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "owner-1" } } });
      const updated = { id: "pid", user_id: "owner-1", name: "New" } as Tables<"pets">;
      const { update, eq1, eq2 } = mockPetsUpdateChain({ data: updated, error: null });

      await expect(updatePet("pid", { name: "New" })).resolves.toEqual(updated);
      expect(update).toHaveBeenCalledWith({ name: "New" });
      expect(eq1).toHaveBeenCalledWith("id", "pid");
      expect(eq2).toHaveBeenCalledWith("user_id", "owner-1");
    });
  });

  describe("validateEmailIdFormat", () => {
    it("rejects empty with Pet email required message", () => {
      expect(validateEmailIdFormat("")).toEqual({
        isValid: false,
        error: "Pet email is required",
      });
      expect(validateEmailIdFormat("   ")).toEqual({
        isValid: false,
        error: "Pet email is required",
      });
    });

    it("accepts a valid local part", () => {
      expect(validateEmailIdFormat("fluffy_pet.01")).toEqual({ isValid: true });
    });
  });

  describe("deletePet", () => {
    it("throws when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      await expect(deletePet("pid")).rejects.toThrow("User must be authenticated to delete a pet");
    });

    it("soft-deletes with user_id scope", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "owner-1" } } });
      const deleted = { id: "pid", deleted_at: "2026-01-01T00:00:00.000Z" } as Tables<"pets">;
      const { update, eq1, eq2 } = mockPetsUpdateChain({ data: deleted, error: null });

      await expect(deletePet("pid")).resolves.toEqual(deleted);
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ deleted_at: expect.any(String) })
      );
      expect(eq1).toHaveBeenCalledWith("id", "pid");
      expect(eq2).toHaveBeenCalledWith("user_id", "owner-1");
    });
  });
});
