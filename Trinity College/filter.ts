// import { type Data } from ".";

const FILTERED_EMAILS_FILE = 'data/filtered.json';
const RESULTS_FILE = `data/results.json`;
async function filterEmails() {
    const fileContent = await Deno.readTextFile(RESULTS_FILE);
    const emails: any[] = JSON.parse(fileContent);

    const uniqueEmails = emails.filter((el, i) => !emails.slice(i + 1).some(e => e.email == el.email))
    await Deno.writeTextFile(FILTERED_EMAILS_FILE, JSON.stringify(uniqueEmails, null, 2));

    console.log(`Filtered emails saved to ${FILTERED_EMAILS_FILE}`);
}

filterEmails();