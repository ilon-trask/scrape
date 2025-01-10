import * as cheerio from "cheerio"

export type Data = { email: string; name: string; };

type ErrorType = 'too many' | 'empty' | "res saving error" | "res_log saving error";

type RequestLog = {
    request: string;
} & (
        { status: 'error', type: ErrorType | 'unknown'; }
        | { status: 'ok', resultLength: number }
    )

type RequestLogInFile = RequestLog & { timestamp: string; };

export const RESULTS_FILE = `data/results.json`;
const REQUESTS_LOG_FILE = `data/requests_log.json`;

const initFile = async (filePath: string) => {
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    try {
        await Deno.stat(dir);
    } catch {
        await Deno.mkdir(dir, { recursive: true });
    }

    try {
        await Deno.stat(filePath);
    } catch {
        await Deno.writeTextFile(filePath, JSON.stringify([]));
    }
}

const appendToResults = async (results: Data[]) => {
    try {
        await initFile(RESULTS_FILE);
        const fileContent = await Deno.readTextFile(RESULTS_FILE);
        const existingData: Data[] = JSON.parse(fileContent);

        const newData = [...existingData, ...results];
        await Deno.writeTextFile(RESULTS_FILE, JSON.stringify(newData, null, 2));
    } catch (error) {
        console.error('Error saving results:', error);
        throw new Error("res saving error");
    }
}

const logRequest = async (requestLog: RequestLog) => {
    try {
        await initFile(REQUESTS_LOG_FILE);
        const fileContent = await Deno.readTextFile(REQUESTS_LOG_FILE);
        const existingLogs: RequestLogInFile[] = JSON.parse(fileContent);

        existingLogs.push({ ...requestLog, timestamp: new Date().toISOString() });
        await Deno.writeTextFile(REQUESTS_LOG_FILE, JSON.stringify(existingLogs, null, 2));
    } catch (error) {
        console.error('Error saving request log:', error);
        throw new Error("res_log saving error");
    }
}

const request = async (str: string) => {
    const req = await
        fetch("https://internet3.trincoll.edu/pTools/Directory_wp.aspx", {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "accept-language": "en-US,en;q=0.8",
                "cache-control": "max-age=0",
                "content-type": "application/x-www-form-urlencoded",
                "priority": "u=0, i",
                "sec-ch-ua": "\"Brave\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "iframe",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "sec-gpc": "1",
                "upgrade-insecure-requests": "1",
                "cookie": "ASP.NET_SessionId=v2ncdv1nxw0pq4vyixipl1fy",
                "Referer": "https://internet3.trincoll.edu/pTools/Directory_wp.aspx",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": `__EVENTTARGET=&__EVENTARGUMENT=&__VIEWSTATE=%2FwEPDwUJMzE4NTY4MDE2D2QWAgIDD2QWAgIRDxYCHgdWaXNpYmxlZ2RkkmIGxWj2RrfIOPXr3vRqFoiU4TDEQFERqv6HZ7%2F%2Fpv0%3D&__VIEWSTATEGENERATOR=6845247C&__EVENTVALIDATION=%2FwEdAAmmMYyefDzCj4FMtAbGuEaTcbPKx50kq3egClC2RlspeC2xiRVTqzGkI4MPBO6VPO3lEzO1ijM9q%2FQSZVzorA1gWWj0ciZIBshSehh2B6iuhwivHF9mc03OEeiXOsVdAx7LHM5qi2WaC%2Bu8uRejijG9E5WL%2FselN996AS2BLk%2FPTu6S23tvdLgY%2F67OcsepzKzJXkJaG2JYf8ull9J0MeoouMmRavGt5rcE8uQD3gZLug%3D%3D&txtLastname=${str}&rblSearchType=Student&txtFirstname=&txtMiddlename=&btnSubmitSearch=Search`,
            "method": "POST"
        });
    return await req.text();
}

const getData = async (html: string): Promise<Data[]> => {
    const $ = cheerio.load(html);

    if ($.text().includes('Your search returned too many matches.')) throw new Error("too many")

    const results: Data[] = [];

    $('table').each((_, element) => {
        const name = $(element).find('th:first-child').text().trim();
        const email = $(element).find('td a[href^="mailto:"]').text().trim();

        if (name && email) results.push({ name, email })
    });

    if (results.length === 0) throw new Error("empty")

    return results;
}

async function main() {
    const alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
    const toUse = alphabet.map(el => alphabet.map(e => el + e)).flat();

    while (toUse.length) {
        const reqStr = toUse.shift();
        if (!reqStr) continue;

        try {
            const html = await request(reqStr);
            const data = await getData(html);

            console.log(`Found ${data.length} results for "${reqStr}":`, data);

            const requestLog: RequestLog = {
                request: reqStr,
                status: 'ok',
                resultLength: data.length,
            };
            await appendToResults(data);
            await logRequest(requestLog);
        } catch (error: unknown) {
            if (error instanceof Error) {
                const errorMessage = error.message;

                if (errorMessage === 'too many') {
                    toUse.unshift(...alphabet.map(el => reqStr + el));
                }

                const requestLog: RequestLog = {
                    request: reqStr,
                    status: 'error',
                    type: errorMessage as ErrorType || 'unknown',
                };
                await logRequest(requestLog);
                console.error(`Error processing "${reqStr}":`, errorMessage);
            } else {
                const requestLog: RequestLog = {
                    request: reqStr,
                    status: 'error',
                    type: 'unknown',
                };
                await logRequest(requestLog);
                console.error(`Error processing "${reqStr}": An unknown error occurred`, error);
            }
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log('end')
}
main();