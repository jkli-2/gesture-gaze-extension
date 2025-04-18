document.getElementById('grant').onclick = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      alert("Webcam access granted!");
    } catch (e) {
      alert("Webcam access denied.");
    }
};