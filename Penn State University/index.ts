export type Data = {
    userid: string,
    cprid: string,
    givenName: string,
    middleName: string,
    familyName: string,
    primaryAffiliation: string,
    displayName: string,
    email: string,
};
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
        fetch(`https://search-service.k8s.psu.edu/search-service/resources/people?text=${str}&size=100000`, {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-US,en;q=0.6",
                "content-type": "application/json",
                "sec-ch-ua": "\"Brave\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-site",
                "sec-gpc": "1",
                "Referer": "https://directory.psu.edu/",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": null,
            "method": "GET"
        });
    return await req.json();
}

const getData = async (reqStr: string): Promise<Data[]> => {
    const json: {
        "userid": string,
        "cprid": string,
        "givenName": string,
        "middleName": string,
        "familyName": string,
        "honorificSuffix": string,
        "preferredGivenName": string,
        "preferredMiddleName": string,
        "preferredFamilyName": string,
        "preferredHonorificSuffix": string,
        "active": boolean,
        "confHold": boolean,
        "universityEmail": string,
        "serviceAccount": boolean,
        "primaryAffiliation": string,
        "altUserids": [],
        "affiliation": string[],
        "displayName": string,
        "link": { "href": string }
    }[] = await request(reqStr);

    console.log(reqStr, json.length);

    return json.map(el => ({
        userid: el.userid,
        cprid: el.cprid,
        givenName: el.givenName,
        middleName: el.middleName,
        familyName: el.familyName,
        primaryAffiliation: el.primaryAffiliation,
        displayName: el.displayName,
        email: el.universityEmail,
    }));
}

async function main() {
    const alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
    const toUse = alphabet;

    while (toUse.length) {
        const reqStr = toUse.shift();
        if (!reqStr) continue;

        try {
            const data = await getData(reqStr);

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