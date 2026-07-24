import { pickInviteThreadForBooking } from "@/utils/inviteThreadMatch";

describe("pickInviteThreadForBooking", () => {
  const booking = {
    service_label: "Milo invite",
    created_at: "2026-07-12T15:34:20.000Z",
  };

  it("matches invitation subject containing service label", () => {
    const id = pickInviteThreadForBooking(booking, [
      {
        id: "t1",
        subject: "Invitation: Milo invite @ Mon Jul 13, 2026 2pm - 3pm",
        created_at: "2026-05-31T15:40:35.000Z",
      },
      {
        id: "t2",
        subject: "Fwd: Milo's Document Attached",
        created_at: "2026-07-12T15:00:00.000Z",
      },
    ]);
    expect(id).toBe("t1");
  });

  it("prefers closer invitation when labels are absent", () => {
    const id = pickInviteThreadForBooking(
      { service_label: null, created_at: "2026-07-19T15:20:00.000Z" },
      [
        {
          id: "old",
          subject: "Invitation: something else",
          created_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "near",
          subject: "Invitation: Alarm notification",
          created_at: "2026-07-19T15:19:00.000Z",
        },
      ],
    );
    expect(id).toBe("near");
  });

  it("returns null when nothing resembles an invite", () => {
    expect(
      pickInviteThreadForBooking(booking, [
        { id: "t1", subject: "Hello Milo", created_at: "2026-07-12T15:34:20.000Z" },
      ]),
    ).toBeNull();
  });
});
