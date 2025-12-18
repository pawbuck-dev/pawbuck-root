// supabase/functions/read-mails/index.ts
import Imap from "imap";
import { simpleParser } from "mailparser";

const readMails = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    console.log("Starting mail read...");

    const imap = new Imap({
      user: Deno.env.get("ZOHO_MAIL")!,
      password: Deno.env.get("ZOHO_MAIL_PASSWORD")!,
      host: "imap.zoho.com",
      port: 993,
      tls: true,
      tlsOptions: {
        servername: "imap.zoho.com",
      },
    });

    function openInbox(cb: (err: Error | null, box: Imap.Box) => void) {
      imap.openBox("INBOX", true, cb);
    }

    imap.once("ready", () => {
      openInbox((err, box) => {
        if (err) {
          reject(err);
          return;
        }

        const start = Math.max(box.messages.total - 4, 1);
        const range = `${start}:${box.messages.total}`;

        const fetch = imap.seq.fetch(range, {
          bodies: "",
          struct: true,
        });

        fetch.on("message", (msg, seqno) => {
          console.log(`\n📩 Email #${seqno}`);

          msg.on("body", async (stream) => {
            const parsed = await simpleParser(stream);
            console.log("From:", parsed.from?.text);
            console.log("Subject:", parsed.subject);
            console.log("Date:", parsed.date);
            console.log("Text:", parsed.text?.slice(0, 300));
          });
        });

        fetch.once("end", () => {
          console.log("\n✅ Finished reading emails");
          imap.end();
        });
      });
    });

    imap.once("error", (err) => {
      console.error("IMAP Error:", err);
      reject(err);
    });

    imap.once("end", () => {
      console.log("Connection closed");
      resolve();
    });

    imap.connect();
  });
};

Deno.serve(async (req) => {
  try {
    await readMails();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Emails processed successfully",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
