class DrivingLicence extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    // Helper to update fields from outside
    updateField(id, value) {
        const element = this.shadowRoot.getElementById(id);
        if (element) {
            if (id === 'photo-slot') element.src = value;
            else if (id === 'barcode-img') {
                element.src = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(value)}&scale=2&rotate=N&includetext`;
            }
            else element.textContent = value.toUpperCase();
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host { display: block; width: 600px; height: 300px; }
            .card {
                position: relative;
                width: 600px;
                height: 300px;
                background-image: url('../demos/licenceNotFilled.png');
                background-size: cover;
                border-radius: 15px;
                overflow: hidden;
                font-family: sans-serif;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            }
            #photo-slot {
                position: absolute;
                top: 90px; left: 24px;
                width: 140px; height: 181px;
                background: #333;
                object-fit: cover;
            }
            .data-field {
                position: absolute;
                font-weight: bold;
                color: #1a2a4d;
                font-size: 16px;
            }
            #out-racer { top: 96px; left: 350px; }
            #out-user  { top: 126px; left: 350px; }
            #out-plate { top: 157px; left: 350px; }
            #out-car   { top: 188px; left: 350px; }
            #out-id   { top: 222px; left: 280px; font-size: 11px;}
            #barcode-wrapper {
                position: absolute;
                bottom: 12px; right: 25px;
                width: 280px; height: 50px;
                display: flex; justify-content: right; align-items: center;
            }
            #barcode-img { max-width: 100%; max-height: 80%; }
        </style>
        <div class="card">
            <img id="photo-slot" src="" alt="">
            <div id="out-racer" class="data-field"></div>
            <div id="out-user" class="data-field"></div>
            <div id="out-plate" class="data-field"></div>
            <div id="out-car" class="data-field"></div>
            <div id="out-id" class="data-field"></div>
            <div id="barcode-wrapper">
                <img id="barcode-img" src="https://bwipjs-api.metafloor.com/?bcid=code128&text=0000&scale=2" alt="Barcode">
            </div>
        </div>
        `;
    }
}

customElements.define('driving-licence', DrivingLicence);