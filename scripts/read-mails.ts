// scripts/read-mails.ts
// Standalone script to read emails from Zoho Mail via IMAP
// Run with: npx tsx scripts/read-mails.ts

import Imap from "imap";
import { simpleParser } from "mailparser";

const readMails = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    console.log("Starting mail read...");

    const user = process.env.ZOHO_MAIL;
    const password = process.env.ZOHO_MAIL_PASSWORD;

    if (!user || !password) {
      reject(
        new Error(
          "ZOHO_MAIL and ZOHO_MAIL_PASSWORD environment variables are required"
        )
      );
      return;
    }

    const imap = new Imap({
      user,
      password,
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

    imap.once("error", (err: Error) => {
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

// Main execution
(async () => {
  try {
    await readMails();
    console.log("✅ Emails processed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
})();
