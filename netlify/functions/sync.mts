import type { Config } from "@netlify/functions";
import * as xlsx from "xlsx";
import { getStore } from "@netlify/blobs";

const SHAREPOINT_URL = "https://drelectrique-my.sharepoint.com/:x:/g/personal/fvegiard_dreelectrique_com/IQAxd9aW5N3lQ4JzP9iX7C84AW8ChuHnmy9Li2vkxXhIu8s?download=1";

export default async (req: Request) => {
    try {
        console.log("Fetching Excel from SharePoint...");
        const res = await fetch(SHAREPOINT_URL);
        if (!res.ok) {
            console.error("Failed to fetch Excel:", res.statusText);
            return;
        }
        
        const arrayBuffer = await res.arrayBuffer();
        const workbook = xlsx.read(arrayBuffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        const rows = data.slice(9); // Data rows start at index 9
        
        const parsedSoumissions = rows.map((r: any) => {
            if (!r[1]) return null; // Skip if no project name
            let statut = 'nc';
            const statText = String(r[17] || '').toLowerCase();
            if (statText.includes('perdue')) statut = 'perdu';
            else if (statText.includes('remportée')) statut = 'gagne';
            else if (statText.includes('déposée') || statText.includes('en cours')) statut = 'soumis';
            else if (statText.includes('refusée')) statut = 'perdu';
            
            return {
                numero: r[0] || 'ND',
                projet: r[1] || 'NC',
                client: r[4] || 'NC',
                responsable: r[13] || 'NC',
                addenda: r[14] || 'N/A',
                mo: r[15] || 'NC',
                valeur: typeof r[16] === 'number' ? r[16] : 0,
                statut: statut,
            };
        }).filter(Boolean);

        const store = getStore("soumissions");
        await store.setJSON("latest-data", parsedSoumissions);
        console.log("Successfully updated blobstorage with", parsedSoumissions.length, "records.");
        
    } catch (err) {
        console.error("Error in sync task:", err);
    }
};

export const config: Config = {
    schedule: "@hourly"
};
