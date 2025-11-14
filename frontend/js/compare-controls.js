// Compare Button Controls

function hideCompareButton() {
    const container = document.getElementById('compareButtonContainer');
    if (container) {
        container.style.display = 'none';
        localStorage.setItem('compareButtonHidden', 'true');
        showToast('Compare button hidden. Refresh page to show again.', 'info');
    }
}

function showCompareButtonAgain() {
    localStorage.removeItem('compareButtonHidden');
    updateCompareButton();
}
