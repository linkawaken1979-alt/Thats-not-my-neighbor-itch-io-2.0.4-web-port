// merge.js - Split PCK + WASM loader for Godot Web

const splitFiles = {
    "thats-not-my-neighbor-2.0.4.pck": 12,
    "thats-not-my-neighbor-2.0.4.wasm": 2
};

const mergedFiles = {};
const ready = {};

async function loadSplitFile(filename, count) {
    console.log("Loading split file:", filename);

    let chunks = [];
    let totalSize = 0;

    for (let i = 0; i < count; i++) {
        let part = filename + ".part" + String(i).padStart(2, "0");

        console.log("Loading:", part);

        let response = await fetch(part);

        if (!response.ok) {
            throw new Error("Missing: " + part);
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

    console.log("Merged:", filename);

    return merged.buffer;
}


// Start loading
for (const file in splitFiles) {
    ready[file] = loadSplitFile(file, splitFiles[file])
        .then(data => {
            mergedFiles[file] = data;
        });
}


// Wait for Godot requests
const oldFetch = window.fetch;

window.fetch = async function(url, options) {

    for (const file in splitFiles) {

        if (url.endsWith(file)) {

            console.log("Godot requested:", file);

            await ready[file];

            console.log("Sending merged:", file);

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

    return oldFetch(url, options);
};