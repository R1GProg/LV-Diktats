function init() {
    const normalizeBtn = document.getElementById("normalizeBtn");
    const loadBtn = document.getElementById("loadBtn");
    normalizeBtn.addEventListener("click", normalize);
    loadBtn.addEventListener("click", loadFromCSV);
}

function normalize() {
    const textarea1 = document.getElementById("entry1");
    const textarea2 = document.getElementById("entry2");

    textarea2.value = normalizeText(textarea1.value);
}

function normalizeText(input) {
    output = input.replace(/\n+/g, "\n");
    output = output.replace(/ +/g, " ");
    output = output.replace(/^ +/gm, "");
    //text2 = text1.replace(/(\n *)+/, "\n");
    return output;
}

function loadFromCSV() {
    //console.log("adssd");
    const fileName = "2021 data.csv";
    const fetchResponsePromise = fetch(fileName);
    fetchResponsePromise
    .then(
        response => response.text()
    )
    .then(
        text => {
            parseCSV(text);
        }
    )
}

function parseCSV(text) {
    // TODO
    console.log("Parse CSV file:", text.length, "characters");
    const data = [];
    const fileSize = text.length;
    let entry = [];
    let index = 0;
    let processEntry = true;
    data.push(entry);
    let safetyBrake = 100000;
    while (processEntry && safetyBrake) {
        safetyBrake--;
        let restOfText = text.substring(index);
        const quotedValue = /^"((""|[^"]*)*)"/.exec(restOfText);
        if (quotedValue) {
            // String enclosed in double quotes, where the literal quotes are escaped as [""]
            const value = quotedValue[1].replace("\"\"", "\"");
            entry.push(value);
            index += quotedValue[0].length;
        } else {
            // Plain string until the next comma, EOL of EOF
            const endOfValue = /,|\r?\n/.exec(restOfText);
            let value;
            if (endOfValue) {
                // There is a field separator
                value = restOfText.substring(0, endOfValue.index);
            } else {
                // EOF
                value = restOfText;
            }
            entry.push(restOfText);
            index += value.length;
        }
        // Expect field or line separator, or end of string
        if (index == fileSize) break;
        restOfText = text.substring(index);
        const testNewline = /^\r?\n/.exec(restOfText);
        if (testNewline) {
            entry = [];
            data.push(entry);
            index += testNewline[0].length;
            continue;
        }
        const testFieldSeparator = /^,/.test(restOfText);
        if (testFieldSeparator) {
            index += 1;
            continue;
        }
        // Error
        throw new Error(`Unexpected char at index ${index}: ${restOfText.substring(0, 7)}`);
    }
    console.log(data);
}
