import { buildNotificationHubItems } from "@/utils/notificationHub";

describe("buildNotificationHubItems", () => {
  it("builds pending approval items", () => {
    const items = buildNotificationHubItems(
      [{ id: "a1", pet_id: "p1", petName: "Benji", sender_email: "vet@clinic.com" }],
      []
    );
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("pending_approval");
    expect(items[0].title).toBe("Email needs review");
    expect(items[0].subtitle).toContain("Benji");
    expect(items[0].route.pathname).toBe("/(home)/messages");
  });

  it("builds unread thread items", () => {
    const items = buildNotificationHubItems(
      [],
      [
        {
          id: "t1",
          pet_id: "p1",
          petName: "Benji",
          recipient_name: "Dr. Smith",
          unread_count: 2,
        },
      ]
    );
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("unread_thread");
    expect(items[0].subtitle).toContain("2 unread");
  });

  it("skips threads with zero unread", () => {
    const items = buildNotificationHubItems(
      [],
      [{ id: "t1", pet_id: "p1", unread_count: 0 }]
    );
    expect(items).toHaveLength(0);
  });
});
