const elements = {};
const DOMFactory = {
    createElement(id, tag, options = {}, parent = document.body) {
        if (elements[id]) return elements[id];

        const elmt = document.createElement(tag);
        elmt.id = id;
        Object.entries(options).forEach(([key, value]) => {
            if (key === "style") {
                Object.entries(value).forEach(([key, value]) => {
                    elmt.style[key] = value;
                });
            } else if (key === "dataset") {
                Object.entries(value).forEach(([key, value]) => {
                    elmt.dataset[key] = value;
                });
            } else if (key in elmt) {
                elmt[key] = value;
            } else {
                elmt.setAttribute(key, value);
            }
        });
        if (document.body.contains(parent)) {
            parent.appendChild(elmt);
        } else {
            console.warn(`Parent ${parent} is not in the DOM`);
        }
        elements[id] = elmt;
        return elmt;
    },
    updateElement(id, options = {}) {
        const elmt = elements[id];
        if (!elmt) return;
        Object.entries(options).forEach(([key, value]) => {
            if (key === "style") {
                Object.entries(value).forEach(([key, value]) => {
                    elmt.style[key] = value;
                });
            } else if (key === "dataset") {
                Object.entries(value).forEach(([key, value]) => {
                    elmt.dataset[key] = value;
                });
            } else if (key in elmt) {
                elmt[key] = value;
            } else {
                elmt.setAttribute(key, value);
            }
        });
    },
    removeElement(id) {
        const elmt = elements[id];
        if (elmt) {
            elmt.remove();
            delete elements[id];
        }
    },
    getElement(id) {
        return elements[id] || null;
    },
    hasElement(id) {
        return Object.prototype.hasOwnProperty.call(elements, id);
    },
};

export default DOMFactory;
