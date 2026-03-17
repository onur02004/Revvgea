// Function to update barcode
function updateBarcode(text) {
    JsBarcode("#barcode", text, {
        format: "CODE128",
        displayValue: true,
        fontSize: 10,
        background: "transparent"
    });
}

// Map inputs to display fields
const fields = [
    { input: 'input-racer', display: 'display-racer' },
    { input: 'input-user',  display: 'display-user' },
    { input: 'input-plate', display: 'display-plate' },
    { input: 'input-car',   display: 'display-car' }
];

fields.forEach(item => {
    document.getElementById(item.input).addEventListener('input', (e) => {
        document.getElementById(item.display).innerText = e.target.value;
        // Update barcode whenever any data changes
        updateBarcode(e.target.value || "00000000");
    });
});

// Handle Photo Upload
document.getElementById('input-photo').addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = function() {
        document.getElementById('display-photo').src = reader.result;
    }
    reader.readAsDataURL(e.target.files[0]);
});

// Initial Barcode
updateBarcode("MAIN-ROADMAP-2026");