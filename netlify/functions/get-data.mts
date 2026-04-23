import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import * as xlsx from "xlsx";

const SHAREPOINT_URL = "https://drelectrique-my.sharepoint.com/:x:/g/personal/fvegiard_dreelectrique_com/IQAxd9aW5N3lQ4JzP9iX7C84AW8ChuHnmy9Li2vkxXhIu8s?download=1";

export default async (req: Request, context: Context) => {
    try {
        const store = getStore("soumissions");
        let data = await store.getJSON("latest-data");
        
        if (!data || data.length === 0) {
            console.log("No blob data found, fetching directly...");
            const res = await fetch(SHAREPOINT_URL);
            if (res.ok) {
                const arrayBuffer = await res.arrayBuffer();
                const workbook = xlsx.read(arrayBuffer, { type: "buffer" });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }).slice(9);
                
                data = rows.map((r: any) => {
                    if (!r[1]) return null;
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
                
                // Save it for next time
                await store.setJSON("latest-data", data);
            } else {
                data = [];
            }
        }
        
        return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};

export const config: Config = {
    path: "/api/soumissions"
};
