// merge.js - Split PCK + WASM loader for Godot Web

const splitFiles = {
    "thats-not-my-neighbor-2.0.4.pck": 12,
    "thats-not-my-neighbor-2.0.4.wasm": 2
};

const mergedFiles = {};

async function loadSplitFile(filename, count) {
    console.log("Loading split file:", filename);

    let chunks = [];
    let totalSize = 0;

    for (let i = 0; i < count; i++) {
        let partName = filename + ".part" + String(i).padStart(2, "0");

        console.log("Loading:", partName);

        let response = await fetch(partName);

        if (!response.ok) {
            throw new Error("Missing file: " + partName);
        }

        let data = new Uint8Array(await response.arrayBuffer());

        chunks.push(data);
        totalSize += data.length;
    }

    let merged = new Uint8Array(totalSize);

    let offset = 0;

    for (let chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
    }

    console.log("Finished merging:", filename, totalSize, "bytes");

    return merged.buffer;
}


// Load all split files first
(async () => {
    for (const file in splitFiles) {
        mergedFiles[file] = await loadSplitFile(
            file,
            splitFiles[file]
        );
    }

    console.log("All split files loaded!");
})();


// Override fetch so Godot receives the merged files
const originalFetch = window.fetch;

window.fetch = async function(url, options) {

    for (const file in mergedFiles) {
        if (url.endsWith(file)) {

            console.log("Serving merged:", file);

            while (!mergedFiles[file]) {
                await new Promise(r => setTimeout(r, 50));
            }

            return new Response(
                mergedFiles[file],
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/octet-stream"
                    }
                }
            );
        }
    }

    return originalFetch(url, options);
};