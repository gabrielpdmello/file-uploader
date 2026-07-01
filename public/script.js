// document.addEventListener('DOMContentLoaded', () => {
//     setTimeout(hideModal, 6000); 
// });

function hideModal() {
    const modal = document.querySelector('.modal');
    if (modal != null && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
    }
}
