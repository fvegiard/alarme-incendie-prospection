const WebSocket = require('ws');
const http = require('http');

http.get('http://localhost:9222/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const pages = JSON.parse(data);
        const target = pages.find(p => p.url.includes('prospection-montreal'));
        if (!target) return console.log('Target tab not found');
        
        console.log('Connecting to', target.url);
        const ws = new WebSocket(target.webSocketDebuggerUrl);
        
        ws.on('open', () => {
            // Enable runtime to get console logs
            ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
            ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
            ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));
            
            // Reload the page to see startup errors
            ws.send(JSON.stringify({ id: 4, method: 'Page.reload' }));
        });
        
        ws.on('message', (msg) => {
            const data = JSON.parse(msg);
            if (data.method === 'Runtime.consoleAPICalled') {
                const type = data.params.type;
                const text = data.params.args.map(a => a.value || a.description).join(' ');
                console.log(`[CONSOLE ${type}] ${text}`);
            } else if (data.method === 'Runtime.exceptionThrown') {
                console.log(`[EXCEPTION] ${data.params.exceptionDetails.exception.description}`);
            } else if (data.method === 'Log.entryAdded') {
                console.log(`[LOG] ${data.params.entry.text}`);
            }
        });

        setTimeout(() => {
            console.log('Timeout reached. Closing.');
            ws.close();
        }, 5000);
    });
});
