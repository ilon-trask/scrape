import { RESULTS_FILE, type Data } from "./index.ts";

const FILTERED_EMAILS_FILE = 'data/filtered.json';

async function filterEmails() {
    const fileContent = await Deno.readTextFile(RESULTS_FILE);
    const emails: Data[] = JSON.parse(fileContent);

    console.log(emails.length)

    const uniqueEmailsSet = new Set<string>();
    const uniqueEmails: Data[] = [];

    emails.forEach(email => {
        if (!uniqueEmailsSet.has(email.email)) {
            uniqueEmailsSet.add(email.email);
            uniqueEmails.push(email);
        }
    });

    console.log(uniqueEmails.length)

    await Deno.writeTextFile(FILTERED_EMAILS_FILE, JSON.stringify(uniqueEmails, null, 2));

    console.log(`Filtered emails saved to ${FILTERED_EMAILS_FILE}`);
}

await filterEmails();