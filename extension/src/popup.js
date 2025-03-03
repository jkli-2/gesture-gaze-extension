document.addEventListener("DOMContentLoaded", ()=>{
    const videoSelect = document.querySelector('#videoSource');
    const togglePreview = document.querySelector('#togglePreview');
    const togglePointer = document.querySelector('#togglePointer');
    const pointerColor = document.querySelector('#pointerColor');
    
    chrome.storage.sync.get(["pointerState", "pointerColor", "previewState"], (result) => {
        togglePointer.checked = result.pointerState || false;
        pointerColor.value = result.pointerColor || '#ff0000';
        togglePreview.checked = result.previewState || false;
    })

    navigator.mediaDevices.enumerateDevices()
    .then(gotDevices)
    .catch(error => console.log('enumerateDevices() error: ', error));

    function gotDevices(deviceInfos) {
        for (const deviceInfo of deviceInfos) {
            if (deviceInfo.kind === 'videoinput') {
            const option = document.createElement('option');
            option.value = deviceInfo.deviceId;
            option.text = deviceInfo.label || `Camera ${videoSelect.length + 1}`;
            videoSelect.appendChild(option);
            }
        }

        videoSelect.addEventListener('change', () => {
            const selectedCameraId = videoSelect.value;
            chrome.runtime.sendMessage({ type: "cameraSelection", deviceId: selectedCameraId });
        });
    }


    togglePointer.addEventListener('change', () => {
        const isEnabled = togglePointer.checked;
        chrome.storage.sync.set({ pointerState: isEnabled });
        chrome.runtime.sendMessage({ action: "pointerToggleChanged", state: isEnabled });
    })
    pointerColor.addEventListener('input', () => {
        const colorVal = pointerColor.value;
        chrome.storage.sync.set({ pointerColor: colorVal });
        chrome.runtime.sendMessage({ action: "pointerColorChanged", color: colorVal });
    })
    togglePreview.addEventListener('change', () => {
        const isEnabled = togglePreview.checked;
        chrome.storage.sync.set({ previewState: isEnabled });
        chrome.runtime.sendMessage({ action: "previewToggleChanged", state: isEnabled });
    })
})